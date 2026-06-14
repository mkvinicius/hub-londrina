/**
 * Cache em memória para resultados de /api/search.
 *
 * TTL de 60 segundos — queries populares (ex.: "restaurante") são servidas
 * instantaneamente sem bater no banco. Sem dependência nova (nativo Map + Date).
 *
 * Chave: q|region|category|zone (valores normalizados, vazios → string vazia).
 * O cache é invalidado automaticamente por expiração de TTL; não há invalidação
 * ativa — para o volume atual o TTL curto é suficiente.
 */

const SEARCH_CACHE_TTL_MS = 60_000;

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function makeSearchCacheKey(
  q: string | undefined,
  region: string | undefined,
  category: string | undefined,
  zone: string | undefined,
): string {
  return [q ?? "", region ?? "", category ?? "", zone ?? ""].join("|");
}

export function getSearchCache(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setSearchCache(key: string, data: unknown): void {
  if (cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { data, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
}
