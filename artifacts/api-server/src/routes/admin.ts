import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, businessClicksTable, businessUsersTable, productsTable, homeBannersTable, searchBoostsTable } from "@workspace/db/schema";
import { eq, ilike, sql, and, desc, gte, asc, or, ne } from "drizzle-orm";

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

router.post("/admin/login", (req: Request, res: Response) => {
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

  const estimatedRevenue = (byPlan.destaque || 0) * 49 + (byPlan.premium || 0) * 89;

  res.json({
    totalBusinesses: totalResult[0]?.count ?? 0,
    totalLojistas: lojistasResult[0]?.count ?? 0,
    totalProducts: productsResult[0]?.count ?? 0,
    totalClicks: clicksResult[0]?.totalClicks ?? 0,
    totalWhatsappClicks: clicksResult[0]?.totalWhatsappClicks ?? 0,
    recentSignups: recentResult[0]?.count ?? 0,
    visibleCount: visibilityResult[0]?.visible ?? 0,
    hiddenCount: visibilityResult[0]?.hidden ?? 0,
    estimatedRevenue,
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

router.get("/admin/businesses/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

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

router.patch("/admin/businesses/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const updates: Record<string, unknown> = {};

  if (req.body.planType !== undefined) {
    if (!VALID_PLANS.includes(req.body.planType)) {
      res.status(400).json({ error: "planType inválido" }); return;
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

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo válido para atualizar" });
    return;
  }

  const result = await db.update(businessesTable).set(updates).where(eq(businessesTable.id, id)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }
  res.json(result[0]);
});

router.delete("/admin/businesses/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const result = await db.delete(businessesTable).where(eq(businessesTable.id, id)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }
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

router.post("/admin/lojistas/:id/reset-password", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

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

router.patch("/admin/categories/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

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

router.delete("/admin/categories/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

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

router.get("/admin/search-boosts", async (_req: Request, res: Response) => {
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
    })
    .from(searchBoostsTable)
    .innerJoin(businessesTable, eq(searchBoostsTable.businessId, businessesTable.id))
    .orderBy(asc(searchBoostsTable.position), desc(searchBoostsTable.createdAt));

  res.json({ data: boosts });
});

router.post("/admin/search-boosts", async (req: Request, res: Response) => {
  const { businessId, monthlyBid, position, boostType, days } = req.body;
  if (!businessId || !boostType) {
    res.status(400).json({ error: "businessId e boostType são obrigatórios" });
    return;
  }
  if (!["monthly", "avulso"].includes(boostType)) {
    res.status(400).json({ error: "boostType deve ser 'monthly' ou 'avulso'" });
    return;
  }

  if (boostType === "monthly") {
    if (!position || position < 1 || position > 5) {
      res.status(400).json({ error: "Posição mensal deve ser 1-5" });
      return;
    }
    const existing = await db.select().from(searchBoostsTable).where(
      and(
        eq(searchBoostsTable.position, position),
        eq(searchBoostsTable.boostType, "monthly"),
        eq(searchBoostsTable.status, "active")
      )
    );
    if (existing.length > 0) {
      res.status(400).json({ error: `Posição ${position} já ocupada` });
      return;
    }
  }

  const existing = await db.select().from(searchBoostsTable).where(eq(searchBoostsTable.businessId, Number(businessId)));
  if (existing.length > 0) {
    res.status(400).json({ error: "Este negócio já possui um boost ativo" });
    return;
  }

  const startsAt = new Date();
  let expiresAt: Date | null = null;
  if (boostType === "avulso" && days) {
    expiresAt = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);
  }

  try {
    const [boost] = await db.insert(searchBoostsTable).values({
      businessId: Number(businessId),
      monthlyBid: String(monthlyBid || "0"),
      position: boostType === "monthly" ? Number(position) : null,
      boostType,
      status: "active",
      startsAt,
      expiresAt,
    }).returning();

    res.status(201).json({ boost });
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

router.patch("/admin/search-boosts/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const { monthlyBid, position, status } = req.body;
  const updates: Record<string, unknown> = {};
  if (monthlyBid !== undefined) updates.monthlyBid = String(monthlyBid);
  if (position !== undefined) updates.position = Number(position);
  if (status !== undefined) updates.status = status;

  const [boost] = await db.update(searchBoostsTable).set(updates).where(eq(searchBoostsTable.id, id)).returning();
  if (!boost) { res.status(404).json({ error: "Boost não encontrado" }); return; }
  res.json({ boost });
});

router.delete("/admin/search-boosts/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(searchBoostsTable).where(eq(searchBoostsTable.id, id));
  res.json({ success: true });
});

router.patch("/admin/businesses/:id/home-featured", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }
  const { homeFeatured } = req.body;
  await db.update(businessesTable).set({ homeFeatured: Boolean(homeFeatured) }).where(eq(businessesTable.id, id));
  res.json({ success: true });
});

router.get("/admin/home-banners", async (_req: Request, res: Response) => {
  const banners = await db.select().from(homeBannersTable).orderBy(desc(homeBannersTable.createdAt));
  res.json({ data: banners });
});

router.post("/admin/home-banners", async (req: Request, res: Response) => {
  const { title, imageUrl, linkUrl, active, endsAt, businessId } = req.body;
  if (!title || !imageUrl) {
    res.status(400).json({ error: "title e imageUrl são obrigatórios" });
    return;
  }

  const active3 = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(homeBannersTable)
    .where(eq(homeBannersTable.active, true));
  if ((active3[0]?.count ?? 0) >= 2) {
    res.status(400).json({ error: "Máximo 2 banners ativos simultâneos" });
    return;
  }

  const [banner] = await db.insert(homeBannersTable).values({
    title,
    imageUrl,
    linkUrl: linkUrl || null,
    active: active !== false,
    endsAt: endsAt ? new Date(endsAt) : null,
    businessId: businessId ? Number(businessId) : null,
  }).returning();

  res.status(201).json({ banner });
});

router.patch("/admin/home-banners/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const { title, imageUrl, linkUrl, active, endsAt } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (linkUrl !== undefined) updates.linkUrl = linkUrl;
  if (active !== undefined) updates.active = Boolean(active);
  if (endsAt !== undefined) updates.endsAt = endsAt ? new Date(endsAt) : null;

  const [banner] = await db.update(homeBannersTable).set(updates).where(eq(homeBannersTable.id, id)).returning();
  if (!banner) { res.status(404).json({ error: "Banner não encontrado" }); return; }
  res.json({ banner });
});

router.delete("/admin/home-banners/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(homeBannersTable).where(eq(homeBannersTable.id, id));
  res.json({ success: true });
});

export default router;
