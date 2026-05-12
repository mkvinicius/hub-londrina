import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";
import { db } from "@workspace/db";
import { subscriptionsTable, businessesTable, businessUsersTable, searchBoostsTable, vitrineBoostsTable, productsTable } from "@workspace/db/schema";
import { enforceProductLimitForBusiness, enforcePhotoLimitForBusiness } from "../lib/enforce-product-limits";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { sendEmail, emails, sendAssinaturaCancelada } from "../services/email";
import { categoryLockKey, zoneLockKey, homeSearchLockKey, homeSearchPositionLockKey, vitrineSlotLockKey } from "../lib/boost-locks";

const router: IRouter = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;

if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY env var is required");
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required for stripe routes");

if (!STRIPE_WEBHOOK_SECRET) {
  logger.warn("[Stripe] AVISO: STRIPE_WEBHOOK_SECRET não definido. O webhook não funcionará até que seja configurado.");
} else {
  logger.info("[Stripe] STRIPE_WEBHOOK_SECRET configurado — webhook habilitado");
}

const FRONTEND_URL = process.env.FRONTEND_URL
  || (process.env.REPLIT_DEPLOYMENT ? "https://www.hublondrina.com.br" : null)
  || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://www.hublondrina.com.br");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

const PRICE_MAP: Record<string, { plan: "destaque" | "premium"; cycle: "monthly" | "annual" }> = {
  [process.env.STRIPE_BASE_PRICE_ID!]: { plan: "destaque", cycle: "monthly" },
  [process.env.STRIPE_BASE_ANNUAL_PRICE_ID!]: { plan: "destaque", cycle: "annual" },
  [process.env.STRIPE_PREMIUM_PRICE_ID!]: { plan: "premium", cycle: "monthly" },
  [process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID!]: { plan: "premium", cycle: "annual" },
};

function getLojistaFromToken(req: Request): { businessId: number; email: string } | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.role !== "lojista") return null;
    return { businessId: payload.businessId, email: payload.email };
  } catch {
    return null;
  }
}

// Sincroniza uma subscription do Stripe com o DB local (subscriptions + businesses.planType).
// Reutilizado por: webhook (checkout.session.completed, invoice.*) e endpoint sync pós-checkout.
async function syncSubscriptionFromStripe(stripeSubId: string): Promise<{ businessId: number; planType: string; status: string } | null> {
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
  const businessId = Number(stripeSub.metadata.businessId);
  if (!businessId) return null;

  const priceId = stripeSub.items.data[0]?.price.id;
  const planInfo = PRICE_MAP[priceId];
  const planType = planInfo?.plan ?? "free";

  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "cancelled",
    paused: "past_due",
  };
  const status = statusMap[stripeSub.status] ?? "cancelled";
  const isActive = status === "active" || status === "trialing";

  const s = stripeSub as any;
  const item0 = s.items?.data?.[0];
  const rawStart: unknown = s.current_period_start ?? item0?.current_period_start;
  const rawEnd: unknown   = s.current_period_end   ?? item0?.current_period_end;
  const anchor: number    = s.billing_cycle_anchor ?? Math.floor(Date.now() / 1000);
  const periodStart = new Date((typeof rawStart === "number" ? rawStart : anchor) * 1000);
  const periodEnd   = new Date((typeof rawEnd   === "number" ? rawEnd   : anchor + 30 * 24 * 60 * 60) * 1000);

  await db
    .insert(subscriptionsTable)
    .values({
      businessId,
      stripeCustomerId: String(stripeSub.customer),
      stripeSubscriptionId: stripeSub.id,
      stripePriceId: priceId,
      plan: planType,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.businessId,
      set: {
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        plan: planType,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });

  const finalPlan = isActive ? planType : "free";
  await db
    .update(businessesTable)
    .set({ planType: finalPlan })
    .where(eq(businessesTable.id, businessId));

  // Task #8 — desativa produtos excedentes ao limite do novo plano
  // (idempotente: no-op se já está dentro do limite).
  await enforceProductLimitForBusiness(businessId, finalPlan);
  // Task #12 — mesma ideia para fotos da galeria do negócio.
  await enforcePhotoLimitForBusiness(businessId, finalPlan);

  // Pagamento confirmado = autorização para publicar imediatamente.
  // O fluxo de documentação (10 dias) é para planos gratuitos; quem paga
  // não pode ficar invisível esperando aprovação manual.
  if (isActive) {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, businessId));
    if (biz && (biz.status === "pending" || !biz.isVisible)) {
      await db.update(businessesTable)
        .set({ status: "active", isVisible: true })
        .where(eq(businessesTable.id, businessId));
      // Marca documentação como aprovada para não cair na expiração de 30d do plano free
      await db.update(businessUsersTable)
        .set({ documentationStatus: "approved", documentationRemainingDays: 0 })
        .where(eq(businessUsersTable.businessId, businessId));
      logger.info(`[Stripe Sync] Negócio ${businessId} (${biz.name}) publicado após pagamento (plano=${planType})`);
    }
  }

  return { businessId, planType, status };
}

