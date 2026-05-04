import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { categoriesTable, businessesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

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

export default router;
