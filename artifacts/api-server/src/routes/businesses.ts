import { Router, type IRouter, type Request, type Response } from "express";
import { reviewLimiter, businessViewLimiter } from "../middleware/rateLimiter";
import { sendEmail, emails } from "../services/email";
import { csrfProtection } from "../middleware/csrf";
import { validateId } from "../middleware/validateId";
import { db } from "@workspace/db";
import { businessesTable, categoriesTable, reviewsTable, businessClicksTable, searchBoostsTable, businessUsersTable, productsTable, zonesTable } from "@workspace/db/schema";
import { eq, ilike, or, and, desc, asc, sql, ne, isNotNull, gte, inArray } from "drizzle-orm";
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

let _boostsCache: { data: Map<number, { position: number | null; boostType: string; monthlyBid: string }>; ts: number } | null = null;
const BOOSTS_CACHE_TTL_MS = 30_000;

async function getActiveBoosts(): Promise<Map<number, { position: number | null; boostType: string; monthlyBid: string }>> {
  if (_boostsCache && Date.now() - _boostsCache.ts < BOOSTS_CACHE_TTL_MS) {
    return _boostsCache.data;
  }
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
  _boostsCache = { data: map, ts: Date.now() };
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
  const { category, region, q, sort, zone } = parsed.data;

  const conditions = [ne(businessesTable.isVisible, false), eq(businessesTable.status, "active")];

  if (category) conditions.push(eq(businessesTable.categorySlug, category));
  if (region) conditions.push(eq(businessesTable.region, region));
  if (zone) conditions.push(eq(businessesTable.zone, zone));
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

  const now = Date.now();
  const monthlyBoosted: any[] = [];
  const avulsoBoosted: any[] = [];
  const directBoosted: any[] = [];
  const premium: any[] = [];
  const destaque: any[] = [];
  const free: any[] = [];

  const isDev = process.env.NODE_ENV !== "production";

  for (const biz of data) {
    const boost = boostMap.get(biz.id);
    if (boost) {
      const enriched = {
        ...biz,
        _boostType: boost.boostType,
        _boostPosition: boost.position,
        _boostBadge: "Patrocinado",
        boostPosition: boost.position,
        boostInfo: { isActive: true, type: boost.boostType, position: boost.position },
      };
      if (boost.boostType === "monthly" && boost.position) {
        monthlyBoosted.push(enriched);
      } else {
        avulsoBoosted.push(enriched);
      }
    } else if (biz.boostedUntil && new Date(biz.boostedUntil).getTime() > now) {
      directBoosted.push({ ...biz, boostPosition: null, boostInfo: null, _boostBadge: "Impulsionado" });
    } else if (biz.planType === "premium") {
      premium.push({ ...biz, boostPosition: null, boostInfo: null });
    } else if (biz.planType === "destaque") {
      destaque.push({ ...biz, boostPosition: null, boostInfo: null });
    } else {
      free.push({ ...biz, boostPosition: null, boostInfo: null });
    }
  }

  monthlyBoosted.sort((a: any, b: any) => (a._boostPosition || 99) - (b._boostPosition || 99));
  avulsoBoosted.sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0));
  directBoosted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  premium.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  destaque.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  free.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const buckets = [
    { items: monthlyBoosted, prefix: "boost_monthly" },
    { items: avulsoBoosted, prefix: "boost_avulso" },
    { items: directBoosted, prefix: "boost_direto" },
    { items: premium, prefix: "premium" },
    { items: destaque, prefix: "destaque" },
    { items: free, prefix: "free" },
  ];

  const ordered: any[] = [];
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.items.length; i++) {
      const item = bucket.items[i];
      if (isDev) {
        item._debug_order = `${bucket.prefix}_${i + 1}`;
      }
      ordered.push(item);
    }
  }

  res.json({ data: ordered, total: countResult[0]?.count ?? 0 });
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

  const conditions = [ne(businessesTable.isVisible, false), eq(businessesTable.status, "active"), isNotNull(businessesTable.lat), isNotNull(businessesTable.lng)];
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

router.get("/businesses/:id", businessViewLimiter, validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, id));

  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const [category, reviews, boostMap] = await Promise.all([
    db.select().from(categoriesTable).where(eq(categoriesTable.slug, business.categorySlug)).then(rows => rows[0]),
    db.select().from(reviewsTable).where(eq(reviewsTable.businessId, id)).orderBy(desc(reviewsTable.createdAt)),
    getActiveBoosts(),
  ]);

  const boost = boostMap.get(id);
  const boostInfo = boost
    ? { isActive: true, type: boost.boostType, position: boost.position }
    : null;

  db.update(businessesTable)
    .set({ clicks: sql`${businessesTable.clicks} + 1` })
    .where(eq(businessesTable.id, id))
    .execute()
    .catch(() => {});

  db.insert(businessClicksTable)
    .values({ businessId: id, type: "profile" })
    .execute()
    .catch(() => {});

  res.json({ ...business, category, reviews, boostInfo });
});

