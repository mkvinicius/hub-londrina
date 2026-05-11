import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "@workspace/db";
import { businessesTable, searchBoostsTable, subscriptionsTable } from "@workspace/db/schema";
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { homeSearchPositionLockKey } from "../lib/boost-locks";

// Modelo antigo de "6 vagas iguais R$149" para home_search foi substituído por
// 3 posições numeradas (ver endpoints /home-search-positions e /home-search-checkout).
// O endpoint genérico /boosts/checkout agora aceita apenas "zone".
const BoostCheckoutSchema = z.object({
  boostContext: z.enum(["zone"]),
});

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required for boosts routes");
if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY env var is required for boosts routes");

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" });

const FRONTEND_URL = process.env.FRONTEND_URL
  || (process.env.REPLIT_DEPLOYMENT ? "https://www.hublondrina.com.br" : null)
  || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://www.hublondrina.com.br");

const ZONE_PRICE_ID = process.env.STRIPE_ZONE_BOOST_PRICE_ID;

const CATEGORY_PRICE_IDS: Record<number, string | undefined> = {
  1: process.env.STRIPE_BOOST_CAT_1_PRICE_ID,
  2: process.env.STRIPE_BOOST_CAT_2_PRICE_ID,
  3: process.env.STRIPE_BOOST_CAT_3_PRICE_ID,
  4: process.env.STRIPE_BOOST_CAT_4_PRICE_ID,
  5: process.env.STRIPE_BOOST_CAT_5_PRICE_ID,
};

const CATEGORY_PRICES_BRL: Record<number, number> = {
  1: 149,
  2: 119,
  3: 99,
  4: 79,
  5: 59,
};

// 3 posições numeradas para boost Home + Busca (mesmo modelo de categoria).
// #1 é o mais caro e único garantidor de "1º lugar" no autocomplete e em /home-featured.
const HOME_SEARCH_POSITION_PRICE_IDS: Record<number, string | undefined> = {
  1: process.env.STRIPE_HOME_SEARCH_POS_1_PRICE_ID,
  2: process.env.STRIPE_HOME_SEARCH_POS_2_PRICE_ID,
  3: process.env.STRIPE_HOME_SEARCH_POS_3_PRICE_ID,
};

const HOME_SEARCH_POSITION_PRICES_BRL: Record<number, number> = {
  1: 249,
  2: 179,
  3: 129,
};

const SLOTS_PER_CONTEXT = 6;
const ZONE_PRICE_BRL = 79;

interface LojistaPayload { businessId: number; email: string; role: string }

function lojistaAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET!) as LojistaPayload;
    if (payload.role !== "lojista") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    (req as any).lojista = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

async function countActiveSlots(boostContext: "zone" | "home_search", zone?: string | null) {
  const conditions = [
    eq(searchBoostsTable.boostContext, boostContext as any),
    eq(searchBoostsTable.status, "active"),
    or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
  ];
  if (boostContext === "zone" && zone) {
    conditions.push(eq(searchBoostsTable.zone, zone));
  }
  const rows = await db.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(...conditions));
  return rows.length;
}

