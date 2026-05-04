import { Router, type IRouter, type Request, type Response } from "express";
import { validatePagination } from "../middleware/validateId";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, searchBoostsTable, zonesTable } from "@workspace/db/schema";
import { eq, and, ne, desc, asc, sql, or } from "drizzle-orm";

const router: IRouter = Router();

const FALLBACK_ZONES: Record<string, { name: string; color: string; description: string }> = {
  norte:  { name: "Zona Norte",  color: "#3d7a28", description: "Negócios da Zona Norte de Londrina" },
  sul:    { name: "Zona Sul",    color: "#2563eb", description: "Negócios da Zona Sul de Londrina" },
  leste:  { name: "Zona Leste",  color: "#d97706", description: "Negócios da Zona Leste de Londrina" },
  oeste:  { name: "Zona Oeste",  color: "#7c3aed", description: "Negócios da Zona Oeste de Londrina" },
  centro: { name: "Centro",      color: "#dc2626", description: "Negócios do Centro de Londrina" },
};

async function getZoneBySlug(slug: string) {
  const rows = await db.select().from(zonesTable).where(eq(zonesTable.slug, slug)).limit(1);
  if (rows[0]) return rows[0];
  const fb = FALLBACK_ZONES[slug];
  if (!fb) return null;
  return { id: 0, slug, name: fb.name, description: fb.description, color: fb.color, bannerUrl: null, active: true, createdAt: null };
}

router.get("/zones", async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(zonesTable).where(eq(zonesTable.active, true)).orderBy(asc(zonesTable.name));
    if (rows.length > 0) {
      res.json({ data: rows });
      return;
    }
    const fallback = Object.entries(FALLBACK_ZONES).map(([slug, v]) => ({
      id: 0, slug, name: v.name, description: v.description, color: v.color, bannerUrl: null, active: true, createdAt: null,
    }));
    res.json({ data: fallback });
  } catch (err) {
    console.error("[zones list]", err);
    res.status(500).json({ error: "Erro ao listar zonas" });
  }
});

router.get("/zones/:zone", async (req: Request, res: Response, next) => {
  // Avoid clashing with /zones/:zone/stats and /zones/:zone/businesses
  if (req.params.zone === "undefined") return next();
  if (req.path.endsWith("/stats") || req.path.endsWith("/businesses")) return next();
  try {
    const zone = await getZoneBySlug(String(req.params.zone));
    if (!zone) {
      res.status(404).json({ error: "Zona não encontrada" });
      return;
    }
    res.json({ data: zone });
  } catch (err) {
    next(err);
  }
});

const VALID_ZONES = ["norte", "sul", "leste", "oeste", "centro"] as const;
type ZoneSlug = typeof VALID_ZONES[number];

const ZONE_LABELS: Record<ZoneSlug, string> = {
  norte: "Zona Norte",
  sul: "Zona Sul",
  leste: "Zona Leste",
  oeste: "Zona Oeste",
  centro: "Centro",
};

const ZONE_COLORS: Record<ZoneSlug, string> = {
  norte: "#3d7a28",
  sul: "#2563eb",
  leste: "#d97706",
  oeste: "#7c3aed",
  centro: "#dc2626",
};

const PLAN_ORDER = sql<number>`CASE ${businessesTable.planType}
  WHEN 'premium' THEN 1
  WHEN 'destaque' THEN 2
  ELSE 3
END`;

function zoneCondition(zone: ZoneSlug) {
  return and(
    eq(businessesTable.zone, zone),
    eq(businessesTable.status, "active"),
    ne(businessesTable.isVisible, false)
  );
}

async function getActiveBoostMap(): Promise<Map<number, { position: number | null; boostType: string }>> {
  const boosts = await db.select().from(searchBoostsTable).where(
    and(
      eq(searchBoostsTable.status, "active"),
      or(
        sql`${searchBoostsTable.expiresAt} IS NULL`,
        sql`${searchBoostsTable.expiresAt} > NOW()`
      )
    )
  );
  const map = new Map<number, { position: number | null; boostType: string }>();
  for (const b of boosts) {
    map.set(b.businessId, { position: b.position, boostType: b.boostType });
  }
  return map;
}

router.get("/zones/:zone/stats", async (req: Request, res: Response) => {
  const zone = req.params.zone as ZoneSlug;
  if (!VALID_ZONES.includes(zone)) {
    res.status(400).json({ error: "Zona inválida.", code: "INVALID_ZONE" });
    return;
  }

  try {
    const [{ count: totalBusinesses }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(zoneCondition(zone));

    const byCategory = await db
      .select({
        slug: businessesTable.categorySlug,
        count: sql<number>`count(*)::int`,
      })
      .from(businessesTable)
      .where(zoneCondition(zone))
      .groupBy(businessesTable.categorySlug)
      .orderBy(desc(sql`count(*)`));

    const categoryNames = await db.select().from(categoriesTable);
    const catMap = new Map(categoryNames.map(c => [c.slug, c.name]));

    const byCategoryWithName = byCategory.map(c => ({
      slug: c.slug,
      name: catMap.get(c.slug) ?? c.slug,
      count: c.count,
    }));

    const topRated = await db
      .select()
      .from(businessesTable)
      .where(zoneCondition(zone))
      .orderBy(
        asc(PLAN_ORDER),
        desc(businessesTable.rating),
        desc(businessesTable.clicks)
      )
      .limit(4);

    res.json({
      zone,
      label: ZONE_LABELS[zone],
      color: ZONE_COLORS[zone],
      totalBusinesses,
      byCategory: byCategoryWithName,
      topRated,
    });
  } catch (err) {
    console.error("[zones/stats error]", err);
    res.status(500).json({ error: "Erro ao buscar stats da zona" });
  }
});

router.get("/zones/:zone/businesses", validatePagination, async (req: Request, res: Response) => {
  const zone = req.params.zone as ZoneSlug;
  if (!VALID_ZONES.includes(zone)) {
    res.status(400).json({ error: "Zona inválida.", code: "INVALID_ZONE" });
    return;
  }

  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const page = parseInt(req.query.page as string || "1", 10);
  const limit = parseInt(req.query.limit as string || "12", 10);
  const offset = (page - 1) * limit;

  try {
    const boostMap = await getActiveBoostMap();

    const conditions = [zoneCondition(zone)!];
    if (category) {
      conditions.push(eq(businessesTable.categorySlug, category));
    }

    const whereClause = and(...conditions);

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(whereClause);

    const rows = await db
      .select()
      .from(businessesTable)
      .where(whereClause)
      .orderBy(
        asc(PLAN_ORDER),
        desc(businessesTable.rating),
        desc(businessesTable.clicks)
      )
      .limit(limit)
      .offset(offset);

    const data = rows.map(b => {
      const boost = boostMap.get(b.id);
      return {
        ...b,
        _boostBadge: boost ? (boost.boostType === "monthly" ? "Patrocinado" : "Impulsionado") : null,
        boostPosition: boost?.position ?? null,
      };
    });

    const monthlyBoosted = data.filter(b => b._boostBadge === "Patrocinado").sort((a, b) => (a.boostPosition ?? 99) - (b.boostPosition ?? 99));
    const avulso = data.filter(b => b._boostBadge === "Impulsionado");
    const rest = data.filter(b => !b._boostBadge);
    const sorted = [...monthlyBoosted, ...avulso, ...rest];

    res.json({ data: sorted, total, page, limit });
  } catch (err) {
    console.error("[zones/businesses error]", err);
    res.status(500).json({ error: "Erro ao buscar negócios da zona" });
  }
});

export default router;
