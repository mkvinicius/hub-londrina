import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const CREATE_VIEW_SQL = `
  CREATE OR REPLACE VIEW business_placements_active AS
  SELECT
    b.id                          AS business_id,
    b.name,
    b.plan_type,
    b.zone,
    b.is_visible,
    CASE
      WHEN b.boosted_until IS NOT NULL AND b.boosted_until > NOW()
      THEN true ELSE false
    END                           AS has_boosted_until,
    b.boosted_until,
    b.home_featured,
    b.zone_featured,
    b.zone_featured_expires_at,
    (
      SELECT COUNT(*)::int
      FROM search_boosts sb
      WHERE sb.business_id = b.id
        AND sb.status = 'active'
        AND (sb.expires_at IS NULL OR sb.expires_at > NOW())
    )                             AS active_boosts_count,
    (
      SELECT STRING_AGG(sb.boost_context::text, ', ' ORDER BY sb.boost_context::text)
      FROM search_boosts sb
      WHERE sb.business_id = b.id
        AND sb.status = 'active'
        AND (sb.expires_at IS NULL OR sb.expires_at > NOW())
    )                             AS active_boost_contexts,
    (
      SELECT MIN(sb.expires_at)
      FROM search_boosts sb
      WHERE sb.business_id = b.id
        AND sb.status = 'active'
    )                             AS next_boost_expiry
  FROM businesses b
  WHERE b.is_visible = true
    AND (
      (b.boosted_until IS NOT NULL AND b.boosted_until > NOW())
      OR b.home_featured = true
      OR b.zone_featured = true
      OR EXISTS (
        SELECT 1
        FROM search_boosts sb
        WHERE sb.business_id = b.id
          AND sb.status = 'active'
          AND (sb.expires_at IS NULL OR sb.expires_at > NOW())
      )
    )
`;

export async function ensureViews(): Promise<void> {
  try {
    await db.execute(sql.raw(CREATE_VIEW_SQL));
    logger.info("View business_placements_active criada/atualizada");
  } catch (err) {
    logger.error({ err }, "Erro ao criar view business_placements_active");
  }
}

// Task #111 — pg_trgm é necessário para fuzzy search (similarity()).
// Idempotente: não falha se já existir. Roda em startup para garantir
// que esteja disponível antes de qualquer consulta de busca fuzzy.
//
// IMPORTANTE: o índice usa lower(name) puro (sem translate) para que o
// SQL do CREATE INDEX contenha apenas ASCII. Índices com chars acentuados
// embutidos no sql.raw() ficam registrados em pg_indexes.indexdef com
// UTF-8 bruto; o sistema de migrations do Replit lê esse campo e gera SQL
// corrompido ("unterminated quoted string") ao fazer deploy. A query de
// similarity em search.ts usa o mesmo lower(name) para que o índice seja
// utilizado pelo planner. O qNorm já é ASCII-normalizado pelo JS
// (stripAccents), então similarity(lower(name), qNorm) ≥ 0.3 cobre
// erros de digitação e variações com acento igualmente bem.

export async function ensurePgTrgm(): Promise<void> {
  try {
    await db.execute(sql.raw("CREATE EXTENSION IF NOT EXISTS pg_trgm"));
    logger.info("Extensão pg_trgm garantida");

    // Índice GIN trigram sobre lower(name) — expressão 100% ASCII.
    // Compatível com similarity(lower(name), qNorm) nas queries fuzzy.
    await db.execute(sql.raw(`
      CREATE INDEX IF NOT EXISTS businesses_name_trgm_idx
      ON businesses
      USING gin (lower(name) gin_trgm_ops)
    `));
    logger.info("Índice trigram businesses_name_trgm_idx garantido");
  } catch (err) {
    logger.warn({ err }, "Não foi possível criar extensão pg_trgm ou índice trigram — fuzzy search desativado");
  }
}
