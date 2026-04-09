import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, reviewsTable, businessClicksTable, searchBoostsTable } from "@workspace/db/schema";
import { eq, ilike, or, and, desc, asc, sql, ne, isNotNull, gte } from "drizzle-orm";
import {
  ListBusinessesQueryParams,
  GetBusinessByIdParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const PLAN_ORDER = sql<number>`CASE ${businessesTable.planType}
  WHEN 'premium' THEN 1
  WHEN 'destaque' THEN 2
  ELSE 3
END`;

const COMPLETENESS = sql<number>`(
  CASE WHEN ${businessesTable.logoUrl} IS NOT NULL THEN 1 ELSE 0 END +
  CASE WHEN array_length(${businessesTable.photos}, 1) > 0 THEN 1 ELSE 0 END +
  CASE WHEN ${businessesTable.description} != '' THEN 1 ELSE 0 END +
  CASE WHEN ${businessesTable.address} != '' THEN 1 ELSE 0 END
)`;

async function getActiveBoosts(): Promise<Map<number, { position: number | null; boostType: string; monthlyBid: string }>> {
  const boosts = await db.select().from(searchBoostsTable).where(
    and(
      eq(searchBoostsTable.status, "active"),
      or(
        sql`${searchBoostsTable.expiresAt} IS NULL`,
        sql`${searchBoostsTable.expiresAt} > NOW()`
      )
    )
  );
  const map = new Map<number, { position: number | null; boostType: string; monthlyBid: string }>();
  for (const b of boosts) {
    map.set(b.businessId, { position: b.position, boostType: b.boostType, monthlyBid: b.monthlyBid });
  }
  return map;
}

function getVisitorId(req: Request, res: Response): string {
  let vid = req.cookies?.hub_visitor;
  if (!vid) {
    vid = randomUUID();
    res.cookie("hub_visitor", vid, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" });
  }
  return vid;
}

router.get("/businesses", async (req: Request, res: Response) => {
  const parsed = ListBusinessesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  const { category, region, q, sort } = parsed.data;

  const conditions = [ne(businessesTable.isVisible, false)];

  if (category) conditions.push(eq(businessesTable.categorySlug, category));
  if (region) conditions.push(eq(businessesTable.region, region));
  if (q) {
    const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ";
    const PLAIN    = "aaaaaeeeeiiiioooooiuuuucnAAAAAEEEEIIIIOOOOOUUUUCN";
    const CATEGORY_SYNONYMS: Record<string, string[]> = {
      "restaurantes": ["restaurante", "comida", "almoco", "jantar", "refeicao", "gastronomia", "churrascaria", "cantina", "lanchonete"],
      "saloes": ["salao", "cabeleireiro", "cabeleireira", "cabelo", "corte", "beleza", "barbearia", "barbeiro", "manicure"],
      "academias": ["academia", "ginasio", "gym", "musculacao", "fitness", "treino", "crossfit"],
      "mercados": ["mercado", "supermercado", "mercearia", "hortifruti", "feira", "acougue"],
      "cafeterias": ["cafeteria", "cafe", "coffee", "padaria", "confeitaria", "doceria", "bolo", "lanche"],
      "pet-shops": ["pet", "petshop", "veterinario", "veterinaria", "animal", "cachorro", "gato", "banho", "tosa"],
      "farmacias": ["farmacia", "drogaria", "remedio", "medicamento"],
      "padarias": ["padaria", "pao", "confeitaria", "bolo", "panificadora"],
      "saude": ["saude", "clinica", "medico", "dentista", "odonto", "consultorio", "hospital", "fisioterapia"],
      "servicos": ["servico", "mecanica", "mecanico", "eletricista", "encanador", "pintor", "conserto"],
    };

    function strip(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
    const qNorm = strip(q);
    const variants = new Set([qNorm]);
    if (qNorm.endsWith("s")) variants.add(qNorm.slice(0, -1));
    else variants.add(qNorm + "s");
    if (qNorm.endsWith("ao")) { variants.add(qNorm.slice(0, -2) + "oes"); variants.add(qNorm.slice(0, -2) + "aes"); }
    if (qNorm.endsWith("oes") || qNorm.endsWith("aes")) variants.add(qNorm.slice(0, -3) + "ao");

    for (const [slug, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
      if (synonyms.some(syn => strip(syn) === qNorm || strip(syn).includes(qNorm) || qNorm.includes(strip(syn)))) {
        variants.add(slug);
      }
    }

    const variantConditions: any[] = [];
    for (const v of variants) {
      const pattern = `%${v}%`;
      variantConditions.push(
        sql`translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
        sql`translate(lower(${businessesTable.description}), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
        sql`translate(lower(${businessesTable.categorySlug}), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
        sql`translate(lower(${businessesTable.address}), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
        sql`translate(lower(${businessesTable.region}), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
        sql`translate(lower(${businessesTable.tags}::text), ${ACCENTED}, ${PLAIN}) like ${pattern}`,
      );
    }
    conditions.push(or(...variantConditions)!);
  }

  const where = and(...conditions);

  let orderBy;
  if (sort === "rating") {
    orderBy = desc(businessesTable.rating);
  } else if (sort === "name") {
    orderBy = asc(businessesTable.name);
  } else {
    orderBy = [asc(PLAN_ORDER), desc(businessesTable.rating), desc(COMPLETENESS), desc(businessesTable.clicks)];
  }

  const [data, countResult, boostMap] = await Promise.all([
    db.select().from(businessesTable).where(where).orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy])),
    db.select({ count: sql<number>`count(*)::int` }).from(businessesTable).where(where),
    getActiveBoosts(),
  ]);

  const monthlyBoosted: any[] = [];
  const avulsoBoosted: any[] = [];
  const premium: any[] = [];
  const destaque: any[] = [];
  const free: any[] = [];

  for (const biz of data) {
    const boost = boostMap.get(biz.id);
    if (boost) {
      const enriched = { ...biz, _boostType: boost.boostType, _boostPosition: boost.position, _boostBadge: "Patrocinado" };
      if (boost.boostType === "monthly" && boost.position) {
        monthlyBoosted.push(enriched);
      } else {
        avulsoBoosted.push(enriched);
      }
    } else if (biz.planType === "premium") {
      premium.push(biz);
    } else if (biz.planType === "destaque") {
      destaque.push(biz);
    } else {
      free.push(biz);
    }
  }

  monthlyBoosted.sort((a: any, b: any) => (a._boostPosition || 99) - (b._boostPosition || 99));
  avulsoBoosted.sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0));
  premium.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  destaque.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  free.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  res.json({ data: [...monthlyBoosted, ...avulsoBoosted, ...premium, ...destaque, ...free], total: countResult[0]?.count ?? 0 });
});

router.get("/businesses/nearby", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 5;
  const category = req.query.category as string | undefined;
  const region = req.query.region as string | undefined;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: "lat e lng são obrigatórios" });
    return;
  }

  const conditions = [ne(businessesTable.isVisible, false), isNotNull(businessesTable.lat), isNotNull(businessesTable.lng)];
  if (category) conditions.push(eq(businessesTable.categorySlug, category));
  if (region) conditions.push(eq(businessesTable.region, region));

  const haversine = sql<number>`(
    6371 * acos(
      cos(radians(${lat})) *
      cos(radians(${businessesTable.lat}::float)) *
      cos(radians(${businessesTable.lng}::float) - radians(${lng})) +
      sin(radians(${lat})) *
      sin(radians(${businessesTable.lat}::float))
    )
  )`;

  conditions.push(sql`(
    6371 * acos(
      cos(radians(${lat})) *
      cos(radians(${businessesTable.lat}::float)) *
      cos(radians(${businessesTable.lng}::float) - radians(${lng})) +
      sin(radians(${lat})) *
      sin(radians(${businessesTable.lat}::float))
    )
  ) <= ${radius}`);

  const data = await db
    .select({ business: businessesTable, distanceKm: haversine })
    .from(businessesTable)
    .where(and(...conditions))
    .orderBy(asc(haversine));

  const result = data.map(r => ({
    ...r.business,
    distanceKm: Math.round((r.distanceKm ?? 0) * 10) / 10,
  }));

  res.json({
    data: result,
    total: result.length,
  });
});

router.get("/businesses/:id", async (req: Request, res: Response) => {
  const parsed = GetBusinessByIdParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  const { id } = parsed.data;

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));

  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const [category, reviews] = await Promise.all([
    db.select().from(categoriesTable).where(eq(categoriesTable.slug, business.categorySlug)).then(rows => rows[0]),
    db.select().from(reviewsTable).where(eq(reviewsTable.businessId, id)).orderBy(desc(reviewsTable.createdAt)),
  ]);

  db.update(businessesTable)
    .set({ clicks: sql`${businessesTable.clicks} + 1` })
    .where(eq(businessesTable.id, id))
    .execute()
    .catch(() => {});

  db.insert(businessClicksTable)
    .values({ businessId: id, type: "profile" })
    .execute()
    .catch(() => {});

  res.json({ ...business, category, reviews });
});

router.get("/businesses/:id/reviews", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, id))
    .orderBy(desc(reviewsTable.createdAt));

  res.json({ data: reviews });
});

router.post("/businesses/:id/review", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const { author, rating, text } = req.body;
  if (!author || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Dados inválidos: author e rating (1-5) são obrigatórios" });
    return;
  }

  const [business] = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.id, id));
  if (!business) { res.status(404).json({ error: "Negócio não encontrado" }); return; }

  const visitorId = getVisitorId(req, res);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentClick] = await db
    .select({ id: businessClicksTable.id })
    .from(businessClicksTable)
    .where(
      and(
        eq(businessClicksTable.businessId, id),
        eq(businessClicksTable.type, "whatsapp"),
        eq(businessClicksTable.visitorId, visitorId),
        gte(businessClicksTable.createdAt, thirtyDaysAgo),
      ),
    )
    .limit(1);

  const verified = Boolean(recentClick);

  const [review] = await db.insert(reviewsTable).values({
    businessId: id,
    author: author.trim(),
    rating: Number(rating),
    text: (text || "").trim(),
    visitorId,
    verified,
  }).returning();

  const [stats] = await db
    .select({
      avg: sql<number>`avg(rating)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, id));

  await db.update(businessesTable)
    .set({
      rating: Math.round((stats?.avg ?? 0) * 10) / 10,
      reviewsCount: stats?.count ?? 0,
    })
    .where(eq(businessesTable.id, id));

  res.status(201).json({ review });
});

router.post("/businesses/:id/click-whatsapp", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "ID inválido" }); return; }

  const visitorId = getVisitorId(req, res);

  await db.update(businessesTable)
    .set({ whatsappClicks: sql`${businessesTable.whatsappClicks} + 1` })
    .where(eq(businessesTable.id, id));

  db.insert(businessClicksTable)
    .values({ businessId: id, type: "whatsapp", visitorId })
    .execute()
    .catch(() => {});

  res.json({ success: true, visitorId });
});

router.get("/regions", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({ region: businessesTable.region })
      .from(businessesTable)
      .where(and(eq(businessesTable.isVisible, true), sql`${businessesTable.region} is not null and ${businessesTable.region} != ''`))
      .groupBy(businessesTable.region)
      .orderBy(businessesTable.region);

    res.json({ data: rows.map(r => r.region).filter(Boolean) });
  } catch {
    res.status(500).json({ error: "Erro ao buscar regiões" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [businessCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(eq(businessesTable.isVisible, true));

    const [categoryCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categoriesTable);

    const [regionResult] = await db
      .select({ count: sql<number>`count(distinct ${businessesTable.region})::int` })
      .from(businessesTable)
      .where(and(eq(businessesTable.isVisible, true), sql`${businessesTable.region} is not null and ${businessesTable.region} != ''`));

    const [clickResult] = await db
      .select({ count: sql<number>`coalesce(sum(${businessesTable.clicks}), 0)::int` })
      .from(businessesTable);

    res.json({
      businesses: businessCount?.count ?? 0,
      categories: categoryCount?.count ?? 0,
      regions: regionResult?.count ?? 0,
      totalClicks: clickResult?.count ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

router.get("/home-banners", async (_req: Request, res: Response) => {
  const { homeBannersTable } = await import("@workspace/db/schema");
  const now = new Date();
  const banners = await db
    .select()
    .from(homeBannersTable)
    .where(
      and(
        eq(homeBannersTable.active, true),
        or(
          sql`${homeBannersTable.endsAt} IS NULL`,
          gte(homeBannersTable.endsAt, now),
        )!,
      ),
    )
    .limit(2);
  res.json({ data: banners });
});

export default router;
