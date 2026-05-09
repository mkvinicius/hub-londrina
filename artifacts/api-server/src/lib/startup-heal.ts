import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, subscriptionsTable } from "@workspace/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { logger } from "./logger";

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
