import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { businessesTable, searchBoostsTable, searchAnalyticsTable } from "@workspace/db/schema";
import { or, and, eq, desc, asc, sql, ne } from "drizzle-orm";
import { SearchQueryParams } from "@workspace/api-zod";
import { stripPrivateBusinessFields } from "../lib/strip-private-business-fields";
import { NOT_DOCUMENTATION_EXPIRED } from "../lib/documentation-state";
import { searchLimiter } from "../middleware/rateLimiter";
import { makeSearchCacheKey, getSearchCache, setSearchCache } from "../lib/search-cache";

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

// PLAIN must have exactly the same length as ACCENTED (48 chars).
// Bug anterior: extra 'i' entre os o's e u's causava ç→'u' e quebrava toda busca com cedilha.
const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ";
const PLAIN    = "aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN";

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

async function getActiveBoosts(): Promise<Map<number, { position: number | null; boostType: string; monthlyBid: string }>> {
  // Zone boosts pertencem à página da zona, NÃO à busca geral.
  // Apenas home_search e category boosts aparecem como "Patrocinado" em /busca.
  const boosts = await db.select().from(searchBoostsTable).where(
    and(
      eq(searchBoostsTable.status, "active"),
      ne(searchBoostsTable.boostContext as any, "zone"),
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

router.get("/search", searchLimiter, async (req, res) => {
  // Rejeita queries absurdamente longas antes de qualquer processamento (defesa contra ReDoS e scraping criativo).
  const rawQ = req.query.q;
  if (typeof rawQ === "string" && rawQ.length > 300) {
    res.status(400).json({ error: "Termo de busca muito longo (máx. 300 caracteres).", code: "QUERY_TOO_LONG" });
    return;
  }

  const parsed = SearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parâmetros inválidos" });
    return;
  }
  const { q, region, category, zone } = parsed.data;

  // Cache em memória (60s TTL) — queries repetidas não batem no banco.
  const cacheKey = makeSearchCacheKey(q, region, category, zone);
  const cached = getSearchCache(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  // Task #77 — defesa em profundidade (RULES.md R2): exclui `expired` além de `isVisible`.
  const conditions = [ne(businessesTable.isVisible, false), eq(businessesTable.status, "active"), NOT_DOCUMENTATION_EXPIRED];

  if (zone) conditions.push(eq(businessesTable.zone, zone));

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

    // OR entre palavras: pelo menos UMA palavra deve ser encontrada.
    // Antes era AND (todas deviam coincidir), o que falhava com nomes
    // multi-palavra quando algum campo não continha todas as palavras.
    // O ranking por relevância garante que matches completos apareçam primeiro.
    conditions.push(or(...wordConditions)!);
  }

  if (region) conditions.push(eq(businessesTable.region, region));
  if (category) conditions.push(eq(businessesTable.categorySlug, category));

  const where = and(...conditions);

  // Relevance scoring: exact full-query name match > name contains full query >
  // category/tag match > description match.
  let relevanceScore = sql<number>`0::int`;
  if (q) {
    const qNorm = stripAccents(q.toLowerCase());
    relevanceScore = sql<number>`(
      CASE WHEN translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}) = ${qNorm} THEN 100 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 50 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.categorySlug}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 8 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.tags}::text), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 6 ELSE 0 END +
      CASE WHEN translate(lower(${businessesTable.description}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 5 ELSE 0 END
    )`;
  }

  const [data, countResult, boostMap] = await Promise.all([
    db
      .select()
      .from(businessesTable)
      .where(where)
      .orderBy(
        asc(PLAN_ORDER),
        desc(relevanceScore),
        desc(businessesTable.rating),
        desc(COMPLETENESS),
        desc(businessesTable.clicks),
      ),
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

  for (const rawBiz of data) {
    // Task #12 — strip campos internos (hiddenPhotos, contadores) antes de devolver.
    const biz = stripPrivateBusinessFields(rawBiz);
    const boost = boostMap.get(biz.id);
    if (boost) {
      const enriched = {
        ...biz,
        _boostType: boost.boostType,
        _boostPosition: boost.position,
        _boostBadge: "Patrocinado",
        boostInfo: { isActive: true, type: boost.boostType, position: boost.position },
      };
      if (boost.boostType === "monthly" && boost.position) {
        monthlyBoosted.push(enriched);
      } else {
        avulsoBoosted.push(enriched);
      }
    } else if (rawBiz.boostedUntil && new Date(rawBiz.boostedUntil).getTime() > now) {
      directBoosted.push({ ...biz, boostInfo: null, _boostBadge: "Impulsionado" });
    } else if (biz.planType === "premium") {
      premium.push({ ...biz, boostInfo: null });
    } else if (biz.planType === "destaque") {
      destaque.push({ ...biz, boostInfo: null });
    } else {
      free.push({ ...biz, boostInfo: null });
    }
  }

  monthlyBoosted.sort((a: any, b: any) => (a._boostPosition || 99) - (b._boostPosition || 99));
  const sortFallback = (a: any, b: any) =>
    (b.rating ?? 0) - (a.rating ?? 0) ||
    (b.completeness ?? 0) - (a.completeness ?? 0) ||
    (b.clicks ?? 0) - (a.clicks ?? 0);
  avulsoBoosted.sort(sortFallback);
  directBoosted.sort(sortFallback);
  premium.sort(sortFallback);
  destaque.sort(sortFallback);
  free.sort(sortFallback);

  const total = countResult[0]?.count ?? 0;

  // Analytics — fire-and-forget (sem await, erro silencioso).
  // Registra apenas chamadas que chegam ao banco (não cache hits).
  // Sem IP, sem usuário: somente o termo, zona e contagem.
  if (q) {
    void db.insert(searchAnalyticsTable).values({
      term: q.trim().toLowerCase().slice(0, 200),
      resultsCount: total,
      zone: zone ?? null,
    }).catch(() => {});
  }

  // Fuzzy fallback: quando a busca exata retorna 0, tenta trigramas (pg_trgm).
  //
  // Dois comportamentos distintos:
  //   1. fuzzyUsed=true  → buscamos fuzzy NO MESMO ESCOPO (zone/region/category) e
  //      encontramos resultados. Retornamos esses resultados diretamente.
  //   2. didYouMean=str  → busca exata + fuzzy no escopo ambos retornaram 0, mas há
  //      um negócio similar globalmente (sem filtros). Retornamos lista vazia +
  //      sugestão, para que o frontend mostre "Você quis dizer?" no estado vazio.
  if (total === 0 && q && q.trim().length >= 3) {
    const qNorm = stripAccents(q.toLowerCase().trim()).slice(0, 100);
    try {
      // Condições base de visibilidade (reutilizadas em ambas as queries)
      const baseConditions = [
        ne(businessesTable.isVisible, false),
        eq(businessesTable.status, "active"),
        NOT_DOCUMENTATION_EXPIRED,
        sql`similarity(translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}), ${qNorm}) > 0.2`,
      ] as const;

      // Query 1: fuzzy NO ESCOPO (respeita zone/region/category do usuário)
      const scopeConditions = [...baseConditions] as any[];
      if (zone) scopeConditions.push(eq(businessesTable.zone, zone));
      if (region) scopeConditions.push(eq(businessesTable.region, region));
      if (category) scopeConditions.push(eq(businessesTable.categorySlug, category));

      const fuzzyRowsScoped = await db
        .select()
        .from(businessesTable)
        .where(and(...scopeConditions))
        .orderBy(desc(sql`similarity(translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}), ${qNorm})`))
        .limit(8);

      if (fuzzyRowsScoped.length > 0) {
        // Encontrou resultados fuzzy no mesmo escopo → retorna como fuzzyUsed
        const fuzzyResult = {
          data: fuzzyRowsScoped.map(b => ({ ...stripPrivateBusinessFields(b), boostInfo: null })),
          total: fuzzyRowsScoped.length,
          fuzzyUsed: true,
          normalizedQuery: fuzzyRowsScoped[0]!.name,
        };
        setSearchCache(cacheKey, fuzzyResult);
        res.json(fuzzyResult);
        return;
      }

      // Query 2 (quando tinha filtros): fuzzy GLOBAL para gerar sugestão "Você quis dizer?"
      // Só executa se havia algum filtro; busca sem filtros já faria full scan global.
      if (zone || region || category) {
        const [globalSuggestion] = await db
          .select({ name: businessesTable.name })
          .from(businessesTable)
          .where(and(...baseConditions))
          .orderBy(desc(sql`similarity(translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}), ${qNorm})`))
          .limit(1);

        if (globalSuggestion) {
          // Retorna 0 resultados mas com sugestão para o estado vazio da UI
          const emptyWithHint = { data: [], total: 0, didYouMean: globalSuggestion.name };
          setSearchCache(cacheKey, emptyWithHint);
          res.json(emptyWithHint);
          return;
        }
      }
    } catch {
      // pg_trgm indisponível ou outro erro — retorna resultado vazio normalmente
    }
  }

  const result = { data: [...monthlyBoosted, ...avulsoBoosted, ...directBoosted, ...premium, ...destaque, ...free], total };
  setSearchCache(cacheKey, result);
  res.json(result);
});

export default router;