router.get("/lojista/boosts/availability", lojistaAuth, async (req: Request, res: Response) => {
  const lojista = (req as any).lojista as LojistaPayload;

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const planType = biz.planType || "free";
  const bizZone = biz.zone || null;

  const [zoneOccupied, homeOccupied] = await Promise.all([
    bizZone ? countActiveSlots("zone", bizZone) : Promise.resolve(0),
    countActiveSlots("home_search"),
  ]);

  const currentBoosts = await db.select({
    id: searchBoostsTable.id,
    boostContext: searchBoostsTable.boostContext,
    zone: searchBoostsTable.zone,
    status: searchBoostsTable.status,
    expiresAt: searchBoostsTable.expiresAt,
  })
    .from(searchBoostsTable)
    .where(and(
      eq(searchBoostsTable.businessId, lojista.businessId),
      or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
    ));

  const zoneBoost = currentBoosts.find(b => b.boostContext === "zone");
  const homeBoost = currentBoosts.find(b => b.boostContext === "home_search");

  res.json({
    plan: planType,
    zone: bizZone,
    zoneAvailability: {
      total: SLOTS_PER_CONTEXT,
      available: Math.max(0, SLOTS_PER_CONTEXT - zoneOccupied),
      price: ZONE_PRICE_BRL,
      eligible: planType === "destaque" || planType === "premium",
      requiredPlan: "destaque",
      currentBoost: zoneBoost ? {
        status: zoneBoost.status,
        expiresAt: zoneBoost.expiresAt,
      } : null,
    },
    homeSearchAvailability: {
      total: SLOTS_PER_CONTEXT,
      available: Math.max(0, SLOTS_PER_CONTEXT - homeOccupied),
      price: HOME_PRICE_BRL,
      eligible: planType === "premium",
      requiredPlan: "premium",
      currentBoost: homeBoost ? {
        status: homeBoost.status,
        expiresAt: homeBoost.expiresAt,
      } : null,
    },
    currentBoosts,
  });
});

