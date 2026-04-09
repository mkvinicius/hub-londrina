import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { ilike, or, and, eq, desc, asc, sql, ne } from "drizzle-orm";
import { SearchQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

const PLAN_ORDER = sql<number>`CASE ${businessesTable.planType}
  WHEN 'premium' THEN 1
  WHEN 'destaque' THEN 2
  ELSE 3
END`;

const BOOST_ORDER = sql<number>`CASE
  WHEN ${businessesTable.boostedUntil} IS NOT NULL AND ${businessesTable.boostedUntil} > NOW() THEN 0
  ELSE 1
END`;

const COMPLETENESS = sql<number>`(
  CASE WHEN ${businessesTable.logoUrl} IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN array_length(${businessesTable.photos}, 1) > 0 THEN 1 ELSE 0 END +
  CASE WHEN ${businessesTable.description} != '' THEN 1 ELSE 0 END +
  CASE WHEN ${businessesTable.address} != '' THEN 1 ELSE 0 END
)`;

router.get("/search", async (req, res) => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  const { q, region, category } = parsed.data;

  const conditions = [ne(businessesTable.isVisible, false)];

  if (q) {
    conditions.push(
      or(
        ilike(businessesTable.name, `%${q}%`),
        ilike(businessesTable.description, `%${q}%`),
        sql`${businessesTable.tags}::text ilike ${"%" + q + "%"}`,
      )!,
    );
  }
  if (region) conditions.push(eq(businessesTable.region, region));
  if (category) conditions.push(eq(businessesTable.categorySlug, category));

  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(businessesTable)
      .where(where)
      .orderBy(
        asc(BOOST_ORDER),
        asc(PLAN_ORDER),
        desc(businessesTable.rating),
        desc(COMPLETENESS),
        desc(businessesTable.clicks),
      ),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(where),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

export default router;