// Sincronização imediata pós-checkout, chamada pelo dashboard quando o lojista
// volta do Stripe Checkout. Não depende do webhook (caso esteja mal configurado
// no Stripe Dashboard, o plano ainda é atualizado).
router.post("/lojista/stripe/sync", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const { sessionId } = req.body as { sessionId?: string };

  try {
    let stripeSubId: string | null = null;

    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Garantir que a session pertence a este lojista
      const sessionBizId = Number(session.metadata?.businessId);
      if (sessionBizId !== lojista.businessId) {
        return res.status(403).json({ error: "Session não pertence a este lojista" });
      }
      if (session.subscription) {
        stripeSubId = String(session.subscription);
      }
    }

    // Fallback: buscar a subscription mais recente do customer (caso sessionId ausente ou sem sub)
    if (!stripeSubId) {
      const [existingSub] = await db
        .select()
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.businessId, lojista.businessId));
      if (existingSub?.stripeCustomerId) {
        const subs = await stripe.subscriptions.list({
          customer: existingSub.stripeCustomerId,
          limit: 1,
          status: "all",
        });
        if (subs.data[0]) stripeSubId = subs.data[0].id;
      }
    }

    if (!stripeSubId) {
      return res.status(404).json({ error: "Nenhuma subscription encontrada" });
    }

    const result = await syncSubscriptionFromStripe(stripeSubId);
    if (!result) {
      return res.status(400).json({ error: "Subscription sem businessId no metadata" });
    }
    if (result.businessId !== lojista.businessId) {
      return res.status(403).json({ error: "Subscription pertence a outro lojista" });
    }

    logger.info(`[Stripe Sync] Lojista ${lojista.businessId} sincronizou plano=${result.planType} status=${result.status}`);
    return res.json({ ok: true, planType: result.planType, status: result.status });
  } catch (err: any) {
    logger.error("[Stripe Sync] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao sincronizar com Stripe" });
  }
});

