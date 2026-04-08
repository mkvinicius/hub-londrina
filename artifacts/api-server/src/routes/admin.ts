import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable } from "@workspace/db/schema";
import { eq, ilike, sql, and, desc, gte } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required for admin routes");
}
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD env var is required for admin routes");
}

const VALID_ZONES = ["centro", "norte", "sul", "leste", "oeste"];
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
    zoneResults,
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
      zone: businessesTable.zone,
      count: sql<number>`count(*)::int`,
    }).from(businessesTable).groupBy(businessesTable.zone),
  ]);

  const byPlan: Record<string, number> = { free: 0, destaque: 0, premium: 0 };
  for (const r of planResults) {
    byPlan[r.planType] = r.count;
  }

  const byZone: Record<string, number> = {};
  for (const r of zoneResults) {
    byZone[r.zone] = r.count;
  }

  res.json({
    totalBusinesses: totalResult[0]?.count ?? 0,
    byPlan,
    totalClicks: clicksResult[0]?.totalClicks ?? 0,
    totalWhatsappClicks: clicksResult[0]?.totalWhatsappClicks ?? 0,
    recentSignups: recentResult[0]?.count ?? 0,
    byZone,
  });
});

router.get("/admin/businesses", async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const zone = req.query.zone as string | undefined;
  const planType = req.query.planType as string | undefined;
  const isVisible = req.query.isVisible as string | undefined;

  const conditions = [];
  if (search) {
    conditions.push(ilike(businessesTable.name, `%${search}%`));
  }
  if (zone) {
    conditions.push(eq(businessesTable.zone, zone));
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
  if (req.body.zone !== undefined) {
    if (!VALID_ZONES.includes(req.body.zone)) {
      res.status(400).json({ error: "zone inválida" }); return;
    }
    updates.zone = req.body.zone;
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

export default router;
