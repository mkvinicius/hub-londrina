import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, reviewsTable } from "@workspace/db/schema";
import { eq, ilike, or, and, desc, asc, sql } from "drizzle-orm";
import {
  ListBusinessesQueryParams,
  GetBusinessByIdParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/businesses", async (req, res) => {
  const parsed = ListBusinessesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  const { category, region, q, sort } = parsed.data;

  const conditions = [];

  if (category) {
    conditions.push(eq(businessesTable.categorySlug, category));
  }
  if (region) {
    conditions.push(eq(businessesTable.region, region));
  }
  if (q) {
    conditions.push(
      or(
        ilike(businessesTable.name, `%${q}%`),
        ilike(businessesTable.description, `%${q}%`),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let orderBy;
  if (sort === "rating") {
    orderBy = desc(businessesTable.rating);
  } else if (sort === "name") {
    orderBy = asc(businessesTable.name);
  } else {
    orderBy = desc(businessesTable.createdAt);
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(businessesTable)
      .where(where)
      .orderBy(orderBy),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(where),
  ]);

  res.json({ data, total: countResult[0]?.count ?? 0 });
});

router.get("/businesses/:id", async (req, res) => {
  const parsed = GetBusinessByIdParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const { id } = parsed.data;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, id));

  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const [category, reviews] = await Promise.all([
    db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, business.categorySlug))
      .then((rows) => rows[0]),
    db
      .select()
      .from(reviewsTable)
      .where(eq(reviewsTable.businessId, id))
      .orderBy(desc(reviewsTable.createdAt)),
  ]);

  res.json({ ...business, category, reviews });
});

export default router;
