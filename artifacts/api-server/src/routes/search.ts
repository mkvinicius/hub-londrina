import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable } from "@workspace/db/schema";
import { or, and, eq, desc, asc, sql, ne } from "drizzle-orm";
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

const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ";
const PLAIN    = "aaaaaeeeeiiiioooooiuuuucnAAAAAEEEEIIIIOOOOOUUUUCN";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function generateSearchVariants(term: string): string[] {
  const t = stripAccents(term.toLowerCase().trim());
  const variants = new Set<string>();
  variants.add(t);

  if (t.endsWith("s")) variants.add(t.slice(0, -1));
  else variants.add(t + "s");

  if (t.endsWith("ao")) {
    variants.add(t.slice(0, -2) + "oes");
    variants.add(t.slice(0, -2) + "aes");
  }
  if (t.endsWith("oes") || t.endsWith("aes")) {
    variants.add(t.slice(0, -3) + "ao");
  }

  if (t.endsWith("cao")) {
    variants.add(t.slice(0, -3) + "coes");
  }
  if (t.endsWith("coes")) {
    variants.add(t.slice(0, -4) + "cao");
  }

  if (t.endsWith("al")) {
    variants.add(t.slice(0, -2) + "ais");
  } else if (t.endsWith("ais")) {
    variants.add(t.slice(0, -3) + "al");
  }

  if (t.endsWith("el")) {
    variants.add(t.slice(0, -2) + "eis");
  } else if (t.endsWith("eis")) {
    variants.add(t.slice(0, -3) + "el");
  }

  return [...variants];
}

function unaccentLike(column: any, pattern: string) {
  return sql`translate(lower(${column}), ${ACCENTED}, ${PLAIN}) like ${pattern}`;
}

router.get("/search", async (req, res) => {
  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  const { q, region, category } = parsed.data;

  const conditions = [ne(businessesTable.isVisible, false)];

  if (q) {
    const words = q.trim().split(/\s+/).filter(Boolean);
    const wordConditions: any[] = [];

    for (const word of words) {
      const variants = generateSearchVariants(word);
      const variantConditions: any[] = [];

      for (const v of variants) {
        const pattern = `%${v}%`;
        variantConditions.push(
          unaccentLike(businessesTable.name, pattern),
          unaccentLike(businessesTable.description, pattern),
          unaccentLike(businessesTable.categorySlug, pattern),
          unaccentLike(businessesTable.address, pattern),
          unaccentLike(businessesTable.region, pattern),
          sql`translate(lower(${businessesTable.tags}::text), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
        );
      }

      wordConditions.push(or(...variantConditions));
    }

    conditions.push(and(...wordConditions)!);
  }

  if (region) conditions.push(eq(businessesTable.region, region));
  if (category) conditions.push(eq(businessesTable.categorySlug, category));

  const where = and(...conditions);

  let relevanceScore = sql<number>`0`;
  if (q) {
    const qNorm = stripAccents(q.toLowerCase());
    relevanceScore = sql<number>`(
      CASE WHEN translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 10 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.categorySlug}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 8 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.description}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 5 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.tags}::text), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 6 ELSE 0 END
    )`;
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(businessesTable)
      .where(where)
      .orderBy(
        asc(BOOST_ORDER),
        desc(relevanceScore),
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
