import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { loginLimiter } from "../middleware/rateLimiter";
import { sendEmail, emails } from "../services/email";
import { validateId, parseId } from "../middleware/validateId";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, businessClicksTable, businessUsersTable, productsTable, homeBannersTable, searchBoostsTable, subscriptionsTable, zonesTable, reviewsTable, adminActionsTable } from "@workspace/db/schema";
import { eq, ilike, sql, and, desc, gte, asc, or, ne, isNull } from "drizzle-orm";
import { logAdminAction, getReqIp, ADMIN_DEFAULT_ID } from "../lib/audit";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required for admin routes");
}
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD env var is required for admin routes");
}

const VALID_PLANS = ["free", "destaque", "premium"];

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { role?: string };
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

router.post("/admin/login", loginLimiter, (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Senha incorreta" });
    return;
  }
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token });
});

router.use("/admin", authMiddleware);

router.get("/admin/stats", async (_req: Request, res: Response) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalResult,
    planResults,
    clicksResult,
    recentResult,
    regionResults,
    categoryResults,
    lojistasResult,
    activeLojistasResult,
    productsResult,
    visibilityResult,
    topBusinesses,
    recentBusinesses,
    clicksByDay,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable),

    db.select({
      planType: businessesTable.planType,
      count: sql<number>`count(*)::int`,
    }).from(businessesTable).groupBy(businessesTable.planType),

    db.select({
      totalClicks: sql<number>`coalesce(sum(${businessesTable.clicks}), 0)::int`,
      totalWhatsappClicks: sql<number>`coalesce(sum(${businessesTable.whatsappClicks}), 0)::int`,
    }).from(businessesTable),

    db.select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(gte(businessesTable.createdAt, thirtyDaysAgo)),

    db.select({
      region: businessesTable.region,
      count: sql<number>`count(*)::int`,
    }).from(businessesTable)
      .where(sql`${businessesTable.region} is not null and ${businessesTable.region} != ''`)
      .groupBy(businessesTable.region)
      .orderBy(desc(sql`count(*)`)),

    db.select({
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      count: sql<number>`(select count(*)::int from businesses where businesses.category_slug = ${categoriesTable.slug})`,
    }).from(categoriesTable).orderBy(desc(sql`(select count(*)::int from businesses where businesses.category_slug = ${categoriesTable.slug})`)),

    db.select({ count: sql<number>`count(*)::int` }).from(businessUsersTable),

    db.select({ count: sql<number>`count(*)::int` })
      .from(businessUsersTable)
      .where(gte(businessUsersTable.lastLoginAt, thirtyDaysAgo)),

    db.select({ count: sql<number>`count(*)::int` }).from(productsTable),

    db.select({
      visible: sql<number>`count(*) filter (where ${businessesTable.isVisible} = true)::int`,
      hidden: sql<number>`count(*) filter (where ${businessesTable.isVisible} = false)::int`,
    }).from(businessesTable),

    db.select({
      id: businessesTable.id,
      name: businessesTable.name,
      region: businessesTable.region,
      planType: businessesTable.planType,
      clicks: businessesTable.clicks,
      whatsappClicks: businessesTable.whatsappClicks,
      rating: businessesTable.rating,
      categorySlug: businessesTable.categorySlug,
    }).from(businessesTable)
      .orderBy(desc(businessesTable.clicks))
      .limit(10),

    db.select({
      id: businessesTable.id,
      name: businessesTable.name,
      region: businessesTable.region,
      planType: businessesTable.planType,
      createdAt: businessesTable.createdAt,
      isVisible: businessesTable.isVisible,
      ownerEmail: businessesTable.ownerEmail,
    }).from(businessesTable)
      .orderBy(desc(businessesTable.createdAt))
      .limit(10),

    db.select({
      day: sql<string>`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`,
      type: businessClicksTable.type,
      count: sql<number>`count(*)::int`,
    }).from(businessClicksTable)
      .where(gte(businessClicksTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`, businessClicksTable.type)
      .orderBy(asc(sql`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`)),
  ]);

  const byPlan: Record<string, number> = { free: 0, destaque: 0, premium: 0 };
  for (const r of planResults) {
    byPlan[r.planType] = r.count;
  }

  const byRegion: { name: string; count: number }[] = regionResults.map(r => ({
    name: r.region,
    count: r.count,
  }));

  const byCategory: { name: string; slug: string; count: number }[] = categoryResults.map(r => ({
    name: r.name,
    slug: r.slug,
    count: r.count,
  }));

  // ---- Receita REAL (MRR) -------------------------------------------------
  // Cruza subscriptions ativas com price IDs do Stripe (env). Anual é dividido
  // por 12 para virar MRR comparável. Boosts ativos (search_boosts) são somados
  // como receita não-recorrente do mês corrente.
  const PRICE_TO_MRR: Record<string, { plan: string; cycle: "monthly" | "annual"; mrr: number }> = {};
  const addPrice = (id: string | undefined, plan: string, cycle: "monthly" | "annual", priceCents: number) => {
    if (!id) return;
    PRICE_TO_MRR[id] = {
      plan,
      cycle,
      mrr: cycle === "annual" ? priceCents / 12 : priceCents,
    };
  };
  addPrice(process.env.STRIPE_BASE_PRICE_ID, "destaque", "monthly", 59.9);
  addPrice(process.env.STRIPE_BASE_ANNUAL_PRICE_ID, "destaque", "annual", 598.8);
  addPrice(process.env.STRIPE_PREMIUM_PRICE_ID, "premium", "monthly", 89.9);
  addPrice(process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID, "premium", "annual", 958.8);

  const activeSubs = await db
    .select({
      stripePriceId: subscriptionsTable.stripePriceId,
      plan: subscriptionsTable.plan,
    })
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.status, "active"),
        or(
          isNull(subscriptionsTable.currentPeriodEnd),
          gte(subscriptionsTable.currentPeriodEnd, new Date()),
        ),
      ),
    );

  let mrrFromSubs = 0;
  const subsBreakdown: Record<string, number> = {
    destaque_monthly: 0,
    destaque_annual: 0,
    premium_monthly: 0,
    premium_annual: 0,
    unknown: 0,
  };
  for (const s of activeSubs) {
    const meta = s.stripePriceId ? PRICE_TO_MRR[s.stripePriceId] : undefined;
    if (meta) {
      mrrFromSubs += meta.mrr;
      subsBreakdown[`${meta.plan}_${meta.cycle}`]++;
    } else {
      subsBreakdown.unknown++;
    }
  }

  const activeBoosts = await db
    .select({ price: searchBoostsTable.price })
    .from(searchBoostsTable)
    .where(
      and(
        eq(searchBoostsTable.status, "active"),
        or(
          isNull(searchBoostsTable.expiresAt),
          gte(searchBoostsTable.expiresAt, new Date()),
        ),
      ),
    );
  const boostsRevenueMonth = activeBoosts.reduce(
    (acc, b) => acc + (b.price ? Number(b.price) : 0),
    0,
  );

  // Estimativa "ingênua" mantida para compatibilidade visual (preços atuais).
  const estimatedRevenue =
    Math.round(((byPlan.destaque || 0) * 59.9 + (byPlan.premium || 0) * 89.9) * 100) / 100;
  const realRevenue = Math.round((mrrFromSubs + boostsRevenueMonth) * 100) / 100;

  res.json({
    totalBusinesses: totalResult[0]?.count ?? 0,
    totalLojistas: lojistasResult[0]?.count ?? 0,
    activeLojistas: activeLojistasResult[0]?.count ?? 0,
    totalProducts: productsResult[0]?.count ?? 0,
    totalClicks: clicksResult[0]?.totalClicks ?? 0,
    totalWhatsappClicks: clicksResult[0]?.totalWhatsappClicks ?? 0,
    recentSignups: recentResult[0]?.count ?? 0,
    visibleCount: visibilityResult[0]?.visible ?? 0,
    hiddenCount: visibilityResult[0]?.hidden ?? 0,
    estimatedRevenue,
    realRevenue,
    mrrFromSubs: Math.round(mrrFromSubs * 100) / 100,
    boostsRevenueMonth: Math.round(boostsRevenueMonth * 100) / 100,
    subsBreakdown,
    byPlan,
    byRegion,
    byCategory,
    topBusinesses,
    recentBusinesses,
    clicksByDay,
  });
});

router.get("/admin/businesses", async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const region = req.query.region as string | undefined;
  const planType = req.query.planType as string | undefined;
  const isVisible = req.query.isVisible as string | undefined;

  const conditions = [];
  if (search) {
    conditions.push(ilike(businessesTable.name, `%${search}%`));
  }
  if (region) {
    conditions.push(eq(businessesTable.region, region));
  }
  if (planType) {
    conditions.push(eq(businessesTable.planType, planType as "free" | "destaque" | "premium"));
  }
  if (isVisible === "true" || isVisible === "false") {
    conditions.push(eq(businessesTable.isVisible, isVisible === "true"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(businessesTable).where(where).orderBy(desc(businessesTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(where),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0, page, limit });
});

router.get("/admin/businesses/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));
  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const [products, lojista, clicks] = await Promise.all([
    db.select().from(productsTable).where(eq(productsTable.businessId, id)).orderBy(asc(productsTable.sortOrder)),
    db.select({ id: businessUsersTable.id, email: businessUsersTable.email }).from(businessUsersTable).where(eq(businessUsersTable.businessId, id)),
    db.select({
      type: businessClicksTable.type,
      count: sql<number>`count(*)::int`,
    }).from(businessClicksTable)
      .where(eq(businessClicksTable.businessId, id))
      .groupBy(businessClicksTable.type),
  ]);

  res.json({ ...business, products, lojista: lojista[0] || null, clickBreakdown: clicks });
});

router.patch("/admin/businesses/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const updates: Record<string, unknown> = {};

  if (req.body.planType !== undefined) {
    if (!VALID_PLANS.includes(req.body.planType)) {
      res.status(400).json({ error: "planType inválido" }); return;
    }
    // H1: bloquear mudança manual de plano se houver assinatura Stripe ativa.
    // Caso contrário, admin e Stripe ficam dessincronizados (lojista cobrado por
    // plano antigo, mas com plano novo no DB; ou vice-versa). Para promoções/
    // cortesias, peça ao lojista para cancelar pelo Billing Portal antes.
    const [activeSub] = await db
      .select({ id: subscriptionsTable.id, status: subscriptionsTable.status, plan: subscriptionsTable.plan })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.businessId, id));
    if (activeSub && ["active", "trialing", "past_due"].includes(activeSub.status) && req.body.planType !== activeSub.plan) {
      res.status(409).json({
        error: `Negócio possui assinatura Stripe ${activeSub.status} no plano "${activeSub.plan}". Cancele pelo Billing Portal antes de alterar o plano manualmente.`,
        code: "SUBSCRIPTION_ACTIVE",
        currentPlan: activeSub.plan,
        subscriptionStatus: activeSub.status,
      });
      return;
    }
    updates.planType = req.body.planType;
  }
  if (req.body.region !== undefined) {
    updates.region = req.body.region;
  }
  if (req.body.isVisible !== undefined) {
    if (typeof req.body.isVisible !== "boolean") {
      res.status(400).json({ error: "isVisible deve ser boolean" }); return;
    }
    updates.isVisible = req.body.isVisible;
  }
  if (req.body.verified !== undefined) {
    if (typeof req.body.verified !== "boolean") {
      res.status(400).json({ error: "verified deve ser boolean" }); return;
    }
    updates.verified = req.body.verified;
  }
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.phone !== undefined) updates.phone = req.body.phone;
  if (req.body.whatsapp !== undefined) updates.whatsapp = req.body.whatsapp;
  if (req.body.status !== undefined) {
    if (!["pending", "active", "rejected"].includes(req.body.status)) {
      res.status(400).json({ error: "status deve ser 'pending', 'active' ou 'rejected'" }); return;
    }
    updates.status = req.body.status;
  }
  if (req.body.rejectionReason !== undefined) updates.rejectionReason = req.body.rejectionReason;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo válido para atualizar" });
    return;
  }

  const [before] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));

  const result = await db.update(businessesTable).set(updates).where(eq(businessesTable.id, id)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const updated = result[0];
  if (before && updates.status && updates.status !== before.status) {
    if (updates.status === "active" && updated.ownerEmail) {
      try {
        const tpl = emails.cadastroAprovado(updated.ownerName || "Lojista", updated.name);
        await sendEmail(updated.ownerEmail, tpl.subject, tpl.html);
      } catch {}
    }
    if (updates.status === "rejected" && updated.ownerEmail) {
      try {
        const tpl = emails.cadastroRejeitado(updated.ownerName || "Lojista", updated.name, String(updates.rejectionReason || "Não informado"));
        await sendEmail(updated.ownerEmail, tpl.subject, tpl.html);
      } catch {}
    }
  }

  // Sprint 4.2 — audit log: aprovação/rejeição/mudança de plano
  if (before && updates.status && updates.status !== before.status) {
    const action = updates.status === "active" ? "business.approve" : updates.status === "rejected" ? "business.reject" : "business.status_change";
    await logAdminAction(ADMIN_DEFAULT_ID, action, "business", id, JSON.stringify({ from: before.status, to: updates.status, reason: updates.rejectionReason }), getReqIp(req));
  }
  if (before && updates.planType && updates.planType !== before.planType) {
    await logAdminAction(ADMIN_DEFAULT_ID, "business.plan_change", "business", id, JSON.stringify({ from: before.planType, to: updates.planType }), getReqIp(req));
  }
  if (before && updates.isVisible !== undefined && updates.isVisible !== before.isVisible) {
    await logAdminAction(ADMIN_DEFAULT_ID, updates.isVisible ? "business.show" : "business.hide", "business", id, undefined, getReqIp(req));
  }

  res.json(updated);
});

router.delete("/admin/businesses/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const [before] = await db.select({ name: businessesTable.name }).from(businessesTable).where(eq(businessesTable.id, id));
  const result = await db.delete(businessesTable).where(eq(businessesTable.id, id)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }
  // Sprint 4.2 — audit log: deleção de negócio
  await logAdminAction(ADMIN_DEFAULT_ID, "business.delete", "business", id, before ? JSON.stringify({ name: before.name }) : undefined, getReqIp(req));
  res.json({ success: true });
});

router.get("/admin/lojistas", async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const rows = await db.select({
    id: businessUsersTable.id,
    email: businessUsersTable.email,
    businessId: businessUsersTable.businessId,
    businessName: businessesTable.name,
    planType: businessesTable.planType,
    region: businessesTable.region,
    isVisible: businessesTable.isVisible,
    createdAt: businessUsersTable.createdAt,
  })
    .from(businessUsersTable)
    .leftJoin(businessesTable, eq(businessUsersTable.businessId, businessesTable.id))
    .where(search ? ilike(businessUsersTable.email, `%${search}%`) : undefined)
    .orderBy(desc(businessUsersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(businessUsersTable)
    .where(search ? ilike(businessUsersTable.email, `%${search}%`) : undefined);

  res.json({ data: rows, total: countResult?.count ?? 0, page, limit });
});

router.post("/admin/lojistas/:id/reset-password", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const tempPassword = "Hub@" + Math.floor(1000 + Math.random() * 9000);
  const bcryptjs = await import("bcryptjs");
  const passwordHash = await bcryptjs.hash(tempPassword, 10);

  const result = await db.update(businessUsersTable).set({ passwordHash }).where(eq(businessUsersTable.id, id)).returning();
  if (result.length === 0) { res.status(404).json({ error: "Lojista não encontrado" }); return; }

  res.json({ tempPassword });
});

router.get("/admin/categories", async (_req: Request, res: Response) => {
  const cats = await db.select({
    id: categoriesTable.id,
    slug: categoriesTable.slug,
    name: categoriesTable.name,
    icon: categoriesTable.icon,
    color: categoriesTable.color,
    businessCount: sql<number>`(select count(*)::int from businesses where businesses.category_slug = ${categoriesTable.slug})`,
  }).from(categoriesTable);

  res.json({ data: cats });
});

router.post("/admin/categories", async (req: Request, res: Response) => {
  const { name, slug, icon, color } = req.body;
  if (!name || !slug) {
    res.status(400).json({ error: "Nome e slug são obrigatórios" });
    return;
  }
  const result = await db.insert(categoriesTable).values({ name, slug, icon: icon || "store", color: color || "orange" }).returning();
  res.json(result[0]);
});

router.patch("/admin/categories/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const allowed = ["name", "slug", "icon", "color"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo válido" });
    return;
  }

  const result = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Categoria não encontrada" });
    return;
  }
  res.json(result[0]);
});

router.delete("/admin/categories/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const cat = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (cat.length === 0) { res.status(404).json({ error: "Categoria não encontrada" }); return; }

  const countResult = await db.select({ count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .where(eq(businessesTable.categorySlug, cat[0].slug));

  if ((countResult[0]?.count ?? 0) > 0) {
    res.status(400).json({ error: "Categoria possui negócios vinculados" });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.json({ success: true });
});

const BID_TO_POSITION: Record<number, number> = { 149: 1, 119: 2, 99: 3, 79: 4, 59: 5 };
const VALID_BIDS = [149, 119, 99, 79, 59];

async function calculateBoostPositions(): Promise<void> {
  const activeMonthly = await db
    .select()
    .from(searchBoostsTable)
    .where(
      and(
        eq(searchBoostsTable.status, "active"),
        eq(searchBoostsTable.boostType, "monthly")
      )
    );

  for (const boost of activeMonthly) {
    const correctPos = BID_TO_POSITION[Number(boost.monthlyBid)] || null;
    if (boost.position !== correctPos) {
      await db
        .update(searchBoostsTable)
        .set({ position: correctPos })
        .where(eq(searchBoostsTable.id, boost.id));
    }
  }

  const occupiedBids = new Set(activeMonthly.map(b => Number(b.monthlyBid)));

  const waitlistBoosts = await db
    .select()
    .from(searchBoostsTable)
    .where(and(eq(searchBoostsTable.status, "waitlist"), eq(searchBoostsTable.boostType, "monthly")))
    .orderBy(asc(searchBoostsTable.createdAt));

  for (const wl of waitlistBoosts) {
    const wlBid = Number(wl.monthlyBid);
    if (!occupiedBids.has(wlBid)) {
      await db
        .update(searchBoostsTable)
        .set({ status: "active", position: BID_TO_POSITION[wlBid], startsAt: new Date() })
        .where(eq(searchBoostsTable.id, wl.id));
      occupiedBids.add(wlBid);
    }
  }
}

router.get("/admin/boosts", async (_req: Request, res: Response) => {
  const boosts = await db
    .select({
      id: searchBoostsTable.id,
      businessId: searchBoostsTable.businessId,
      monthlyBid: searchBoostsTable.monthlyBid,
      position: searchBoostsTable.position,
      boostType: searchBoostsTable.boostType,
      status: searchBoostsTable.status,
      startsAt: searchBoostsTable.startsAt,
      expiresAt: searchBoostsTable.expiresAt,
      createdAt: searchBoostsTable.createdAt,
      businessName: businessesTable.name,
      businessRegion: businessesTable.region,
      businessCategory: businessesTable.categorySlug,
      businessPlanType: businessesTable.planType,
    })
    .from(searchBoostsTable)
    .innerJoin(businessesTable, eq(searchBoostsTable.businessId, businessesTable.id))
    .orderBy(asc(searchBoostsTable.position), desc(searchBoostsTable.createdAt));

  const monthly = boosts
    .filter(b => b.boostType === "monthly" && b.status === "active")
    .sort((a, b) => (a.position || 99) - (b.position || 99))
    .map(b => ({
      position: b.position,
      business: { id: b.businessId, name: b.businessName, planType: b.businessPlanType, region: b.businessRegion, category: b.businessCategory },
      monthlyBid: Number(b.monthlyBid),
      status: b.status,
      expiresAt: b.expiresAt,
      id: b.id,
      startsAt: b.startsAt,
      createdAt: b.createdAt,
    }));

  const now = new Date();
  const avulso = boosts
    .filter(b => b.boostType === "avulso" && b.status === "active" && (!b.expiresAt || new Date(b.expiresAt) > now))
    .map(b => ({
      business: { id: b.businessId, name: b.businessName, planType: b.businessPlanType, region: b.businessRegion, category: b.businessCategory },
      monthlyBid: Number(b.monthlyBid),
      status: b.status,
      expiresAt: b.expiresAt,
      startsAt: b.startsAt,
      id: b.id,
      createdAt: b.createdAt,
    }));

  const waitlist = boosts
    .filter(b => b.status === "waitlist")
    .map(b => ({
      business: { id: b.businessId, name: b.businessName, planType: b.businessPlanType, region: b.businessRegion, category: b.businessCategory },
      monthlyBid: Number(b.monthlyBid),
      boostType: b.boostType,
      status: b.status,
      id: b.id,
      createdAt: b.createdAt,
    }));

  const occupiedPositions = new Set(monthly.map(m => m.position));
  const availablePositions = [1, 2, 3, 4, 5].filter(p => !occupiedPositions.has(p));

  res.json({ monthly, avulso, waitlist, availablePositions });
});

router.post("/admin/boosts", async (req: Request, res: Response) => {
  const { businessId, boostType, monthlyBid, durationDays, price } = req.body;
  if (!businessId || !boostType) {
    res.status(400).json({ error: "businessId e boostType são obrigatórios" });
    return;
  }
  const parsedBusinessId = parseId(String(businessId));
  if (!parsedBusinessId) {
    res.status(400).json({ error: "businessId inválido.", code: "INVALID_ID" });
    return;
  }
  if (!["monthly", "avulso"].includes(boostType)) {
    res.status(400).json({ error: "boostType deve ser 'monthly' ou 'avulso'" });
    return;
  }

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, parsedBusinessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }
  if (biz.planType !== "premium") {
    res.status(403).json({ error: "Impulsionamento disponível apenas para negócios com plano Premium" });
    return;
  }

  if (boostType === "monthly") {
    if (!monthlyBid || !VALID_BIDS.includes(Number(monthlyBid))) {
      res.status(400).json({ error: `monthlyBid deve ser um dos valores: ${VALID_BIDS.join(", ")}` });
      return;
    }
    const targetPosition = BID_TO_POSITION[Number(monthlyBid)];
    const occupant = await db
      .select()
      .from(searchBoostsTable)
      .where(
        and(
          eq(searchBoostsTable.position, targetPosition),
          eq(searchBoostsTable.status, "active"),
          eq(searchBoostsTable.boostType, "monthly")
        )
      );
    var assignStatus: "active" | "waitlist" = occupant.length > 0 ? "waitlist" : "active";
  }

  if (boostType === "avulso") {
    if (!durationDays || ![7, 15, 30].includes(Number(durationDays))) {
      res.status(400).json({ error: "durationDays deve ser 7, 15 ou 30" });
      return;
    }
  }

  const existing = await db
    .select()
    .from(searchBoostsTable)
    .where(
      and(
        eq(searchBoostsTable.businessId, parsedBusinessId),
        sql`${searchBoostsTable.status} != 'expired'`
      )
    );
  if (existing.length > 0) {
    res.status(400).json({ error: "Este negócio já possui um boost ativo ou em fila" });
    return;
  }

  const startsAt = new Date();
  let expiresAt: Date | null = null;
  if (boostType === "avulso" && durationDays) {
    expiresAt = new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000);
  }

  const status = boostType === "monthly" ? assignStatus! : "active";

  try {
    const [boost] = await db.insert(searchBoostsTable).values({
      businessId: parsedBusinessId,
      monthlyBid: String(boostType === "monthly" ? monthlyBid : "0"),
      position: status === "active" && boostType === "monthly" ? BID_TO_POSITION[Number(monthlyBid)] : null,
      boostType,
      status,
      durationDays: boostType === "avulso" ? Number(durationDays) : null,
      price: price != null ? String(price) : null,
      startsAt: status === "active" ? startsAt : null,
      expiresAt,
    }).returning();

    if (boostType === "monthly") {
      await calculateBoostPositions();
    }

    const [updated] = await db.select().from(searchBoostsTable).where(eq(searchBoostsTable.id, boost.id));
    res.status(201).json({ boost: updated });
  } catch (err: any) {
    if (err.message?.includes("foreign key")) {
      res.status(400).json({ error: "Negócio não encontrado" });
    } else if (err.message?.includes("unique")) {
      res.status(400).json({ error: "Este negócio já possui um boost" });
    } else {
      res.status(500).json({ error: "Erro ao criar boost" });
    }
  }
});

router.patch("/admin/boosts/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const [existing] = await db.select().from(searchBoostsTable).where(eq(searchBoostsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Boost não encontrado" }); return; }

  const { status, expiresAt } = req.body;
  const updates: Record<string, unknown> = {};

  if (status !== undefined) {
    if (!["active", "expired", "waitlist"].includes(status)) {
      res.status(400).json({ error: "status deve ser 'active', 'expired' ou 'waitlist'" });
      return;
    }
    updates.status = status;
    if (status === "expired") {
      updates.position = null;
    }
  }

  if (expiresAt !== undefined) {
    updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }

  await db.update(searchBoostsTable).set(updates).where(eq(searchBoostsTable.id, id));

  if (existing.boostType === "monthly") {
    await calculateBoostPositions();
  }

  const [updated] = await db.select().from(searchBoostsTable).where(eq(searchBoostsTable.id, id));
  res.json({ boost: updated });
});

router.delete("/admin/boosts/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const [toDelete] = await db.select().from(searchBoostsTable).where(eq(searchBoostsTable.id, id));
  if (!toDelete) { res.status(404).json({ error: "Boost não encontrado" }); return; }

  await db
    .update(searchBoostsTable)
    .set({ status: "expired", position: null })
    .where(eq(searchBoostsTable.id, id));

  if (toDelete.boostType === "monthly") {
    await calculateBoostPositions();
  }

  res.json({ success: true });
});

// ─── Boosts EXTRA: por zona e Home+Busca ────────────────────────────────────────
const VALID_ZONES = ["norte", "sul", "leste", "oeste", "centro"];
const MAX_SLOTS_PER_CONTEXT = 6;

router.get("/admin/boosts-extra", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: searchBoostsTable.id,
      businessId: searchBoostsTable.businessId,
      boostType: searchBoostsTable.boostType,
      boostContext: searchBoostsTable.boostContext,
      zone: searchBoostsTable.zone,
      status: searchBoostsTable.status,
      durationDays: searchBoostsTable.durationDays,
      price: searchBoostsTable.price,
      startsAt: searchBoostsTable.startsAt,
      expiresAt: searchBoostsTable.expiresAt,
      createdAt: searchBoostsTable.createdAt,
      businessName: businessesTable.name,
      businessRegion: businessesTable.region,
      businessCategory: businessesTable.categorySlug,
      businessPlanType: businessesTable.planType,
    })
    .from(searchBoostsTable)
    .innerJoin(businessesTable, eq(searchBoostsTable.businessId, businessesTable.id))
    .where(or(
      eq(searchBoostsTable.boostContext, "zone"),
      eq(searchBoostsTable.boostContext, "home_search"),
    ))
    .orderBy(desc(searchBoostsTable.createdAt));

  const now = new Date();
  const isLive = (b: typeof rows[number]) =>
    b.status === "active" && (!b.expiresAt || new Date(b.expiresAt) > now);

  const map = (b: typeof rows[number]) => ({
    id: b.id,
    business: { id: b.businessId, name: b.businessName, planType: b.businessPlanType, region: b.businessRegion, category: b.businessCategory },
    zone: b.zone,
    boostType: b.boostType,
    status: b.status,
    durationDays: b.durationDays,
    price: b.price ? Number(b.price) : null,
    startsAt: b.startsAt,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
  });

  const zones: Record<string, ReturnType<typeof map>[]> = { norte: [], sul: [], leste: [], oeste: [], centro: [] };
  for (const z of VALID_ZONES) {
    zones[z] = rows.filter(r => r.boostContext === "zone" && r.zone === z && isLive(r)).map(map);
  }
  const homeSearch = rows.filter(r => r.boostContext === "home_search" && isLive(r)).map(map);

  res.json({
    zones,
    homeSearch,
    maxSlots: MAX_SLOTS_PER_CONTEXT,
  });
});

router.post("/admin/boosts-extra", async (req: Request, res: Response) => {
  const { businessId, boostContext, zone, durationDays, price } = req.body;

  const parsedBusinessId = parseId(String(businessId));
  if (!parsedBusinessId) {
    res.status(400).json({ error: "businessId inválido", code: "INVALID_ID" });
    return;
  }

  if (!["zone", "home_search"].includes(boostContext)) {
    res.status(400).json({ error: "boostContext deve ser 'zone' ou 'home_search'" });
    return;
  }

  if (boostContext === "zone" && !VALID_ZONES.includes(zone)) {
    res.status(400).json({ error: `zone deve ser uma de: ${VALID_ZONES.join(", ")}` });
    return;
  }

  const days = Number(durationDays);
  if (!days || ![7, 15, 30].includes(days)) {
    res.status(400).json({ error: "durationDays deve ser 7, 15 ou 30" });
    return;
  }

  const [biz] = await db.select({ planType: businessesTable.planType, name: businessesTable.name, zone: businessesTable.zone }).from(businessesTable).where(eq(businessesTable.id, parsedBusinessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  // Regra de negócio: destaque de zona só aceita negócios da própria zona.
  if (boostContext === "zone" && biz.zone !== zone) {
    res.status(400).json({
      error: `Negócio "${biz.name}" pertence à zona "${biz.zone ?? "—"}" e não pode ocupar slot da zona "${zone}".`,
      code: "ZONE_MISMATCH",
    });
    return;
  }

  const now = new Date();
  const slotConditions = [
    eq(searchBoostsTable.boostContext, boostContext),
    eq(searchBoostsTable.status, "active"),
    or(sql`${searchBoostsTable.expiresAt} IS NULL`, sql`${searchBoostsTable.expiresAt} > ${now}`),
  ];
  if (boostContext === "zone") slotConditions.push(eq(searchBoostsTable.zone, zone));

  const activeSlots = await db.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(...slotConditions));
  if (activeSlots.length >= MAX_SLOTS_PER_CONTEXT) {
    res.status(400).json({
      error: boostContext === "zone"
        ? `Zona ${zone} já tem ${MAX_SLOTS_PER_CONTEXT} slots ocupados`
        : `Home + Busca já tem ${MAX_SLOTS_PER_CONTEXT} slots ocupados`,
      code: "SLOTS_FULL",
    });
    return;
  }

  const existing = await db.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(
    and(
      eq(searchBoostsTable.businessId, parsedBusinessId),
      eq(searchBoostsTable.boostContext, boostContext),
      eq(searchBoostsTable.status, "active"),
      or(sql`${searchBoostsTable.expiresAt} IS NULL`, sql`${searchBoostsTable.expiresAt} > ${now}`),
    )
  );
  if (existing.length > 0) {
    res.status(400).json({ error: "Este negócio já tem um boost ativo neste contexto" });
    return;
  }

  const expiresAt = new Date(Date.now() + days * 86_400_000);

  const [boost] = await db.insert(searchBoostsTable).values({
    businessId: parsedBusinessId,
    monthlyBid: "0",
    position: null,
    boostType: "avulso",
    boostContext,
    zone: boostContext === "zone" ? zone : null,
    status: "active",
    durationDays: days,
    price: price != null ? String(price) : null,
    startsAt: now,
    expiresAt,
  }).returning();

  res.status(201).json({ boost });
});

router.delete("/admin/boosts-extra/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const [existing] = await db.select().from(searchBoostsTable).where(eq(searchBoostsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Boost não encontrado" }); return; }
  if (!["zone", "home_search"].includes(existing.boostContext)) {
    res.status(400).json({ error: "Este endpoint trata apenas boosts de zona ou home+busca" });
    return;
  }
  await db.update(searchBoostsTable).set({ status: "expired" }).where(eq(searchBoostsTable.id, id));
  res.json({ success: true });
});

router.get("/admin/cadastros", async (req: Request, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  const conditions = [];
  if (statusFilter && ["pending", "active", "rejected"].includes(statusFilter)) {
    conditions.push(eq(businessesTable.status, statusFilter));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const businesses = await db.select({
    id: businessesTable.id,
    name: businessesTable.name,
    razaoSocial: businessesTable.razaoSocial,
    nomeFantasia: businessesTable.nomeFantasia,
    cnpj: businessesTable.cnpj,
    phone: businessesTable.phone,
    zone: businessesTable.zone,
    categorySlug: businessesTable.categorySlug,
    ownerName: businessesTable.ownerName,
    ownerEmail: businessesTable.ownerEmail,
    status: businessesTable.status,
    rejectionReason: businessesTable.rejectionReason,
    isVisible: businessesTable.isVisible,
    createdAt: businessesTable.createdAt,
  }).from(businessesTable).where(where).orderBy(desc(businessesTable.createdAt));

  const userRecords = await db.select({
    businessId: businessUsersTable.businessId,
    emailVerified: businessUsersTable.emailVerified,
  }).from(businessUsersTable);

  const verifiedMap = new Map(userRecords.map(u => [u.businessId, !!u.emailVerified]));
  const data = businesses.map(b => ({ ...b, emailVerified: verifiedMap.get(b.id) ?? false }));

  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .where(eq(businessesTable.status, "pending"));

  res.json({ data, pendingCount: pendingCount?.count ?? 0 });
});

router.post("/admin/businesses/:id/boost", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { days } = req.body;
  if (!days || isNaN(Number(days)) || Number(days) < 1) {
    res.status(400).json({ error: "days deve ser >= 1" });
    return;
  }
  const boostedUntil = new Date(Date.now() + Number(days) * 86_400_000);
  const [biz] = await db.update(businessesTable)
    .set({ boostedUntil })
    .where(eq(businessesTable.id, id))
    .returning({ id: businessesTable.id, name: businessesTable.name, boostedUntil: businessesTable.boostedUntil });
  if (!biz) { res.status(404).json({ error: "Negócio não encontrado" }); return; }
  // Sprint 4.2 — audit log: criação de boost
  await logAdminAction(ADMIN_DEFAULT_ID, "boost.create", "business", id, JSON.stringify({ days: Number(days), boostedUntil }), getReqIp(req));
  res.json({ success: true, business: biz });
});

router.delete("/admin/businesses/:id/boost", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await db.update(businessesTable).set({ boostedUntil: null }).where(eq(businessesTable.id, id));
  // Sprint 4.2 — audit log: remoção de boost
  await logAdminAction(ADMIN_DEFAULT_ID, "boost.delete", "business", id, undefined, getReqIp(req));
  res.json({ success: true });
});

router.patch("/admin/businesses/:id/home-featured", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { homeFeatured } = req.body;
  await db.update(businessesTable).set({ homeFeatured: Boolean(homeFeatured) }).where(eq(businessesTable.id, id));
  res.json({ success: true });
});

router.get("/admin/subscriptions", async (_req: Request, res: Response) => {
  const rawSubs = await db
    .select({
      id: subscriptionsTable.id,
      businessId: subscriptionsTable.businessId,
      stripeCustomerId: subscriptionsTable.stripeCustomerId,
      stripeSubscriptionId: subscriptionsTable.stripeSubscriptionId,
      plan: subscriptionsTable.plan,
      status: subscriptionsTable.status,
      currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptionsTable.cancelAtPeriodEnd,
      createdAt: subscriptionsTable.createdAt,
      updatedAt: subscriptionsTable.updatedAt,
      businessName: businessesTable.name,
      ownerEmail: businessesTable.ownerEmail,
      ownerName: businessesTable.ownerName,
    })
    .from(subscriptionsTable)
    .leftJoin(businessesTable, eq(subscriptionsTable.businessId, businessesTable.id))
    .orderBy(desc(subscriptionsTable.updatedAt));

  const now = Date.now();
  const subs = rawSubs.map(s => {
    if (s.status === "past_due" && s.updatedAt) {
      const elapsed = now - new Date(s.updatedAt).getTime();
      const daysUntilDowngrade = 7 - Math.floor(elapsed / 86400000);
      return { ...s, daysUntilDowngrade };
    }
    return { ...s, daysUntilDowngrade: null };
  });

  const planPrices: Record<string, number> = { destaque: 49.9, premium: 89.9 };
  const activeSubs = subs.filter(s => s.status === "active");
  const mrr = activeSubs.reduce((sum, s) => sum + (planPrices[s.plan] ?? 0), 0);

  const byStatus = {
    active: subs.filter(s => s.status === "active").length,
    past_due: subs.filter(s => s.status === "past_due").length,
    cancelled: subs.filter(s => s.status === "cancelled").length,
    trialing: subs.filter(s => s.status === "trialing").length,
  };

  res.json({ mrr, byStatus, subscriptions: subs });
});

router.patch("/admin/subscriptions/:id/extend", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, id));
  if (!sub) {
    res.status(404).json({ error: "Assinatura não encontrada" });
    return;
  }
  const [updated] = await db
    .update(subscriptionsTable)
    .set({ updatedAt: new Date() })
    .where(eq(subscriptionsTable.id, id))
    .returning();
  res.json({ success: true, updatedAt: updated.updatedAt });
});

// Modelo C: lojista compra via Stripe → status='pending_review' → admin aprova/rejeita
//           admin também pode criar direto via dropdown (status='active', requestedBy='admin')
router.get("/admin/home-banners", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: homeBannersTable.id,
      businessId: homeBannersTable.businessId,
      title: homeBannersTable.title,
      imageUrl: homeBannersTable.imageUrl,
      linkUrl: homeBannersTable.linkUrl,
      active: homeBannersTable.active,
      status: homeBannersTable.status,
      requestedBy: homeBannersTable.requestedBy,
      rejectionReason: homeBannersTable.rejectionReason,
      stripeSessionId: homeBannersTable.stripeSessionId,
      clicks: homeBannersTable.clicks,
      endsAt: homeBannersTable.endsAt,
      createdAt: homeBannersTable.createdAt,
      businessName: businessesTable.name,
      businessLogoUrl: businessesTable.logoUrl,
      businessZone: businessesTable.zone,
      businessPlanType: businessesTable.planType,
      businessIsVisible: businessesTable.isVisible,
      businessStatus: businessesTable.status,
    })
    .from(homeBannersTable)
    .leftJoin(businessesTable, eq(homeBannersTable.businessId, businessesTable.id))
    .orderBy(desc(homeBannersTable.createdAt));
  res.json({ data: rows });
});

router.post("/admin/home-banners", async (req: Request, res: Response) => {
  const { businessId, imageUrl, linkUrl, endsAt } = req.body;

  const parsedBizId = parseId(String(businessId ?? ""));
  if (!parsedBizId) {
    res.status(400).json({ error: "Selecione um negócio cadastrado.", code: "INVALID_BUSINESS" });
    return;
  }

  const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, parsedBizId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado.", code: "BUSINESS_NOT_FOUND" });
    return;
  }
  if (biz.status !== "active" || !biz.isVisible) {
    res.status(400).json({
      error: `Negócio "${biz.name}" não está ativo/visível. Não é possível promovê-lo.`,
      code: "BUSINESS_INACTIVE",
    });
    return;
  }

  const activeCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(homeBannersTable)
    .where(and(eq(homeBannersTable.active, true), eq(homeBannersTable.status, "active")));
  if ((activeCount[0]?.count ?? 0) >= 2) {
    res.status(400).json({ error: "Máximo 2 banners ativos simultâneos.", code: "SLOTS_FULL" });
    return;
  }

  const dup = await db.select({ id: homeBannersTable.id }).from(homeBannersTable).where(
    and(
      eq(homeBannersTable.businessId, parsedBizId),
      eq(homeBannersTable.active, true),
      eq(homeBannersTable.status, "active"),
    )
  );
  if (dup.length > 0) {
    res.status(400).json({ error: "Este negócio já tem um banner ativo.", code: "DUPLICATE" });
    return;
  }

  const finalImageUrl = (imageUrl && String(imageUrl).trim()) || biz.logoUrl;
  if (!finalImageUrl) {
    res.status(400).json({
      error: "Negócio não tem logo cadastrada. Informe a URL da imagem do banner.",
      code: "MISSING_IMAGE",
    });
    return;
  }

  const [banner] = await db.insert(homeBannersTable).values({
    businessId: parsedBizId,
    title: biz.name,
    imageUrl: finalImageUrl,
    linkUrl: (linkUrl && String(linkUrl).trim()) || `/negocio/${parsedBizId}`,
    active: true,
    status: "active",
    requestedBy: "admin",
    endsAt: endsAt ? new Date(endsAt) : null,
  }).returning();

  res.status(201).json({ banner });
});

router.patch("/admin/home-banners/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const { imageUrl, linkUrl, active, endsAt } = req.body;
  const updates: Record<string, unknown> = {};
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (linkUrl !== undefined) updates.linkUrl = linkUrl;
  if (active !== undefined) updates.active = Boolean(active);
  if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;

  const [banner] = await db.update(homeBannersTable).set(updates).where(eq(homeBannersTable.id, id)).returning();
  if (!banner) { res.status(404).json({ error: "Banner não encontrado" }); return; }
  res.json({ banner });
});

router.post("/admin/home-banners/:id/approve", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const [existing] = await db.select().from(homeBannersTable).where(eq(homeBannersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Banner não encontrado" }); return; }
  if (existing.status !== "pending_review") {
    res.status(400).json({ error: `Banner está com status '${existing.status}', não pode aprovar.` });
    return;
  }

  if (existing.businessId) {
    const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, existing.businessId));
    if (!biz) {
      res.status(400).json({ error: "Negócio vinculado não existe mais.", code: "BUSINESS_NOT_FOUND" });
      return;
    }
    if (biz.status !== "active" || !biz.isVisible) {
      res.status(400).json({ error: "Negócio não está ativo/visível. Não pode aprovar banner.", code: "BUSINESS_NOT_ELIGIBLE" });
      return;
    }
    const [dup] = await db.select({ id: homeBannersTable.id }).from(homeBannersTable)
      .where(and(eq(homeBannersTable.businessId, existing.businessId), eq(homeBannersTable.status, "active")));
    if (dup) {
      res.status(400).json({ error: "Este negócio já tem um banner ativo.", code: "DUPLICATE" });
      return;
    }
  }

  const banner = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(99001)`);
    const activeCount = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(homeBannersTable)
      .where(and(eq(homeBannersTable.active, true), eq(homeBannersTable.status, "active")));
    if ((activeCount[0]?.count ?? 0) >= 2) return null;
    const [updated] = await tx.update(homeBannersTable)
      .set({ status: "active", active: true, rejectionReason: null })
      .where(eq(homeBannersTable.id, id)).returning();
    return updated ?? null;
  });
  if (!banner) {
    res.status(409).json({ error: "Máximo 2 banners ativos simultâneos. Desative um antes de aprovar.", code: "SLOTS_FULL" });
    return;
  }
  // Sprint 4.2 — audit log: aprovação de banner
  await logAdminAction(ADMIN_DEFAULT_ID, "home_banner.approve", "home_banner", id, undefined, getReqIp(req));
  res.json({ banner });
});

