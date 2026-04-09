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

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "restaurantes": ["restaurante", "comida", "almoço", "almoco", "jantar", "refeição", "refeicao", "gastronomia", "churrascaria", "cantina", "lanchonete"],
  "saloes": ["salao", "salão", "saloes", "salões", "cabeleireiro", "cabeleireira", "cabelo", "corte", "beleza", "barbearia", "barbeiro", "manicure"],
  "academias": ["academia", "ginasio", "ginásio", "gym", "musculação", "musculacao", "fitness", "treino", "crossfit"],
  "mercados": ["mercado", "supermercado", "mercearia", "hortifruti", "feira", "açougue", "acougue"],
  "cafeterias": ["cafeteria", "cafe", "café", "coffee", "padaria", "confeitaria", "doceria", "bolo", "lanche"],
  "pet-shops": ["pet", "petshop", "pet-shop", "veterinario", "veterinário", "veterinaria", "veterinária", "animal", "cachorro", "gato", "banho", "tosa"],
  "farmacias": ["farmacia", "farmácia", "drogaria", "remedio", "remédio", "medicamento"],
  "padarias": ["padaria", "pao", "pão", "confeitaria", "bolo", "panificadora"],
  "saude": ["saude", "saúde", "clinica", "clínica", "medico", "médico", "dentista", "odonto", "consultorio", "consultório", "hospital", "fisioterapia"],
  "servicos": ["servico", "serviço", "servicos", "serviços", "mecanica", "mecânica", "mecanico", "mecânico", "eletricista", "encanador", "pintor", "conserto"],
};

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

  for (const [slug, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some(syn => stripAccents(syn) === t || stripAccents(syn).includes(t) || t.includes(stripAccents(syn)))) {
      variants.add(slug);
    }
  }

  return [...variants];
}

function unaccentLike(column: any, pattern: string) {
  return sql`translate(lower(${column}), ${ACCENTED}, ${PLAIN}) like ${pattern}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

  let relevanceScore = sql<number>`0::int`;
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

  const now = new Date();
  const boosted = data.filter((b: any) => b.boostedUntil && new Date(b.boostedUntil) > now);
  const rest = data.filter((b: any) => !b.boostedUntil || new Date(b.boostedUntil) <= now);
  const finalData = [...shuffleArray(boosted), ...rest];

  res.json({ data: finalData, total: countResult[0]?.count ?? 0 });
});

export default router;