// Lista pública de produtos de um negócio (usado pela aba Vitrine do perfil).
// Filtra somente isActive=true para não vazar rascunhos do lojista.
router.get("/businesses/:id/products", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const products = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      mediaUrl: productsTable.mediaUrl,
      mediaType: productsTable.mediaType,
      whatsappLink: productsTable.whatsappLink,
      videoUrl: productsTable.videoUrl,
      videoStatus: productsTable.videoStatus,
      instagramReelUrl: productsTable.instagramReelUrl,
      sortOrder: productsTable.sortOrder,
    })
    .from(productsTable)
    .where(and(eq(productsTable.businessId, id), eq(productsTable.isActive, true)))
    .orderBy(asc(productsTable.sortOrder), desc(productsTable.id));
  res.json({ data: products });
});

router.get("/businesses/:id/reviews", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, id))
    .orderBy(desc(reviewsTable.createdAt));

  res.json({ data: reviews });
});

router.post("/businesses/:id/review", reviewLimiter, csrfProtection, validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  const { author, rating, text } = req.body;
  if (!author || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Dados inválidos: author e rating (1-5) são obrigatórios" });
    return;
  }

  const [business] = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.id, id));
  if (!business) { res.status(404).json({ error: "Negócio não encontrado" }); return; }

  const visitorId = getVisitorId(req, res);

  // H4: impedir múltiplas avaliações do mesmo visitante para o mesmo negócio
  // (até existir UNIQUE(business_id, visitor_id) via migration).
  const [duplicate] = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(
      and(
        eq(reviewsTable.businessId, id),
        eq(reviewsTable.visitorId, visitorId),
      ),
    )
    .limit(1);
  if (duplicate) {
    res.status(409).json({ error: "Você já avaliou este negócio.", code: "REVIEW_DUPLICATE" });
    return;
  }

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

  const [bizData] = await db
    .select({ name: businessesTable.name, ownerEmail: businessesTable.ownerEmail })
    .from(businessesTable)
    .where(eq(businessesTable.id, id));

  await db.update(businessesTable)
    .set({
      rating: Math.round((stats?.avg ?? 0) * 10) / 10,
      reviewsCount: stats?.count ?? 0,
    })
    .where(eq(businessesTable.id, id));

  if (bizData?.ownerEmail) {
    try {
      const tpl = emails.novaAvaliacao(bizData.name, author.trim() || "Visitante", Number(rating), (text || "").trim());
      await sendEmail(bizData.ownerEmail, tpl.subject, tpl.html);
    } catch {}
  }

  res.status(201).json({ review });
});