// ────────────────────────────────────────────────────────────────────────
// SYNC PÓS-CHECKOUT DE BOOSTS — independente do webhook.
// Mesma lógica do payment_intent.succeeded no webhook (idempotente via
// pg_advisory_xact_lock e checagens de "existingMine"). Categoria, zona,
// home_search e banner home (kind=home_banner_request).
// ────────────────────────────────────────────────────────────────────────
router.post("/lojista/boosts/sync", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) return res.status(400).json({ error: "sessionId obrigatório" });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Validação de propriedade — impede lojista A de ativar boost de lojista B
    const sessionBizId = Number(session.metadata?.businessId);
    if (sessionBizId !== lojista.businessId) {
      return res.status(403).json({ error: "Session não pertence a este lojista" });
    }

    // Pagamento precisa estar confirmado pela Stripe
    if (session.payment_status !== "paid") {
      return res.json({ ok: false, paymentStatus: session.payment_status, pending: true });
    }

    const meta = session.metadata || {};

    // Caso A: solicitação de banner Home → cria pending_review
    if (meta.kind === "home_banner_request") {
      const { homeBannersTable } = await import("@workspace/db/schema");
      const dup = await db.select({ id: homeBannersTable.id })
        .from(homeBannersTable)
        .where(eq(homeBannersTable.stripeSessionId, session.id));
      if (dup.length > 0) {
        return res.json({ ok: true, type: "home_banner", status: "pending_review", duplicate: true });
      }
      const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
      if (!biz) return res.status(404).json({ error: "Negócio não encontrado" });
      await db.insert(homeBannersTable).values({
        businessId: lojista.businessId,
        title: biz.name,
        imageUrl: biz.logoUrl || "",
        linkUrl: `/negocio/${lojista.businessId}`,
        active: false,
        status: "pending_review",
        requestedBy: "lojista",
        stripeSessionId: session.id,
      });
      logger.info(`[Boost Sync] Home banner pending_review criado para biz ${lojista.businessId}`);
      return res.json({ ok: true, type: "home_banner", status: "pending_review" });
    }

    const boostContext = meta.boostContext;

    // Caso B: boost categoria (5 posições mensais)
    if (boostContext === "category") {
      const pos = parseInt(meta.position || "0", 10);
      if (![1, 2, 3, 4, 5].includes(pos)) {
        return res.status(400).json({ error: "Posição inválida no metadata" });
      }
      const CAT_PRICES: Record<number, number> = { 1: 149, 2: 119, 3: 99, 4: 79, 5: 59 };
      const lockKey = categoryLockKey(pos);

      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

        const existingMine = await tx.select().from(searchBoostsTable).where(and(
          eq(searchBoostsTable.businessId, lojista.businessId),
          eq(searchBoostsTable.boostType, "monthly"),
          eq(searchBoostsTable.boostContext, "category"),
          or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
        ));
        if (existingMine.length > 0) return { skipped: true as const };

        const occ = await tx.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(
          eq(searchBoostsTable.boostType, "monthly"),
          eq(searchBoostsTable.boostContext, "category"),
          eq(searchBoostsTable.position, pos),
          eq(searchBoostsTable.status, "active"),
          or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
        ));

        const status: "active" | "waitlist" = occ.length === 0 ? "active" : "waitlist";
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await tx.insert(searchBoostsTable).values({
          businessId: lojista.businessId,
          boostType: "monthly",
          boostContext: "category",
          position: pos,
          monthlyBid: String(CAT_PRICES[pos]),
          status,
          durationDays: 30,
          startsAt: status === "active" ? new Date() : null,
          expiresAt: status === "active" ? expiresAt : null,
          price: String(CAT_PRICES[pos]),
        });

        return { skipped: false as const, status, expiresAt };
      });

      logger.info(`[Boost Sync] categoria pos ${pos} ${result.skipped ? "duplicate" : result.status} — biz ${lojista.businessId}`);
      return res.json({
        ok: true,
        type: "category",
        position: pos,
        status: result.skipped ? "duplicate" : result.status,
      });
    }

    // Caso C1: boost Home + Busca POR POSIÇÃO (3 vagas numeradas, modelo novo)
    if (boostContext === "home_search" && meta.position) {
      const pos = parseInt(meta.position, 10);
      if (![1, 2, 3].includes(pos)) {
        return res.status(400).json({ error: "Posição inválida no metadata (home_search)" });
      }
      const HS_PRICES: Record<number, number> = { 1: 249, 2: 179, 3: 129 };
      const lockKey = homeSearchPositionLockKey(pos);

      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

        const existingMine = await tx.select().from(searchBoostsTable).where(and(
          eq(searchBoostsTable.businessId, lojista.businessId),
          eq(searchBoostsTable.boostContext, "home_search"),
          or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
        ));
        if (existingMine.length > 0) return { skipped: true as const };

        const occ = await tx.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(
          eq(searchBoostsTable.boostContext, "home_search"),
          eq(searchBoostsTable.position, pos),
          eq(searchBoostsTable.status, "active"),
          or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
        ));

        const status: "active" | "waitlist" = occ.length === 0 ? "active" : "waitlist";
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await tx.insert(searchBoostsTable).values({
          businessId: lojista.businessId,
          boostType: "monthly",
          boostContext: "home_search",
          position: pos,
          monthlyBid: String(HS_PRICES[pos]),
          status,
          durationDays: 30,
          startsAt: status === "active" ? new Date() : null,
          expiresAt: status === "active" ? expiresAt : null,
          price: String(HS_PRICES[pos]),
        });

        return { skipped: false as const, status, expiresAt };
      });

      logger.info(`[Boost Sync] home_search pos ${pos} ${result.skipped ? "duplicate" : result.status} — biz ${lojista.businessId}`);
      return res.json({
        ok: true,
        type: "home_search",
        position: pos,
        status: result.skipped ? "duplicate" : result.status,
      });
    }

    // Caso C2: boost zona (avulso, 6 vagas) — modelo legacy de home_search também cai aqui
    // mas em prática novos pagamentos home_search sempre vêm com position (modelo novo).
    if (boostContext === "zone" || boostContext === "home_search") {
      const zone = meta.zone || "";
      const lockKey = boostContext === "zone" ? zoneLockKey(zone) : homeSearchLockKey();

      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKey})`);

        const existing = await tx.select().from(searchBoostsTable)
          .where(and(
            eq(searchBoostsTable.businessId, lojista.businessId),
            eq(searchBoostsTable.boostContext, boostContext as any),
            or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
          ));
        if (existing.length > 0) return { skipped: true as const };

        const slotConditions = [
          eq(searchBoostsTable.boostContext, boostContext as any),
          eq(searchBoostsTable.status, "active"),
          or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
        ];
        if (boostContext === "zone" && zone) slotConditions.push(eq(searchBoostsTable.zone, zone));
        const occupied = await tx.select({ id: searchBoostsTable.id })
          .from(searchBoostsTable).where(and(...slotConditions));

        const status: "active" | "waitlist" = occupied.length < 6 ? "active" : "waitlist";
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await tx.insert(searchBoostsTable).values({
          businessId: lojista.businessId,
          boostType: "avulso",
          boostContext: boostContext as any,
          zone: boostContext === "zone" ? (zone || null) : null,
          monthlyBid: "0",
          status,
          durationDays: 30,
          startsAt: status === "active" ? new Date() : null,
          expiresAt: status === "active" ? expiresAt : null,
          price: boostContext === "zone" ? "79" : "149",
        });

        return { skipped: false as const, status, expiresAt };
      });

      logger.info(`[Boost Sync] ${boostContext} ${result.skipped ? "duplicate" : result.status} — biz ${lojista.businessId}`);
      return res.json({
        ok: true,
        type: boostContext,
        status: result.skipped ? "duplicate" : result.status,
      });
    }

    return res.status(400).json({ error: "Contexto de boost desconhecido na session" });
  } catch (err: any) {
    logger.error({ err }, "[Boost Sync] Erro");
    return res.status(500).json({ error: "Erro ao sincronizar boost" });
  }
});

router.get("/stripe/config", (_req: Request, res: Response) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    prices: {
      base_monthly: process.env.STRIPE_BASE_PRICE_ID,
      base_annual: process.env.STRIPE_BASE_ANNUAL_PRICE_ID,
      premium_monthly: process.env.STRIPE_PREMIUM_PRICE_ID,
      premium_annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID,
      zone_boost: process.env.STRIPE_ZONE_BOOST_PRICE_ID,
      home_search_boost: process.env.STRIPE_HOME_SEARCH_BOOST_PRICE_ID,
      home_banner: process.env.STRIPE_HOME_BANNER_PRICE_ID,
      category_boosts: {
        1: process.env.STRIPE_BOOST_CAT_1_PRICE_ID,
        2: process.env.STRIPE_BOOST_CAT_2_PRICE_ID,
        3: process.env.STRIPE_BOOST_CAT_3_PRICE_ID,
        4: process.env.STRIPE_BOOST_CAT_4_PRICE_ID,
        5: process.env.STRIPE_BOOST_CAT_5_PRICE_ID,
      },
    },
    plans: {
      free: {
        key: "free",
        label: "Gratuito",
        monthlyBRL: 0,
        annualBRL: 0,
        monthlyDisplay: "R$0",
        annualDisplay: "R$0",
        annualTotalDisplay: "",
        annualSavings: "",
        features: [
          { label: "Perfil básico do negócio", included: true },
          { label: "1 foto na galeria", included: true },
          { label: "Link para WhatsApp", included: true },
          { label: "Aparece nas buscas locais", included: true },
          { label: "Logo e banner", included: false },
          { label: "Instagram / Website", included: false },
          { label: "Métricas de cliques", included: false },
          { label: "Vitrine de produtos", included: false },
        ],
      },
      destaque: {
        key: "destaque",
        label: "Base",
        monthlyBRL: 5990,
        annualBRL: 59880,
        monthlyDisplay: "R$59,90",
        annualDisplay: "R$49,90",
        annualTotalDisplay: "R$598,80/ano",
        annualSavings: "Economize R$120/ano",
        features: [
          { label: "Tudo do Gratuito", included: true },
          { label: "Até 10 fotos", included: true },
          { label: "Logo e banner", included: true },
          { label: "Selo Destaque", included: true },
          { label: "Instagram / Website", included: true },
          { label: "Métricas básicas", included: true },
          { label: "Prioridade na busca", included: true },
          { label: "Suporte por email", included: true },
        ],
      },
      premium: {
        key: "premium",
        label: "Premium",
        monthlyBRL: 8990,
        annualBRL: 95880,
        monthlyDisplay: "R$89,90",
        annualDisplay: "R$79,90",
        annualTotalDisplay: "R$958,80/ano",
        annualSavings: "Economize R$120/ano",
        features: [
          { label: "Tudo do plano Base", included: true },
          { label: "Vitrine de produtos", included: true },
          { label: "Vídeo de apresentação", included: true },
          { label: "Boost de categoria disponível", included: true },
          { label: "Métricas avançadas", included: true },
          { label: "Suporte prioritário via WhatsApp", included: true },
          { label: "Selo Premium", included: true },
        ],
      },
    },
    boosts: {
      category: {
        label: "Boost de Categoria",
        requiredPlan: "premium",
        positions: [
          { position: 1, priceBRL: 149 },
          { position: 2, priceBRL: 119 },
          { position: 3, priceBRL: 99 },
          { position: 4, priceBRL: 79 },
          { position: 5, priceBRL: 59 },
        ],
      },
      zone: { label: "Destaque de Zona", priceBRL: 79, durationDays: 30, requiredPlan: "destaque" },
      home_search: { label: "Destaque Home + Busca", priceBRL: 149, durationDays: 30, requiredPlan: "premium" },
      home_banner: { label: "Banner na Home", priceBRL: 299, requiredPlan: "premium" },
    },
  });
});

router.post("/stripe/checkout", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const { priceId } = req.body as { priceId: string };
  if (!priceId || !PRICE_MAP[priceId]) {
    return res.status(400).json({ error: "Price ID inválido" });
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, lojista.businessId));

  if (!business) return res.status(404).json({ error: "Negócio não encontrado" });

  const [existingSub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (existingSub && (existingSub.status === "active" || existingSub.status === "trialing")) {
    return res.status(400).json({
      error: "Você já possui uma assinatura ativa. Use o portal do cliente para fazer upgrade, downgrade ou alterar o plano.",
      code: "SUBSCRIPTION_ACTIVE",
      redirectToPortal: true,
    });
  }

  let customerId = existingSub?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: lojista.email,
      name: business.name,
      metadata: { businessId: String(lojista.businessId) },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/lojista?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/lojista/plano?cancelled=1`,
    metadata: { businessId: String(lojista.businessId) },
    subscription_data: {
      metadata: { businessId: String(lojista.businessId) },
    },
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

