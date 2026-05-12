import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, businessesTable, searchBoostsTable } from "@workspace/db/schema";
import { eq, and, sql, gt, isNull, or, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  const zone = typeof req.query.zone === "string" ? req.query.zone : undefined;
  const categories = await db.select().from(categoriesTable);

  const baseConds = [eq(businessesTable.isVisible, true), eq(businessesTable.status, "active")];
  if (zone) baseConds.push(eq(businessesTable.zone, zone));

  const counts = await db
    .select({
      categorySlug: businessesTable.categorySlug,
      count: sql<number>`count(*)::int`,
    })
    .from(businessesTable)
    .where(and(...baseConds))
    .groupBy(businessesTable.categorySlug);

  const countMap = new Map(counts.map((c) => [c.categorySlug, c.count]));

  const data = categories.map((cat) => ({
    ...cat,
    businessCount: countMap.get(cat.slug) ?? 0,
  }));

  res.json({ data });
});

// Up to 3 active category-boosted businesses for a given category slug.
// Reusa o boost existente (search_boosts.boostContext='category', monthly).
// Filtra pelo categorySlug do negócio (boost de categoria é global por posição,
// então filtramos os que pertencem à categoria pedida).
router.get("/categories/:slug/featured", async (req, res) => {
  const slug = req.params.slug;
  if (!slug) {
    res.status(400).json({ error: "slug obrigatório" });
    return;
  }

  const now = new Date();
  const rows = await db
    .select({ business: businessesTable, position: searchBoostsTable.position })
    .from(searchBoostsTable)
    .innerJoin(businessesTable, eq(searchBoostsTable.businessId, businessesTable.id))
    .where(and(
      eq(searchBoostsTable.boostType, "monthly"),
      eq(searchBoostsTable.boostContext, "category"),
      eq(searchBoostsTable.status, "active"),
      or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, now)),
      eq(businessesTable.categorySlug, slug),
      eq(businessesTable.isVisible, true),
      eq(businessesTable.status, "active"),
    ))
    .orderBy(asc(searchBoostsTable.position))
    .limit(3);

  const data = rows.map((r) => ({ ...r.business, _boostPosition: r.position }));
  res.json({ data });
});

export default router;
