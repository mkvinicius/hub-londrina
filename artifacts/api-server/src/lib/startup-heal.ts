import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, subscriptionsTable } from "@workspace/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { logger } from "./logger";
import { enforceProductLimitForBusiness, getProductLimitForPlan } from "./enforce-product-limits";
import { productsTable } from "@workspace/db/schema";
import { isDocumentationExpired, syncDocumentationState } from "./documentation-state";

/**
 * Backfill idempotente: cura negócios com subscription paga (destaque|premium)
 * ativa mas que continuam invisíveis. Causado pelo bug histórico em
 * `syncSubscriptionFromStripe` (stripe.ts) que só publicava o negócio quando
 * status === "pending", deixando casos com status="active" + isVisible=false
 * presos invisíveis até aprovação manual.
 *
 * Roda uma vez no startup. Não-op se nada precisa ser corrigido.
 */
export async function healPaidInvisibleBusinesses() {
  try {
    const stuck = await db
      .select({
        id: businessesTable.id,
        name: businessesTable.name,
      })
      .from(businessesTable)
      .innerJoin(subscriptionsTable, eq(subscriptionsTable.businessId, businessesTable.id))
      .where(
        and(
          inArray(subscriptionsTable.status, ["active", "trialing"]),
          inArray(subscriptionsTable.plan, ["destaque", "premium"]),
          or(eq(businessesTable.isVisible, false), eq(businessesTable.status, "pending")),
        ),
      );

    if (stuck.length === 0) return;

    // Task #63 — Gate de documentação: pagamento NÃO re-publica loja cuja
    // documentação está `expired`. Só a aprovação dos 3 docs volta a publicá-la.
    const publishable: number[] = [];
    let skippedExpired = 0;
    for (const s of stuck) {
      if (await isDocumentationExpired(s.id)) {
        skippedExpired++;
        continue;
      }
      publishable.push(s.id);
    }

    if (publishable.length > 0) {
      // Apenas publica. NÃO toca documentationStatus (trilho independente).
      await db
        .update(businessesTable)
        .set({ isVisible: true, status: "active" })
        .where(inArray(businessesTable.id, publishable));
    }

    logger.info(
      { publishable, skippedExpired },
      `[StartupHeal] ${publishable.length} negócio(s) pago(s) invisíveis publicados; ${skippedExpired} mantido(s) offline por documentação expirada`,
    );
  } catch (err) {
    logger.error({ err }, "[StartupHeal] Falha ao curar negócios pagos invisíveis");
  }
  void sql; // silence unused
}

/**
 * Task #13 — Backfill idempotente: cura negócios que sofreram downgrade
 * antes da fix da Task #8 e ainda têm produtos ativos acima do limite do
 * plano atual (visíveis no público).
 *
 * Itera todos os negócios, calcula o limite do plano atual e chama
 * `enforceProductLimitForBusiness()` quando excede. Idempotente: roda no
 * boot, no-op se nada precisa ser corrigido.
 */
export async function healOverflowingProductLimits() {
  try {
    const rows = await db
      .select({
        businessId: businessesTable.id,
        planType: businessesTable.planType,
        activeCount: sql<number>`count(${productsTable.id})::int`,
      })
      .from(businessesTable)
      .leftJoin(
        productsTable,
        and(eq(productsTable.businessId, businessesTable.id), eq(productsTable.isActive, true)),
      )
      .groupBy(businessesTable.id, businessesTable.planType);

    let businessesFixed = 0;
    let productsDeactivated = 0;

    for (const row of rows) {
      const limit = getProductLimitForPlan(row.planType);
      if (row.activeCount <= limit) continue;
      const excess = await enforceProductLimitForBusiness(row.businessId, row.planType);
      if (excess > 0) {
        businessesFixed += 1;
        productsDeactivated += excess;
      }
    }

    if (businessesFixed > 0) {
      logger.info(
        { businessesFixed, productsDeactivated },
        `[StartupHeal] ${businessesFixed} negócio(s) com produtos acima do limite do plano foram curados (${productsDeactivated} produto(s) desativado(s))`,
      );
    }
  } catch (err) {
    logger.error({ err }, "[StartupHeal] Falha ao curar negócios com produtos acima do limite");
  }
}