// Modelo C: lojista compra banner da Home → Stripe Checkout → webhook cria
// banner com status='pending_review' → admin aprova/rejeita no painel.
router.post("/lojista/home-banner/checkout", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const HOME_BANNER_PRICE_ID = process.env.STRIPE_HOME_BANNER_PRICE_ID;
  if (!HOME_BANNER_PRICE_ID) {
    return res.status(503).json({
      error: "Pagamento de banner da Home ainda não configurado. Fale com o admin.",
      code: "PRICE_NOT_CONFIGURED",
    });
  }

  const { homeBannersTable } = await import("@workspace/db/schema");

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!business) return res.status(404).json({ error: "Negócio não encontrado" });
  if (business.status !== "active" || !business.isVisible) {
    return res.status(400).json({
      error: "Seu negócio precisa estar ativo e visível para anunciar na Home.",
      code: "BUSINESS_INACTIVE",
    });
  }

  const planType = business.planType || "free";
  if (planType !== "premium") {
    return res.status(403).json({
      error: "Banner na Home é exclusivo para o plano Premium.",
      code: "PLAN_REQUIRED",
      requiredPlan: "premium",
      currentPlan: planType,
    });
  }

  // Não permite comprar se já tem banner ativo ou pending_review
  const existing = await db.select().from(homeBannersTable).where(
    and(
      eq(homeBannersTable.businessId, lojista.businessId),
      or(eq(homeBannersTable.status, "active"), eq(homeBannersTable.status, "pending_review"))!,
    )
  );
  if (existing.length > 0) {
    return res.status(400).json({
      error: existing[0].status === "active"
        ? "Você já tem um banner ativo na Home."
        : "Sua solicitação de banner está em análise pelo admin.",
      code: existing[0].status === "active" ? "ALREADY_ACTIVE" : "ALREADY_PENDING",
    });
  }

  const [existingSub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.businessId, lojista.businessId));
  let customerId = existingSub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: lojista.email,
      name: business.name,
      metadata: { businessId: String(lojista.businessId) },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: HOME_BANNER_PRICE_ID, quantity: 1 }],
    success_url: `${FRONTEND_URL}/lojista/boost?banner=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/lojista/boost?banner=cancelled`,
    metadata: { businessId: String(lojista.businessId), kind: "home_banner_request" },
    subscription_data: {
      metadata: { businessId: String(lojista.businessId), kind: "home_banner_request" },
    },
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

