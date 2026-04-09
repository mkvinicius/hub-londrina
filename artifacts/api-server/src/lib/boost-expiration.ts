import { db } from "@workspace/db";
import { searchBoostsTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "./logger";

async function expireBoosts() {
  try {
    const expired = await db
      .select({ id: searchBoostsTable.id, businessId: searchBoostsTable.businessId })
      .from(searchBoostsTable)
      .where(
        and(
          eq(searchBoostsTable.status, "active"),
          eq(searchBoostsTable.boostType, "avulso"),
          sql`${searchBoostsTable.expiresAt} < NOW()`
        )
      );

    for (const boost of expired) {
      await db
        .update(searchBoostsTable)
        .set({ status: "expired", position: null })
        .where(eq(searchBoostsTable.id, boost.id));
      logger.info(`Boost expirado: businessId ${boost.businessId}`);
    }

    if (expired.length > 0) {
      logger.info(`${expired.length} boost(s) avulso(s) expirado(s)`);
    }
  } catch (err) {
    logger.error({ err }, "Erro ao verificar boosts expirados");
  }
}

export function startBoostExpirationJob() {
  expireBoosts();
  setInterval(expireBoosts, 60 * 60 * 1000);
  logger.info("Job de expiração de boosts iniciado (intervalo: 1h)");
}