/**
 * Backfill idempotente: corrige `businesses.region` quando salvo errado como
 * slug ("sul", "norte", "leste", "oeste") em vez do nome de exibição
 * ("Zona Sul", "Zona Norte", etc). Causado pelo bug histórico em
 * `routes/auth.ts` que gravava `region: selectedZone` (slug) no cadastro.
 *
 * Roda uma vez no startup. Não-op se nada precisa ser corrigido.
 */
export async function healZoneRegionDisplayNames() {
  const ZONE_DISPLAY: Record<string, string> = {
    centro: "Centro",
    norte: "Zona Norte",
    sul: "Zona Sul",
    leste: "Zona Leste",
    oeste: "Zona Oeste",
  };
  try {
    let totalFixed = 0;
    for (const [slug, display] of Object.entries(ZONE_DISPLAY)) {
      const result = await db
        .update(businessesTable)
        .set({ region: display })
        .where(and(eq(businessesTable.zone, slug), eq(businessesTable.region, slug)))
        .returning({ id: businessesTable.id });
      totalFixed += result.length;
    }
    if (totalFixed > 0) {
      logger.info(
        { totalFixed },
        `[StartupHeal] ${totalFixed} negócio(s) com region salvo como slug foram corrigidos para nome de exibição`,
      );
    }
  } catch (err) {
    logger.error({ err }, "[StartupHeal] Falha ao curar regions com slug");
  }
}

/**
 * Task #63 — Backfill idempotente: reconcilia a documentação como FONTE ÚNICA
 * DE VERDADE. Para todo negócio com conta de lojista, recomputa o agregado
 * `documentationStatus`, o flag de timer e o selo `businesses.verified` a partir
 * do estado real dos documentos (`syncDocumentationState`).
 *
 * Corrige divergências históricas onde o banner do lojista dizia "aprovado"
 * mas os docs estavam só "submitted" (selo mentiroso), ou onde os 3 docs
 * estavam aprovados mas o selo público não aparecia. NÃO altera `isVisible` de
 * lojas não-aprovadas (não tira ninguém do ar retroativamente — a passagem
 * para offline acontece só no momento da expiração, no cron). Aprovações
 * completas restauram visibilidade + selo. Roda uma vez no startup.
 */
export async function healDocumentationConsistency() {
  try {
    const rows = await db
      .select({ businessId: businessUsersTable.businessId })
      .from(businessUsersTable);

    let fixed = 0;
    for (const r of rows) {
      const before = await db
        .select({
          docStatus: businessUsersTable.documentationStatus,
          verified: businessesTable.verified,
        })
        .from(businessUsersTable)
        .innerJoin(businessesTable, eq(businessesTable.id, businessUsersTable.businessId))
        .where(eq(businessUsersTable.businessId, r.businessId));
      const prev = before[0];

      await syncDocumentationState(r.businessId);

      const after = await db
        .select({
          docStatus: businessUsersTable.documentationStatus,
          verified: businessesTable.verified,
        })
        .from(businessUsersTable)
        .innerJoin(businessesTable, eq(businessesTable.id, businessUsersTable.businessId))
        .where(eq(businessUsersTable.businessId, r.businessId));
      const next = after[0];

      if (prev && next && (prev.docStatus !== next.docStatus || prev.verified !== next.verified)) {
        fixed++;
        logger.info(
          { businessId: r.businessId, from: prev, to: next },
          "[StartupHeal] Documentação reconciliada (status/selo derivados dos docs)",
        );
      }
    }

    if (fixed > 0) {
      logger.info(`[StartupHeal] ${fixed} negócio(s) tiveram documentação reconciliada`);
    }
  } catch (err) {
    logger.error({ err }, "[StartupHeal] Falha ao reconciliar documentação");
  }
}
