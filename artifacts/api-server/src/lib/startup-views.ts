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
// IMPORTANTE — NÃO criar índice GIN trigram aqui (nem em runtime nem no
// schema Drizzle). O sistema de deploy do Replit faz diff do schema do
// dev DB contra produção e RASTREIA índices, mas NÃO rastreia extensões.
// Resultado: ele gera uma migration `CREATE INDEX ... gin_trgm_ops` que
// roda ANTES do app subir — quando a extensão pg_trgm ainda não existe em
// produção — e falha com "operator class gin_trgm_ops does not exist".
// A extensão só é criada aqui, em runtime (request-time já tem pg_trgm,
// então similarity() funciona). O índice é dispensável nesta escala:
// o fuzzy fallback só roda quando a busca exata retorna 0 e o dataset
// (negócios locais) é pequeno — sequential scan de similarity() é
// sub-milissegundo. Se algum dia o volume crescer, criar o índice via
// uma migration manual que faça `CREATE EXTENSION` + `CREATE INDEX` na
// mesma transação, nunca dependendo do diff automático do deploy.

export async function ensurePgTrgm(): Promise<void> {
  try {
    await db.execute(sql.raw("CREATE EXTENSION IF NOT EXISTS pg_trgm"));
    logger.info("Extensão pg_trgm garantida (fuzzy search habilitado)");
  } catch (err) {
    logger.warn({ err }, "Não foi possível criar extensão pg_trgm — fuzzy search desativado");
  }
}
