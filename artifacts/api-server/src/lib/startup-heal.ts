import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, subscriptionsTable } from "@workspace/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { logger } from "./logger";
import { enforceProductLimitForBusiness, getProductLimitForPlan } from "./enforce-product-limits";
import { productsTable } from "@workspace/db/schema";

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

    const ids = stuck.map((s) => s.id);

    await db
      .update(businessesTable)
      .set({ isVisible: true, status: "active" })
      .where(inArray(businessesTable.id, ids));

    await db
      .update(businessUsersTable)
      .set({ documentationStatus: "approved", documentationRemainingDays: 0 })
      .where(inArray(businessUsersTable.businessId, ids));

    logger.info(
      { ids, names: stuck.map((s) => s.name) },
      `[StartupHeal] ${stuck.length} negócio(s) pago(s) que estavam invisíveis foram publicados`,
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
