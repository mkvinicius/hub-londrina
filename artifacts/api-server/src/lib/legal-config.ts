// ============================================================================
// CONFIG LEGAL — DEFAULTS / FALLBACK
// ----------------------------------------------------------------------------
// Estes valores são apenas o FALLBACK quando a tabela `legal_config` está
// vazia ou indisponível. A fonte de verdade em runtime é a tabela do banco
// (lida via getLegalConfig() em ./legal-config-store.ts) e editada no admin
// em /admin/legal. Os campos abaixo formam o conjunto CORE — não podem ser
// removidos pelo admin (apenas editados).
// ============================================================================

export const LEGAL_CONFIG_DEFAULTS = {
  COMPANY_NAME: "[RAZÃO SOCIAL DO MEI — preencher]",
  COMPANY_CNPJ: "[CNPJ — preencher]",
  COMPANY_ADDRESS: "Londrina, Paraná, Brasil",
  CONTACT_EMAIL: "contato@hublondrina.com.br",
  DPO_EMAIL: "privacidade@hublondrina.com.br",
  TERMS_VERSION: "1.0",
  LAST_UPDATED: "14/05/2026",
  RETENTION_MONTHS: "12",
  PLATFORM_NAME: "Hub Londrina",
  PLATFORM_URL: "https://www.hublondrina.com.br",
} as const;

export type LegalConfigKey = keyof typeof LEGAL_CONFIG_DEFAULTS;
export const CORE_KEYS = Object.keys(LEGAL_CONFIG_DEFAULTS) as LegalConfigKey[];
