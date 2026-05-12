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
// - Pentest round 4:
//   - `lat`/`lng`: coordenadas GPS exatas só são necessárias no servidor
//     (Haversine no `/businesses/nearby`). O front nunca lê — só envia a
//     posição do navegador. O endpoint `nearby` devolve `distanceKm` em
//     vez das coordenadas. Manter as coordenadas fora da resposta evita
//     stalking e raspagem do mapa do diretório.
//   - `clicks`/`whatsappClicks`: métricas internas usadas para ordenação
//     e dashboard do lojista; não aparecem no UI público.
//
// `planType` permanece exposto: o badge "Premium"/"Destaque" é informação
// visualmente pública (selo nos cards e na página do negócio), portanto
// não há segredo a esconder e o front depende dele em vários pontos.
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
  "lat",
  "lng",
  "clicks",
  "whatsappClicks",
] as const;

export function stripPrivateBusinessFields<T extends Record<string, unknown>>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const out = { ...row } as Record<string, unknown>;
  for (const f of PRIVATE_BUSINESS_FIELDS) {
    if (f in out) delete out[f];
  }
  return out as T;
}