router.post("/lojista/boosts/checkout", lojistaAuth, async (req: Request, res: Response) => {
  const lojista = (req as any).lojista as LojistaPayload;
  // Compat: se chamarem com home_search, devolve 410 apontando para o novo endpoint
  if ((req.body as any)?.boostContext === "home_search") {
    res.status(410).json({
      error: "Boost Home + Busca agora usa posições numeradas. Use /lojista/boosts/home-search-checkout com { position }.",
      code: "ENDPOINT_DEPRECATED",
    });
    return;
  }
  const _parsed = BoostCheckoutSchema.safeParse(req.body);
  if (!_parsed.success) {
    res.status(400).json({ error: "boostContext inválido. Use 'zone'.", code: "INVALID_BODY" });
    return;
  }
  const boostContext = "zone" as const;

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const planType = biz.planType || "free";

  if (planType !== "destaque" && planType !== "premium") {
    res.status(403).json({ error: "Disponível a partir do plano Destaque", code: "PLAN_REQUIRED", requiredPlan: "destaque" });
    return;
  }

  if (!biz.zone) {
    res.status(400).json({ error: "Negócio sem zona definida" });
    return;
  }

  const existingActive = await db.select().from(searchBoostsTable).where(and(
    eq(searchBoostsTable.businessId, lojista.businessId),
    eq(searchBoostsTable.boostContext, boostContext as any),
    or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
  ));
  if (existingActive.length > 0) {
    const ex = existingActive[0];
    res.status(400).json({
      error: ex.status === "active" ? "Você já tem um destaque ativo deste tipo" : "Você já está na fila de espera deste destaque",
      code: "BOOST_EXISTS",
    });
    return;
  }

  const priceId = ZONE_PRICE_ID;
  if (!priceId) {
    res.status(500).json({ error: "Price ID não configurado para este boost" });
    return;
  }

  const [existingSub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.businessId, lojista.businessId));
  let customerId = existingSub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: lojista.email,
      name: biz.name,
      metadata: { businessId: String(lojista.businessId) },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/lojista/boost?boost_success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/lojista/boost?boost_cancelled=1`,
    metadata: {
      businessId: String(lojista.businessId),
      boostContext,
      zone: biz.zone || "",
    },
    payment_intent_data: {
      metadata: {
        businessId: String(lojista.businessId),
        boostContext,
        zone: biz.zone || "",
      },
    },
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

// ──────────────────────────────────────────────────────────────────
// BOOST CATEGORIA — 5 posições mensais (auto-serviço, Premium-only)
// ──────────────────────────────────────────────────────────────────

router.get("/lojista/boosts/category-positions", lojistaAuth, async (req: Request, res: Response) => {
  const lojista = (req as any).lojista as LojistaPayload;

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const planType = biz.planType || "free";
  const eligible = planType === "premium";

  const occupied = await db.select({
    position: searchBoostsTable.position,
    businessId: searchBoostsTable.businessId,
    expiresAt: searchBoostsTable.expiresAt,
  })
    .from(searchBoostsTable)
    .where(and(
      eq(searchBoostsTable.boostType, "monthly"),
      eq(searchBoostsTable.boostContext, "category"),
      eq(searchBoostsTable.status, "active"),
      or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
    ));

  const positions = [1, 2, 3, 4, 5].map(pos => {
    const occ = occupied.find(o => o.position === pos);
    return {
      position: pos,
      price: CATEGORY_PRICES_BRL[pos],
      occupied: !!occ,
      mine: occ?.businessId === lojista.businessId,
      expiresAt: occ?.expiresAt || null,
    };
  });

  const myCurrent = occupied.find(o => o.businessId === lojista.businessId);

  res.json({
    plan: planType,
    eligible,
    requiredPlan: "premium",
    positions,
    currentBoost: myCurrent ? {
      position: myCurrent.position,
      expiresAt: myCurrent.expiresAt,
    } : null,
  });
});

router.post("/lojista/boosts/category-checkout", lojistaAuth, async (req: Request, res: Response) => {
  const lojista = (req as any).lojista as LojistaPayload;
  const { position } = req.body as { position?: number };

  if (!position || ![1, 2, 3, 4, 5].includes(position)) {
    res.status(400).json({ error: "Posição inválida (1 a 5)" });
    return;
  }

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const planType = biz.planType || "free";
  if (planType !== "premium") {
    res.status(403).json({ error: "Boost de categoria é exclusivo para o plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium" });
    return;
  }

  const existing = await db.select().from(searchBoostsTable).where(and(
    eq(searchBoostsTable.businessId, lojista.businessId),
    eq(searchBoostsTable.boostType, "monthly"),
    eq(searchBoostsTable.boostContext, "category"),
    eq(searchBoostsTable.status, "active"),
    or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
  ));
  if (existing.length > 0) {
    res.status(400).json({ error: "Você já tem um boost de categoria ativo", code: "BOOST_EXISTS" });
    return;
  }

  const occupied = await db.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(
    eq(searchBoostsTable.boostType, "monthly"),
    eq(searchBoostsTable.boostContext, "category"),
    eq(searchBoostsTable.position, position),
    eq(searchBoostsTable.status, "active"),
    or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
  ));
  if (occupied.length > 0) {
    res.status(409).json({ error: `Posição ${position}º já está ocupada`, code: "POSITION_TAKEN" });
    return;
  }

  const priceId = CATEGORY_PRICE_IDS[position];
  if (!priceId) {
    res.status(500).json({ error: `Price ID não configurado para posição ${position}` });
    return;
  }

  const [existingSub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.businessId, lojista.businessId));
  let customerId = existingSub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: lojista.email,
      name: biz.name,
      metadata: { businessId: String(lojista.businessId) },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/lojista/boost?cat_success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/lojista/boost?cat_cancelled=1`,
    metadata: {
      businessId: String(lojista.businessId),
      boostContext: "category",
      position: String(position),
    },
    payment_intent_data: {
      metadata: {
        businessId: String(lojista.businessId),
        boostContext: "category",
        position: String(position),
      },
    },
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

// ──────────────────────────────────────────────────────────────────────
// BOOST HOME + BUSCA — 3 posições numeradas (auto-serviço, Premium-only)
// Mesmo modelo do boost de categoria. #1 R$249, #2 R$179, #3 R$129.
// Posição #1 garante 1º lugar nos sponsored do autocomplete e em /home-featured.
// ──────────────────────────────────────────────────────────────────────

router.get("/lojista/boosts/home-search-positions", lojistaAuth, async (req: Request, res: Response) => {
  const lojista = (req as any).lojista as LojistaPayload;

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const planType = biz.planType || "free";
  const eligible = planType === "premium";

  // Busca apenas boosts com `position` definida (modelo novo). Boosts legacy
  // (position=NULL) ainda existem e aparecem no autocomplete via NULLS LAST,
  // mas não ocupam vagas numeradas — eles expiram naturalmente.
  const occupied = await db.select({
    position: searchBoostsTable.position,
    businessId: searchBoostsTable.businessId,
    expiresAt: searchBoostsTable.expiresAt,
  })
    .from(searchBoostsTable)
    .where(and(
      eq(searchBoostsTable.boostContext, "home_search"),
      eq(searchBoostsTable.status, "active"),
      or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
    ));

  const positions = [1, 2, 3].map(pos => {
    const occ = occupied.find(o => o.position === pos);
    return {
      position: pos,
      price: HOME_SEARCH_POSITION_PRICES_BRL[pos],
      occupied: !!occ,
      mine: occ?.businessId === lojista.businessId,
      expiresAt: occ?.expiresAt || null,
    };
  });

  // currentBoost considera tanto vaga numerada (position 1..3) quanto legacy (sem position).
  const myCurrent = occupied.find(o => o.businessId === lojista.businessId);

  res.json({
    plan: planType,
    eligible,
    requiredPlan: "premium",
    positions,
    currentBoost: myCurrent ? {
      position: myCurrent.position,
      expiresAt: myCurrent.expiresAt,
    } : null,
  });
});

router.post("/lojista/boosts/home-search-checkout", lojistaAuth, async (req: Request, res: Response) => {
  const lojista = (req as any).lojista as LojistaPayload;
  const { position } = req.body as { position?: number };

  if (!position || ![1, 2, 3].includes(position)) {
    res.status(400).json({ error: "Posição inválida (1 a 3)" });
    return;
  }

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, lojista.businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const planType = biz.planType || "free";
  if (planType !== "premium") {
    res.status(403).json({
      error: "Boost Home + Busca é exclusivo para o plano Premium",
      code: "PLAN_REQUIRED",
      requiredPlan: "premium",
    });
    return;
  }

  // Bloqueia comprar se já tem QUALQUER boost home_search ativo (numerado ou legacy)
  const existing = await db.select().from(searchBoostsTable).where(and(
    eq(searchBoostsTable.businessId, lojista.businessId),
    eq(searchBoostsTable.boostContext, "home_search"),
    or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
  ));
  if (existing.length > 0) {
    res.status(400).json({ error: "Você já tem um boost Home + Busca ativo", code: "BOOST_EXISTS" });
    return;
  }

  // Posição já ocupada por outro lojista?
  const occupied = await db.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(
    eq(searchBoostsTable.boostContext, "home_search"),
    eq(searchBoostsTable.position, position),
    eq(searchBoostsTable.status, "active"),
    or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
  ));
  if (occupied.length > 0) {
    res.status(409).json({ error: `Posição ${position}º já está ocupada`, code: "POSITION_TAKEN" });
    return;
  }

  const priceId = HOME_SEARCH_POSITION_PRICE_IDS[position];
  if (!priceId) {
    res.status(500).json({
      error: `Price ID não configurado para posição ${position}. Defina STRIPE_HOME_SEARCH_POS_${position}_PRICE_ID.`,
    });
    return;
  }

  const [existingSub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.businessId, lojista.businessId));
  let customerId = existingSub?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: lojista.email,
      name: biz.name,
      metadata: { businessId: String(lojista.businessId) },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/lojista/boost?hs_success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/lojista/boost?hs_cancelled=1`,
    metadata: {
      businessId: String(lojista.businessId),
      boostContext: "home_search",
      position: String(position),
    },
    payment_intent_data: {
      metadata: {
        businessId: String(lojista.businessId),
        boostContext: "home_search",
        position: String(position),
      },
    },
    locale: "pt-BR",
  });

  res.json({ url: session.url });
});

export default router;