router.post("/admin/home-banners/:id/reject", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const reason = String(req.body?.reason ?? "").slice(0, 500) || null;
  const [existing] = await db.select().from(homeBannersTable).where(eq(homeBannersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Banner não encontrado" }); return; }
  if (existing.status !== "pending_review") {
    res.status(400).json({ error: `Banner está com status '${existing.status}', não pode rejeitar.` });
    return;
  }
  const [banner] = await db.update(homeBannersTable)
    .set({ status: "rejected", active: false, rejectionReason: reason })
    .where(eq(homeBannersTable.id, id)).returning();
  // Sprint 4.2 — audit log: rejeição de banner
  await logAdminAction(ADMIN_DEFAULT_ID, "home_banner.reject", "home_banner", id, JSON.stringify({ reason }), getReqIp(req));
  res.json({ banner });
});

router.delete("/admin/home-banners/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(homeBannersTable).where(eq(homeBannersTable.id, id));
  res.json({ success: true });
});

// ─── ADMIN ZONES CRUD ────────────────────────────────────────────────────────
router.get("/admin/zones", async (_req: Request, res: Response) => {
  const rows = await db.select().from(zonesTable).orderBy(asc(zonesTable.name));
  const counts = await db
    .select({ zone: businessesTable.zone, count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .where(and(eq(businessesTable.isVisible, true), eq(businessesTable.status, "active")))
    .groupBy(businessesTable.zone);
  const countMap = new Map(counts.map(c => [c.zone, c.count]));
  res.json({ data: rows.map(z => ({ ...z, businessCount: countMap.get(z.slug) ?? 0 })) });
});

router.post("/admin/zones", async (req: Request, res: Response) => {
  const { slug, name, description, color, bannerUrl, active } = req.body || {};
  if (!slug || !name) {
    res.status(400).json({ error: "slug e name são obrigatórios" });
    return;
  }
  const slugNorm = String(slug).toLowerCase().trim().replace(/\s+/g, "-");
  if (!/^[a-z0-9-]+$/.test(slugNorm)) {
    res.status(400).json({ error: "Slug inválido (use apenas letras, números e hífens)" });
    return;
  }
  const existing = await db.select().from(zonesTable).where(eq(zonesTable.slug, slugNorm)).limit(1);
  if (existing[0]) {
    res.status(409).json({ error: "Já existe uma zona com este slug" });
    return;
  }
  const [zone] = await db.insert(zonesTable).values({
    slug: slugNorm,
    name: String(name),
    description: description ?? null,
    color: color || "#f97316",
    bannerUrl: bannerUrl || null,
    active: active !== false,
  }).returning();
  res.status(201).json({ zone });
});

router.patch("/admin/zones/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { name, description, color, bannerUrl, active } = req.body || {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = String(name);
  if (description !== undefined) updates.description = description || null;
  if (color !== undefined) updates.color = color || "#f97316";
  if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl || null;
  if (active !== undefined) updates.active = Boolean(active);
  const [zone] = await db.update(zonesTable).set(updates).where(eq(zonesTable.id, id)).returning();
  if (!zone) { res.status(404).json({ error: "Zona não encontrada" }); return; }
  res.json({ zone });
});

router.delete("/admin/zones/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const [zone] = await db.select().from(zonesTable).where(eq(zonesTable.id, id));
  if (!zone) {
    res.status(404).json({ error: "Zona não encontrada" });
    return;
  }

  // Bloqueia exclusão se houver negócios vinculados pelo slug — caso contrário
  // os registros ficariam órfãos e quebrariam filtros de zona no frontend.
  const [{ count: linked }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(businessesTable)
    .where(eq(businessesTable.zone, zone.slug));

  if (linked > 0) {
    res.status(400).json({
      error: `Esta zona possui ${linked} negócio(s) vinculado(s). Mova-os para outra zona antes de excluir.`,
      linkedCount: linked,
    });
    return;
  }

  await db.delete(zonesTable).where(eq(zonesTable.id, id));
  res.json({ success: true });
});

// ─── Sprint 4.2 — Audit Log ──────────────────────────────────────────────────
router.get("/admin/audit-log", async (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const targetType = req.query.targetType as string | undefined;
  const adminIdRaw = req.query.adminId as string | undefined;
  const adminIdNum = adminIdRaw ? Number(adminIdRaw) : undefined;

  const conds: any[] = [];
  if (targetType) conds.push(eq(adminActionsTable.targetType, targetType));
  if (adminIdNum && !isNaN(adminIdNum)) conds.push(eq(adminActionsTable.adminId, adminIdNum));

  const baseQuery = db.select().from(adminActionsTable);
  const rows = await (conds.length > 0
    ? baseQuery.where(and(...conds))
    : baseQuery
  ).orderBy(desc(adminActionsTable.createdAt)).limit(limit);

  res.json({ data: rows, count: rows.length });
});

// ─── Sprint 4.4 — Moderação de Reviews ───────────────────────────────────────
router.get("/admin/reviews", async (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const businessIdRaw = req.query.businessId as string | undefined;
  const ratingRaw = req.query.rating as string | undefined;

  const conds: any[] = [];
  if (businessIdRaw) {
    const bid = Number(businessIdRaw);
    if (!isNaN(bid)) conds.push(eq(reviewsTable.businessId, bid));
  }
  if (ratingRaw) {
    const r = Number(ratingRaw);
    if (!isNaN(r)) conds.push(eq(reviewsTable.rating, r));
  }

  const baseQ = db
    .select({
      id: reviewsTable.id,
      businessId: reviewsTable.businessId,
      businessName: businessesTable.name,
      author: reviewsTable.author,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
      verified: reviewsTable.verified,
      ownerResponse: reviewsTable.ownerResponse,
    })
    .from(reviewsTable)
    .leftJoin(businessesTable, eq(businessesTable.id, reviewsTable.businessId));

  const rows = await (conds.length > 0
    ? baseQ.where(and(...conds))
    : baseQ
  ).orderBy(desc(reviewsTable.createdAt)).limit(limit);

  res.json({ data: rows, count: rows.length });
});

router.delete("/admin/reviews/:id", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) {
    res.status(404).json({ error: "Review não encontrada" });
    return;
  }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));

  // Recalcula rating + reviewsCount do negócio afetado
  const [agg] = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${reviewsTable.rating})::real, 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, review.businessId));

  await db
    .update(businessesTable)
    .set({ rating: agg?.avg ?? 0, reviewsCount: agg?.count ?? 0 })
    .where(eq(businessesTable.id, review.businessId));

  await logAdminAction(
    ADMIN_DEFAULT_ID,
    "review.delete",
    "review",
    id,
    JSON.stringify({ businessId: review.businessId, rating: review.rating, author: review.author }),
    getReqIp(req),
  );

  res.json({ success: true, businessId: review.businessId, newRating: agg?.avg ?? 0, newCount: agg?.count ?? 0 });
});

