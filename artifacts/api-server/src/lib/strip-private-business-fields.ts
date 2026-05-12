// Task #12 + Pentest fix — Campos do `businesses` que NÃO devem vazar em
// respostas públicas.
//
// - `hiddenPhotos`/contadores de downgrade: efeitos do limite por plano.
// - PII e dados fiscais (`ownerName/Email/Phone`, `cnpj`, `razaoSocial`,
//   `nomeFantasia`): só devem aparecer em rotas autenticadas
//   (`/api/lojista/profile`, `/api/admin/businesses/:id`).
// - Estado interno de boost/aprovação (`planFrozen`, `rejectionReason`,
//   `homeFeatured`, `zoneFeatured`, `zoneFeaturedExpiresAt`,
//   `boostedUntil`): apenas o backend precisa para ordenação; o front
//   recebe o derivado em `boostInfo`.
//
// Use em todo endpoint público que faz `select()` sem whitelist (rotas em
// `routes/businesses.ts`, `routes/search.ts`, `routes/zones.ts`,
// `routes/categories.ts`).
const PRIVATE_BUSINESS_FIELDS = [
  "hiddenPhotos",
  "lastDowngradeHiddenPhotosCount",
  "lastDowngradeDeactivatedCount",
  "ownerName",
  "ownerEmail",
  "ownerPhone",
  "cnpj",
  "razaoSocial",
  "nomeFantasia",
  "planFrozen",
  "rejectionReason",
  "homeFeatured",
  "zoneFeatured",
  "zoneFeaturedExpiresAt",
  "boostedUntil",
] as const;

export function stripPrivateBusinessFields<T extends Record<string, unknown>>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const out = { ...row } as Record<string, unknown>;
  for (const f of PRIVATE_BUSINESS_FIELDS) {
    if (f in out) delete out[f];
  }
  return out as T;
}
