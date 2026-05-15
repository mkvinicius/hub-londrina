// ============================================================================
// CONFIG LEGAL — front
// ----------------------------------------------------------------------------
// Os defaults abaixo são FALLBACK síncrono (componentes podem importar e usar
// imediatamente). A fonte de verdade em runtime é a tabela `legal_config` no
// banco, exposta em GET /api/legal-config (cache 5min). O hook useLegalConfig()
// busca uma vez e mescla por cima dos defaults — ou use o helper LEGAL_CONFIG
// (estático) quando a versão exata não importar (ex.: footer DPO_EMAIL).
// Para edição: /admin/legal.
// ============================================================================

import { useEffect, useState } from "react";

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

export type LegalConfig = Record<string, string>;

// Compat: preserva imports antigos de LEGAL_CONFIG. Atualizado in-place após
// o primeiro fetch — quem precisa reatividade deve usar useLegalConfig().
export const LEGAL_CONFIG: LegalConfig = { ...LEGAL_CONFIG_DEFAULTS };

let cache: LegalConfig | null = null;
let inflight: Promise<LegalConfig> | null = null;

async function fetchLegalConfig(): Promise<LegalConfig> {
  if (cache) return cache;
  if (inflight) return inflight;
  const apiBase = (import.meta as any).env?.VITE_API_URL || "";
  inflight = fetch(`${apiBase}/api/legal-config`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("legal-config fetch failed"))))
    .then((j) => {
      const data: LegalConfig = { ...LEGAL_CONFIG_DEFAULTS, ...(j?.data || {}) };
      cache = data;
      Object.assign(LEGAL_CONFIG, data);
      return data;
    })
    .catch(() => {
      const data: LegalConfig = { ...LEGAL_CONFIG_DEFAULTS };
      cache = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function invalidateLegalConfigCache(): void {
  cache = null;
}

export function useLegalConfig(): LegalConfig {
  const [cfg, setCfg] = useState<LegalConfig>(cache || LEGAL_CONFIG);
  useEffect(() => {
    let cancelled = false;
    fetchLegalConfig().then((data) => {
      if (!cancelled) setCfg(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return cfg;
}
