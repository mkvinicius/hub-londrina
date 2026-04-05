import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { ilike, or, and, eq, desc, sql } from "drizzle-orm";
import { SearchQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/search", async (req, res) => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  const { q, region, category } = parsed.data;

  const conditions = [];

  if (q) {
    conditions.push(
      or(
        ilike(businessesTable.name, `%${q}%`),
        ilike(businessesTable.description, `%${q}%`),
      ),
    );
  }
  if (region) {
    conditions.push(eq(businessesTable.region, region));
  }
  if (category) {
    conditions.push(eq(businessesTable.categorySlug, category));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(businessesTable)
      .where(where)
      .orderBy(desc(businessesTable.rating)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(where),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

export default router;
