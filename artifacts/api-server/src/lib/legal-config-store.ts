// Store cacheado da config legal (lê de `legal_config`, fallback aos defaults).
// Cache em memória de 60s — invalidado em escritas via invalidateLegalConfig().

import { db } from "@workspace/db";
import { legalConfigTable } from "@workspace/db/schema";
import { LEGAL_CONFIG_DEFAULTS, CORE_KEYS } from "./legal-config";
import { logger } from "./logger";

const CACHE_TTL_MS = 60 * 1000;

let cache: Record<string, string> | null = null;
let cacheExpiresAt = 0;

function buildFromDefaults(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of CORE_KEYS) out[k] = String(LEGAL_CONFIG_DEFAULTS[k]);
  return out;
}

export function invalidateLegalConfig(): void {
  cache = null;
  cacheExpiresAt = 0;
}

export async function getLegalConfig(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now < cacheExpiresAt) return cache;

  const merged = buildFromDefaults();
  try {
    const rows = await db.select().from(legalConfigTable);
    for (const r of rows) merged[r.key] = r.value;
  } catch (err) {
    logger.warn({ err }, "[legal-config-store] Falha ao ler tabela; usando defaults");
  }
  cache = merged;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return merged;
}

export async function getLegalValue(key: string): Promise<string | undefined> {
  const cfg = await getLegalConfig();
  return cfg[key];
}

export async function listLegalConfigRows(): Promise<
  { key: string; value: string; isCore: boolean; updatedAt: Date | null; updatedBy: string | null }[]
> {
  const rows = await db.select().from(legalConfigTable);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const out: { key: string; value: string; isCore: boolean; updatedAt: Date | null; updatedBy: string | null }[] = [];
  for (const k of CORE_KEYS) {
    const r = byKey.get(k);
    out.push({
      key: k,
      value: r?.value ?? String(LEGAL_CONFIG_DEFAULTS[k]),
      isCore: true,
      updatedAt: r?.updatedAt ?? null,
      updatedBy: r?.updatedBy ?? null,
    });
  }
  for (const r of rows) {
    if (!CORE_KEYS.includes(r.key as never)) {
      out.push({
        key: r.key,
        value: r.value,
        isCore: r.isCore,
        updatedAt: r.updatedAt ?? null,
        updatedBy: r.updatedBy ?? null,
      });
    }
  }
  return out;
}

export function isCoreKey(key: string): boolean {
  return (CORE_KEYS as string[]).includes(key);
}
