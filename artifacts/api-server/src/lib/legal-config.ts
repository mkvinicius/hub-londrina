// ============================================================================
// CONFIG LEGAL — espelho do front. Mantenha SEMPRE sincronizado com
// artifacts/hub-londrina/src/lib/legal-config.ts. Se alterar TERMS_VERSION
// aqui, todos os usuários precisarão re-aceitar no próximo login.
// ============================================================================

export const LEGAL_CONFIG = {
  COMPANY_NAME: "[RAZÃO SOCIAL DO MEI — preencher]",
  COMPANY_CNPJ: "[CNPJ — preencher]",
  COMPANY_ADDRESS: "Londrina, Paraná, Brasil",
  CONTACT_EMAIL: "contato@hublondrina.com.br",
  DPO_EMAIL: "privacidade@hublondrina.com.br",
  TERMS_VERSION: "1.0",
  LAST_UPDATED: "14/05/2026",
  RETENTION_MONTHS: 12,
  PLATFORM_NAME: "Hub Londrina",
  PLATFORM_URL: "https://www.hublondrina.com.br",
} as const;
