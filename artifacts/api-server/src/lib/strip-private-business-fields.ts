// Task #12 — Campos do `businesses` que NÃO devem vazar em respostas públicas.
// `hiddenPhotos` guarda fotos ocultadas em downgrade (ver
// enforcePhotoLimitForBusiness). Devolver isso na API pública anularia o
// efeito do limite por plano e expor URLs que o lojista esperava esconder.
//
// Use em todo endpoint público que faz `select()` sem whitelist (rotas em
// `routes/businesses.ts`, `routes/search.ts`, `routes/zones.ts`,
// `routes/categories.ts`).
const PRIVATE_BUSINESS_FIELDS = ["hiddenPhotos", "lastDowngradeHiddenPhotosCount", "lastDowngradeDeactivatedCount"] as const;

export function stripPrivateBusinessFields<T extends Record<string, unknown>>(row: T): T {
  if (!row || typeof row !== "object") return row;
  const out = { ...row } as Record<string, unknown>;
  for (const f of PRIVATE_BUSINESS_FIELDS) {
    if (f in out) delete out[f];
  }
  return out as T;
}