router.post("/businesses/:id/click-whatsapp", validateId, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

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
      .where(and(eq(businessesTable.isVisible, true), eq(businessesTable.status, "active"), sql`${businessesTable.region} is not null and ${businessesTable.region} != ''`))
      .groupBy(businessesTable.region)
      .orderBy(businessesTable.region);

    res.json({ data: rows.map(r => r.region).filter(Boolean) });
  } catch {
    res.status(500).json({ error: "Erro ao buscar regiões" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const visibleActive = and(eq(businessesTable.isVisible, true), eq(businessesTable.status, "active"));

    const [businessCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessesTable)
      .where(visibleActive);

    const [categoryCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categoriesTable);

    const [regionResult] = await db
      .select({ count: sql<number>`count(distinct ${businessesTable.region})::int` })
      .from(businessesTable)
      .where(and(visibleActive, sql`${businessesTable.region} is not null and ${businessesTable.region} != ''`));

    const [clickResult] = await db
      .select({ count: sql<number>`coalesce(sum(${businessesTable.clicks}), 0)::int` })
      .from(businessesTable)
      .where(visibleActive);

    const [lojistasResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(businessUsersTable);

    const [zonesResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(zonesTable)
      .where(eq(zonesTable.active, true));

    const total = businessCount?.count ?? 0;
    const totalLojistas = lojistasResult?.count ?? 0;
    const totalZonesCount = zonesResult?.count ?? 5;
    res.json({
      totalBusinesses: total,
      totalCategories: categoryCount?.count ?? 0,
      totalZones: totalZonesCount,
      totalUsers: totalLojistas,
      businesses: total,
      categories: categoryCount?.count ?? 0,
      regions: regionResult?.count ?? 0,
      totalClicks: clickResult?.count ?? 0,
    });
  } catch {
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

// ─── AUTOCOMPLETE ────────────────────────────────────────────────────────────
router.get("/autocomplete", async (req: Request, res: Response) => {
  const q = ((req.query.q as string) || "").trim();
  if (!q || q.length < 2) return res.json({ sponsored: [], suggestions: [] });

  const pattern = `%${q}%`;
  const activeVisible = and(
    eq(businessesTable.status, "active"),
    eq(businessesTable.isVisible, true),
  );

  const [allMatches, sponsoredBoosts] = await Promise.all([
    db.select({ id: businessesTable.id, name: businessesTable.name, categorySlug: businessesTable.categorySlug })
      .from(businessesTable)
      .where(and(activeVisible, or(ilike(businessesTable.name, pattern), ilike(businessesTable.categorySlug, pattern))!))
      .orderBy(desc(businessesTable.rating))
      .limit(12),
    // Boost home_search ordenado por posição numerada (#1 → #2 → #3 → legacy NULL).
    // Modelo novo: 3 vagas numeradas com preços decrescentes. Modelo legacy
    // (position=NULL) ainda aparece, mas DEPOIS dos numerados.
    db.select({
      businessId: searchBoostsTable.businessId,
      position: searchBoostsTable.position,
    })
      .from(searchBoostsTable)
      .where(
        and(
          eq(searchBoostsTable.boostContext as any, "home_search"),
          eq(searchBoostsTable.status, "active"),
          or(sql`${searchBoostsTable.expiresAt} IS NULL`, sql`${searchBoostsTable.expiresAt} > NOW()`)
        )
      )
      .orderBy(sql`${searchBoostsTable.position} ASC NULLS LAST`),
  ]);

  // Preserva a ordem por posição: monta a lista de sponsored seguindo a ordem dos boosts
  const matchById = new Map(allMatches.map(b => [b.id, b]));
  const sponsored: typeof allMatches = [];
  for (const b of sponsoredBoosts) {
    const m = matchById.get(b.businessId);
    if (m && !sponsored.find(s => s.id === m.id)) sponsored.push(m);
    if (sponsored.length >= 3) break;
  }
  const sponsoredSet = new Set(sponsored.map(b => b.id));
  const suggestions = allMatches.filter(b => !sponsoredSet.has(b.id)).slice(0, 6);

  res.json({ sponsored, suggestions });
});

// ─── HOME FEATURED (home_search boosts públicos) ──────────────────────────────
router.get("/home-featured", async (_req: Request, res: Response) => {
  const boosts = await db
    .select({ businessId: searchBoostsTable.businessId })
    .from(searchBoostsTable)
    .where(
      and(
        eq(searchBoostsTable.boostContext as any, "home_search"),
        eq(searchBoostsTable.status, "active"),
        or(sql`${searchBoostsTable.expiresAt} IS NULL`, sql`${searchBoostsTable.expiresAt} > NOW()`)
      )
    )
    .orderBy(sql`${searchBoostsTable.position} ASC NULLS LAST`)
    .limit(6);

  if (!boosts.length) return res.json({ data: [] });

  const ids = boosts.map(b => b.businessId);
  const businesses = await db
    .select()
    .from(businessesTable)
    .where(and(
      inArray(businessesTable.id, ids),
      eq(businessesTable.status, "active"),
      eq(businessesTable.isVisible, true),
    ));

  const ordered = ids.map(id => businesses.find(b => b.id === id)).filter(Boolean);
  res.json({ data: ordered });
});

// ─── ZONE ROUTES ──────────────────────────────────────────────────────────────
const ZONE_REGION_PATTERN: Record<string, string> = {
  norte: "%norte%",
  sul: "%sul%",
  leste: "%leste%",
  oeste: "%oeste%",
  centro: "%centro%",
};

// /zones/:zone/stats e /zones/:zone/businesses foram removidos — duplicavam
// rotas equivalentes em zones.ts (linhas 108 e 165). Use /api/zones/:slug/* lá.

router.get("/home-banners", async (_req: Request, res: Response) => {
  const { homeBannersTable } = await import("@workspace/db/schema");
  const now = new Date();
  const rows = await db
    .select({
      id: homeBannersTable.id,
      businessId: homeBannersTable.businessId,
      title: homeBannersTable.title,
      imageUrl: homeBannersTable.imageUrl,
      linkUrl: homeBannersTable.linkUrl,
    })
    .from(homeBannersTable)
    .leftJoin(businessesTable, eq(homeBannersTable.businessId, businessesTable.id))
    .where(
      and(
        eq(homeBannersTable.active, true),
        eq(homeBannersTable.status, "active"),
        or(
          sql`${homeBannersTable.endsAt} IS NULL`,
          gte(homeBannersTable.endsAt, now),
        )!,
        // Negócio precisa estar ativo e visível (ou banner sem businessId — legado)
        or(
          sql`${homeBannersTable.businessId} IS NULL`,
          and(
            eq(businessesTable.status, "active"),
            eq(businessesTable.isVisible, true),
          )!,
        )!,
      ),
    )
    .limit(2);
  res.json({ data: rows });
});

router.post("/home-banners/:id/click", async (req: Request, res: Response) => {
  const { homeBannersTable } = await import("@workspace/db/schema");
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "ID inválido" }); return; }

  const [banner] = await db.select().from(homeBannersTable).where(eq(homeBannersTable.id, id));
  if (!banner) { res.status(404).json({ error: "Banner não encontrado" }); return; }

  await db.update(homeBannersTable)
    .set({ clicks: sql`${homeBannersTable.clicks} + 1` })
    .where(eq(homeBannersTable.id, id));

  if (banner.businessId) {
    await db.update(businessesTable)
      .set({ clicks: sql`${businessesTable.clicks} + 1` })
      .where(eq(businessesTable.id, banner.businessId));
  }

  res.json({ success: true, redirectTo: banner.linkUrl || (banner.businessId ? `/negocio/${banner.businessId}` : null) });
});

export default router;