// ─── Sprint 4.6 — Impersonate Lojista ────────────────────────────────────────
router.post("/admin/impersonate/:businessId", validateId, async (req: Request, res: Response) => {
  const businessId = parseInt(req.params.businessId, 10);
  const [user] = await db
    .select({ id: businessUsersTable.id, email: businessUsersTable.email, businessId: businessUsersTable.businessId })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));
  if (!user) {
    res.status(404).json({ error: "Lojista não encontrado para este negócio" });
    return;
  }
  const token = jwt.sign(
    { businessId: user.businessId, email: user.email, role: "lojista", impersonated: true },
    JWT_SECRET!,
    { expiresIn: "1h" },
  );
  await logAdminAction(
    ADMIN_DEFAULT_ID,
    "lojista.impersonate",
    "business",
    businessId,
    JSON.stringify({ email: user.email, expiresIn: "1h" }),
    getReqIp(req),
  );
  res.json({ token, businessId: user.businessId, email: user.email, expiresIn: 3600 });
});

// ─── GET /admin/placements — debug: todas as fontes de destaque ativas ───────
router.get("/admin/placements", async (req: Request, res: Response) => {
  const { zone, planType } = req.query as { zone?: string; planType?: string };

  const extraFilters: SQL[] = [];
  if (zone) extraFilters.push(sql`zone = ${zone}`);
  if (planType) extraFilters.push(sql`plan_type = ${planType}`);

  const query =
    extraFilters.length > 0
      ? sql`SELECT * FROM business_placements_active WHERE ${sql.join(extraFilters, sql` AND `)} ORDER BY plan_type DESC, business_id`
      : sql`SELECT * FROM business_placements_active ORDER BY plan_type DESC, business_id`;

  const result = await db.execute(query);
  res.json({ data: result.rows, count: result.rows.length });
});

export default router;
