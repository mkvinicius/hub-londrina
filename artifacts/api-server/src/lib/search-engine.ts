// Motor de busca compartilhado entre /api/search (search.ts) e /api/autocomplete
// (businesses.ts). Mantém UMA fonte de verdade para: tratamento de acentos,
// variantes (plural/singular/aumentativo + sinônimos de categoria), os 6 campos
// pesquisados (name/description/categorySlug/address/region/tags) e o ranking de
// relevância (nome exato=100, contém=50, categoria=8, tags=6, descrição=5).
//
// Antes, autocomplete buscava só name+categorySlug com ilike nativo, enquanto a
// busca completa usava os 6 campos + variantes + ranking — gerando divergência
// (sugestão não batia com o resultado). Extrair o motor elimina essa divergência.
import { businessesTable } from "@workspace/db/schema";
import { or, sql } from "drizzle-orm";

// PLAIN must have exactly the same length as ACCENTED (48 chars).
// Bug anterior: extra 'i' entre os o's e u's causava ç→'u' e quebrava toda busca com cedilha.
export const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ";
export const PLAIN    = "aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN";

export const CATEGORY_SYNONYMS: Record<string, string[]> = {
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

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function generateSearchVariants(term: string): string[] {
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

export function unaccentLike(column: any, pattern: string) {
  return sql`translate(lower(${column}), ${ACCENTED}, ${PLAIN}) like ${pattern}`;
}

// Condição de match dos 6 campos + variantes para uma query livre.
// OR entre palavras: pelo menos UMA palavra deve ser encontrada (o ranking por
// relevância garante que matches completos apareçam primeiro). Retorna `undefined`
// quando a query é vazia (chamador decide o que fazer).
export function buildMatchCondition(q: string | undefined | null) {
  const words = (q ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;

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
  return or(...wordConditions);
}

// Score de relevância: nome exato (100) > nome contém (50) > categoria (8) >
// tags (6) > descrição (5). Para query vazia devolve `0::int`.
export function buildRelevanceScore(q: string | undefined | null) {
  if (!q || !q.trim()) return sql<number>`0::int`;
  const qNorm = stripAccents(q.toLowerCase());
  return sql<number>`(
    CASE WHEN translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}) = ${qNorm} THEN 100 ELSE 0 END +
    CASE WHEN translate(lower(${businessesTable.name}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 50 ELSE 0 END +
    CASE WHEN translate(lower(${businessesTable.categorySlug}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 8 ELSE 0 END +
    CASE WHEN translate(lower(${businessesTable.tags}::text), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 6 ELSE 0 END +
    CASE WHEN translate(lower(${businessesTable.description}), ${ACCENTED}, ${PLAIN}) LIKE ${`%${qNorm}%`} THEN 5 ELSE 0 END
  )`;
}