router.get("/lojista/home-banner/status", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const { homeBannersTable } = await import("@workspace/db/schema");
  const rows = await db.select().from(homeBannersTable)
    .where(eq(homeBannersTable.businessId, lojista.businessId))
    .orderBy(desc(homeBannersTable.createdAt))
    .limit(1);

  res.json({ banner: rows[0] ?? null });
});

router.post("/stripe/portal", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (!sub?.stripeCustomerId) {
    return res.status(404).json({ error: "Nenhuma assinatura encontrada" });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${FRONTEND_URL}/lojista/plano`,
  });

  res.json({ url: portal.url });
});

// Troca de plano direta via API (sem passar pelo portal Stripe).
// O portal por padrão não permite "switch plan" sem configuração manual no Dashboard,
// então fazemos a troca aqui: stripe.subscriptions.update com proração automática.
// Usado pelos botões "Alterar para X" no painel do lojista quando ele já tem assinatura ativa.
router.post("/stripe/change-plan", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const { priceId } = req.body as { priceId?: string };
  if (!priceId || !PRICE_MAP[priceId]) {
    return res.status(400).json({ error: "Price ID inválido" });
  }
  const targetPlan = PRICE_MAP[priceId];

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (!sub?.stripeSubscriptionId) {
    return res.status(404).json({
      error: "Você ainda não tem assinatura ativa. Use o botão 'Assinar plano'.",
      code: "NO_SUBSCRIPTION",
    });
  }
  if (sub.status !== "active" && sub.status !== "trialing") {
    return res.status(400).json({
      error: "Sua assinatura não está ativa. Resolva o pagamento pendente antes de trocar de plano.",
      code: "SUBSCRIPTION_INACTIVE",
    });
  }
  if (sub.stripePriceId === priceId) {
    return res.status(400).json({ error: "Você já está nesse plano." });
  }

  try {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
    const itemId = stripeSub.items.data[0]?.id;
    if (!itemId) {
      return res.status(500).json({ error: "Subscription sem itens no Stripe." });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { businessId: String(lojista.businessId) },
    });

    // Reflete no DB local imediatamente (sem esperar webhook).
    const result = await syncSubscriptionFromStripe(sub.stripeSubscriptionId);

    logger.info(
      `[Stripe Change Plan] Lojista ${lojista.businessId} trocou plano: ${sub.stripePriceId} -> ${priceId} (${targetPlan.plan}/${targetPlan.cycle})`
    );

    return res.json({
      ok: true,
      planType: result?.planType ?? targetPlan.plan,
      cycle: targetPlan.cycle,
    });
  } catch (err: any) {
    logger.error("[Stripe Change Plan] Erro:", err.message);
    return res.status(500).json({ error: err.message || "Erro ao trocar de plano" });
  }
});

router.get("/stripe/subscription", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (!sub) return res.json(null);

  res.json({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    stripePriceId: sub.stripePriceId,
  });
});

// B3 — Histórico de faturas do lojista (Stripe).
// Lista até 24 faturas mais recentes do customer associado à assinatura ativa.
router.get("/stripe/invoices", async (req: Request, res: Response) => {
  const lojista = getLojistaFromToken(req);
  if (!lojista) return res.status(401).json({ error: "Não autorizado" });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.businessId, lojista.businessId));

  if (!sub?.stripeCustomerId) {
    return res.json({ data: [] });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: sub.stripeCustomerId,
      limit: 24,
    });
    const data = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      created: inv.created,
      amountPaid: inv.amount_paid,
      amountDue: inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      invoicePdf: inv.invoice_pdf,
      periodStart: inv.period_start,
      periodEnd: inv.period_end,
    }));
    res.json({ data });
  } catch (err) {
    req.log?.error({ err }, "[Stripe] Falha ao listar faturas");
    res.status(502).json({ error: "Não foi possível obter faturas" });
  }
});

router.post("/stripe/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  logger.info({ hasSig: !!sig }, "[Stripe Webhook] Recebido");

  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    logger.error({ hasSecret: !!STRIPE_WEBHOOK_SECRET }, "[Stripe Webhook] Falha: signature ou secret ausente");
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
    logger.info({ type: event.type, id: event.id }, "[Stripe Webhook] Evento recebido");
  } catch (err: any) {
    logger.error({ msg: err.message }, "[Stripe Webhook] Falha na verificação da assinatura");
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  async function syncSubscription(stripeSubId: string) {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    const businessId = Number(stripeSub.metadata.businessId);
    if (!businessId) return;

    const priceId = stripeSub.items.data[0]?.price.id;
    const planInfo = PRICE_MAP[priceId];
    const planType = planInfo?.plan ?? "free";

    const statusMap: Record<string, string> = {
      active: "active",
      trialing: "trialing",
      past_due: "past_due",
      canceled: "cancelled",
      unpaid: "past_due",
      incomplete: "past_due",
      incomplete_expired: "cancelled",
      paused: "past_due",
    };
    const status = statusMap[stripeSub.status] ?? "cancelled";
    const isActive = status === "active" || status === "trialing";

    // current_period_start/end foram movidos do Subscription raiz para o item
    // na API 2025-03-31.basil. Lemos de ambos os lugares com fallback em billing_cycle_anchor.
    const s = stripeSub as any;
    const item0 = s.items?.data?.[0];
    const rawStart: unknown = s.current_period_start ?? item0?.current_period_start;
    const rawEnd: unknown   = s.current_period_end   ?? item0?.current_period_end;
    const anchor: number    = s.billing_cycle_anchor ?? Math.floor(Date.now() / 1000);
    const periodStart = new Date((typeof rawStart === "number" ? rawStart : anchor) * 1000);
    const periodEnd   = new Date((typeof rawEnd   === "number" ? rawEnd   : anchor + 30 * 24 * 60 * 60) * 1000);

    await db
      .insert(subscriptionsTable)
      .values({
        businessId,
        stripeCustomerId: String(stripeSub.customer),
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        plan: planType,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      })
      .onConflictDoUpdate({
        target: subscriptionsTable.businessId,
        set: {
          stripeSubscriptionId: stripeSub.id,
          stripePriceId: priceId,
          plan: planType,
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          updatedAt: new Date(),
        },
      });

    const finalPlan = isActive ? planType : "free";
    await db
      .update(businessesTable)
      .set({ planType: finalPlan })
      .where(eq(businessesTable.id, businessId));

    // Task #8 — se houve downgrade (premium→destaque, destaque→free, etc),
    // desativa produtos excedentes para respeitar limite do novo plano.
    await enforceProductLimitForBusiness(businessId, finalPlan);
    // Task #12 — mesma lógica para fotos da galeria.
    await enforcePhotoLimitForBusiness(businessId, finalPlan);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logger.info("[Stripe Webhook] checkout.session.completed — session:", session.id, "subscription:", session.subscription);

        // Modelo C: solicitação de banner Home pelo lojista → cria pending_review
        if (session.metadata?.kind === "home_banner_request") {
          const bizId = Number(session.metadata.businessId);
          if (Number.isFinite(bizId) && bizId > 0) {
            try {
              const { homeBannersTable } = await import("@workspace/db/schema");
              const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
              if (biz) {
                // Idempotência: ignora se já existe pendente/ativo desta sessão
                const dup = await db.select({ id: homeBannersTable.id }).from(homeBannersTable)
                  .where(eq(homeBannersTable.stripeSessionId, session.id));
                if (dup.length === 0) {
                  await db.insert(homeBannersTable).values({
                    businessId: bizId,
                    title: biz.name,
                    imageUrl: biz.logoUrl || "",
                    linkUrl: `/negocio/${bizId}`,
                    active: false,
                    status: "pending_review",
                    requestedBy: "lojista",
                    stripeSessionId: session.id,
                    stripeSubscriptionId: session.subscription ? String(session.subscription) : null,
                  });
                  logger.info(`[Stripe Webhook] Banner Home pending_review criado para biz ${bizId}`);
                }
              }
            } catch (err) {
              logger.error("[Stripe Webhook] Erro criando banner pending_review:", err);
            }
          }
          break; // não cai no fluxo de subscription de plano
        }

        if (session.subscription) {
          await syncSubscription(String(session.subscription));
          try {
            const sub = await db.query.subscriptionsTable.findFirst({
              where: eq(subscriptionsTable.stripeSubscriptionId, String(session.subscription)),
            });
            if (sub) {
              const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, sub.businessId));

              // Pagamento confirmado = publicar imediatamente (mesmo se status=active mas isVisible=false)
              if (biz && (biz.status === "pending" || !biz.isVisible)) {
                await db.update(businessesTable)
                  .set({ status: "active", isVisible: true })
                  .where(eq(businessesTable.id, sub.businessId));
                await db.update(businessUsersTable)
                  .set({ documentationStatus: "approved", documentationRemainingDays: 0 })
                  .where(eq(businessUsersTable.businessId, sub.businessId));
                logger.info(`[Stripe Webhook] Negócio ${sub.businessId} (${biz.name}) publicado após pagamento`);
                try {
                  const tpl = emails.cadastroAprovado(biz.ownerName || "Lojista", biz.name);
                  if (biz.ownerEmail) await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
                } catch (emailErr) {
                  logger.error("[Stripe Webhook] Erro enviando email de aprovação:", emailErr);
                }
              }

              if (biz?.ownerEmail) {
                const planLabel = sub.plan === "premium" ? "Premium" : "Destaque";
                const valor = sub.plan === "premium" ? "R$89,90" : "R$49,90";
                const tpl = emails.pagamentoConfirmado(biz.ownerName || "Lojista", planLabel, valor);
                await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
              }
            }
          } catch (e) {
            logger.error("[Stripe Webhook] Erro no pós-processamento checkout.session.completed:", e);
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).subscription) {
          await syncSubscription(String((invoice as any).subscription));
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string;
        if (subId) {
          await db
            .update(subscriptionsTable)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptionsTable.stripeSubscriptionId, subId));

          const sub = await db.query.subscriptionsTable.findFirst({
            where: eq(subscriptionsTable.stripeSubscriptionId, subId),
          });
          if (sub) {
            await db
              .update(businessesTable)
              .set({ planType: "free", boostedUntil: null })
              .where(eq(businessesTable.id, sub.businessId));
            // H2: ao rebaixar para free, expirar boosts ativos (boost só está
            // disponível para Premium; manter ativo seria inconsistente e daria
            // exposição grátis ao negócio rebaixado).
            await db
              .update(searchBoostsTable)
              .set({ status: "expired", expiresAt: new Date() })
              .where(
                and(
                  eq(searchBoostsTable.businessId, sub.businessId),
                  sql`${searchBoostsTable.status} != 'expired'`
                )
              );
            // Task #8 — desativar produtos excedentes (free=0).
            await enforceProductLimitForBusiness(sub.businessId, "free");
            // Task #12 — ocultar fotos excedentes da galeria.
            await enforcePhotoLimitForBusiness(sub.businessId, "free");
            logger.info(`[Stripe] Downgrade por pagamento falho: businessId ${sub.businessId} (boosts expirados)`);
            try {
              const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, sub.businessId));
              if (biz?.ownerEmail) {
                const planLabel = sub.plan === "premium" ? "Premium" : "Destaque";
                const tpl = emails.pagamentoFalhou(biz.ownerName || "Lojista", planLabel);
                await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
              }
            } catch {}
          }
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        // R11 — se for subscription de boost vitrine, apenas cancela o slot e
        // promove o próximo da waitlist. Não mexe no plano do lojista.
        // Tudo dentro de uma transação com advisory lock para evitar dupla
        // promoção quando o webhook é entregue múltiplas vezes pelo Stripe.
        if (subscription.metadata?.kind === "vitrine_boost") {
          await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${vitrineSlotLockKey()})`);

            const [vbRow] = await tx.select().from(vitrineBoostsTable)
              .where(eq(vitrineBoostsTable.stripeSubscriptionId, subscription.id));
            if (!vbRow || vbRow.status === "cancelled") return;

            const wasActive = vbRow.status === "active";
            await tx.update(vitrineBoostsTable)
              .set({ status: "cancelled", endsAt: new Date(), updatedAt: new Date() })
              .where(eq(vitrineBoostsTable.id, vbRow.id));

            if (wasActive) {
              // Reconta vagas (idempotente — outras execuções do webhook
              // podem ter já promovido alguém).
              const occupied = await tx.select({ id: vitrineBoostsTable.id })
                .from(vitrineBoostsTable)
                .where(eq(vitrineBoostsTable.status, "active"));
              if (occupied.length < 4) {
                const [next] = await tx.select().from(vitrineBoostsTable)
                  .where(eq(vitrineBoostsTable.status, "waitlist"))
                  .orderBy(vitrineBoostsTable.createdAt)
                  .limit(1);
                if (next) {
                  await tx.update(vitrineBoostsTable)
                    .set({ status: "active", startsAt: new Date(), updatedAt: new Date() })
                    .where(eq(vitrineBoostsTable.id, next.id));
                  logger.info(`[Stripe Webhook] Vitrine: promovido id=${next.id} biz=${next.businessId} da waitlist`);
                }
              }
            }
            logger.info(`[Stripe Webhook] Vitrine boost cancelado biz=${vbRow.businessId} sub=${subscription.id}`);
          });
          break;
        }

        const customerId = subscription.customer as string;
        const sub = await db.select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .limit(1);
        if (!sub[0]) break;
        await db.update(businessesTable)
          .set({ planType: "free" })
          .where(eq(businessesTable.id, sub[0].businessId));
        await db.update(subscriptionsTable)
          .set({ status: "canceled" })
          .where(eq(subscriptionsTable.id, sub[0].id));
        // Task #8 — desativar produtos excedentes (free=0).
        await enforceProductLimitForBusiness(sub[0].businessId, "free");
        // Task #12 — ocultar fotos excedentes da galeria.
        await enforcePhotoLimitForBusiness(sub[0].businessId, "free");
        const [biz] = await db.select().from(businessesTable)
          .where(eq(businessesTable.id, sub[0].businessId));
        if (biz?.ownerEmail) {
          await sendAssinaturaCancelada(biz.ownerEmail, biz.name);
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId = charge.customer as string;
        if (!customerId) break;
        const sub = await db.select()
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.stripeCustomerId, customerId))
          .limit(1);
        if (!sub[0]) break;
        await db.update(businessesTable)
          .set({ planType: "free" })
          .where(eq(businessesTable.id, sub[0].businessId));
        await db.update(subscriptionsTable)
          .set({ status: "canceled" })
          .where(eq(subscriptionsTable.id, sub[0].id));
        // Task #8 — desativar produtos excedentes (free=0).
        await enforceProductLimitForBusiness(sub[0].businessId, "free");
        // Task #12 — ocultar fotos excedentes da galeria.
        await enforcePhotoLimitForBusiness(sub[0].businessId, "free");
        const [biz] = await db.select().from(businessesTable)
          .where(eq(businessesTable.id, sub[0].businessId));
        if (biz?.ownerEmail) {
          await sendAssinaturaCancelada(biz.ownerEmail, biz.name);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const { businessId, boostContext, zone, position } = pi.metadata || {};
        if (!businessId || !boostContext) break;

        // Branch: BOOST CATEGORIA (5 posições mensais)
        if (boostContext === "category") {
          const bizIdCat = parseInt(businessId, 10);
          const pos = parseInt(position || "0", 10);
          if (!Number.isFinite(bizIdCat) || bizIdCat <= 0) break;
          if (![1, 2, 3, 4, 5].includes(pos)) break;

          const CAT_PRICES: Record<number, number> = { 1: 149, 2: 119, 3: 99, 4: 79, 5: 59 };
          const lockKeyCat = categoryLockKey(pos);

          const result = await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKeyCat})`);

            const existingMine = await tx.select().from(searchBoostsTable).where(and(
              eq(searchBoostsTable.businessId, bizIdCat),
              eq(searchBoostsTable.boostType, "monthly"),
              eq(searchBoostsTable.boostContext, "category"),
              or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
            ));
            if (existingMine.length > 0) return { skipped: true as const };

            const occ = await tx.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(
              eq(searchBoostsTable.boostType, "monthly"),
              eq(searchBoostsTable.boostContext, "category"),
              eq(searchBoostsTable.position, pos),
              eq(searchBoostsTable.status, "active"),
              or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
            ));

            const status: "active" | "waitlist" = occ.length === 0 ? "active" : "waitlist";
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await tx.insert(searchBoostsTable).values({
              businessId: bizIdCat,
              boostType: "monthly",
              boostContext: "category",
              position: pos,
              monthlyBid: String(CAT_PRICES[pos]),
              status,
              durationDays: 30,
              startsAt: status === "active" ? new Date() : null,
              expiresAt: status === "active" ? expiresAt : null,
              price: String(CAT_PRICES[pos]),
            });

            return { skipped: false as const, status, expiresAt, position: pos };
          });

          if (result.skipped) {
            logger.info(`[Stripe Webhook] Boost categoria já existe para biz ${bizIdCat}, ignorando`);
          } else {
            logger.info(`[Stripe Webhook] Boost categoria pos ${pos} ${result.status} criado para biz ${bizIdCat}`);
          }
          break;
        }

        // Branch: BOOST HOME + BUSCA POR POSIÇÃO (3 vagas numeradas, modelo novo)
        if (boostContext === "home_search" && position) {
          const bizIdHS = parseInt(businessId, 10);
          const pos = parseInt(position, 10);
          if (!Number.isFinite(bizIdHS) || bizIdHS <= 0) break;
          if (![1, 2, 3].includes(pos)) break;

          const HS_PRICES: Record<number, number> = { 1: 249, 2: 179, 3: 129 };
          const lockKeyHS = homeSearchPositionLockKey(pos);

          const result = await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKeyHS})`);

            const existingMine = await tx.select().from(searchBoostsTable).where(and(
              eq(searchBoostsTable.businessId, bizIdHS),
              eq(searchBoostsTable.boostContext, "home_search"),
              or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
            ));
            if (existingMine.length > 0) return { skipped: true as const };

            const occ = await tx.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(
              eq(searchBoostsTable.boostContext, "home_search"),
              eq(searchBoostsTable.position, pos),
              eq(searchBoostsTable.status, "active"),
              or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
            ));

            const status: "active" | "waitlist" = occ.length === 0 ? "active" : "waitlist";
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await tx.insert(searchBoostsTable).values({
              businessId: bizIdHS,
              boostType: "monthly",
              boostContext: "home_search",
              position: pos,
              monthlyBid: String(HS_PRICES[pos]),
              status,
              durationDays: 30,
              startsAt: status === "active" ? new Date() : null,
              expiresAt: status === "active" ? expiresAt : null,
              price: String(HS_PRICES[pos]),
            });

            return { skipped: false as const, status, expiresAt, position: pos };
          });

          if (result.skipped) {
            logger.info(`[Stripe Webhook] Boost home_search já existe para biz ${bizIdHS}, ignorando`);
          } else {
            logger.info(`[Stripe Webhook] Boost home_search pos ${pos} ${result.status} criado para biz ${bizIdHS}`);
          }
          break;
        }

        if (boostContext !== "zone" && boostContext !== "home_search") break;

        const bizId = parseInt(businessId, 10);
        if (!Number.isFinite(bizId) || bizId <= 0) break;

        // Aloca vaga atomicamente: lock determinístico por (contexto, zona)
        // via pg_advisory_xact_lock. Sem hashing de string — chave em namespaces.
        const lockKeyZH = boostContext === "zone"
          ? zoneLockKey(zone || "")
          : homeSearchLockKey();

        const result = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockKeyZH})`);

          // Idempotência: se já existe boost active/waitlist deste biz/contexto, ignora
          const existing = await tx.select().from(searchBoostsTable)
            .where(and(
              eq(searchBoostsTable.businessId, bizId),
              eq(searchBoostsTable.boostContext, boostContext as any),
              or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
            ));
          if (existing.length > 0) {
            return { skipped: true as const };
          }

          // Conta vagas ocupadas dentro da transação (max 6)
          const slotConditions = [
            eq(searchBoostsTable.boostContext, boostContext as any),
            eq(searchBoostsTable.status, "active"),
            or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
          ];
          if (boostContext === "zone" && zone) slotConditions.push(eq(searchBoostsTable.zone, zone));
          const occupied = await tx.select({ id: searchBoostsTable.id })
            .from(searchBoostsTable).where(and(...slotConditions));

          const status: "active" | "waitlist" = occupied.length < 6 ? "active" : "waitlist";
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          await tx.insert(searchBoostsTable).values({
            businessId: bizId,
            boostType: "avulso",
            boostContext: boostContext as any,
            zone: boostContext === "zone" ? (zone || null) : null,
            monthlyBid: "0",
            status,
            durationDays: 30,
            startsAt: status === "active" ? new Date() : null,
            expiresAt: status === "active" ? expiresAt : null,
            price: boostContext === "zone" ? "79" : "149",
          });

          return { skipped: false as const, status, expiresAt };
        });

        if (result.skipped) {
          logger.info(`[Stripe Webhook] Boost ${boostContext} já existe para biz ${bizId}, ignorando duplicata`);
          break;
        }

        logger.info(`[Stripe Webhook] Boost ${boostContext} ${result.status} criado para biz ${bizId}`);

        try {
          const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, bizId));
          if (biz?.ownerEmail) {
            const tpl = result.status === "active"
              ? emails.boostAtivado(biz.ownerName || "Lojista", boostContext, result.expiresAt)
              : emails.boostWaitlist(biz.ownerName || "Lojista", boostContext);
            await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
          }
        } catch (emailErr) {
          logger.error("[Stripe Webhook] Erro enviando email de boost:", emailErr);
        }
        break;
      }
    }
  } catch (err: any) {
    logger.error({
      err: { message: err?.message, stack: err?.stack, code: err?.code },
      eventType: event.type,
      eventId: event.id,
    }, "[Stripe Webhook] Handler error");
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  res.json({ received: true });
});

export default router;
