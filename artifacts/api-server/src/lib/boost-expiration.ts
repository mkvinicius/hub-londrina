import { db } from "@workspace/db";
import { searchBoostsTable, businessesTable, homeBannersTable } from "@workspace/db/schema";
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

async function expireDirectBoosts() {
  try {
    const cleared = await db
      .update(businessesTable)
      .set({ boostedUntil: null })
      .where(sql`${businessesTable.boostedUntil} IS NOT NULL AND ${businessesTable.boostedUntil} < NOW()`)
      .returning({ id: businessesTable.id });

    if (cleared.length > 0) {
      logger.info(`${cleared.length} boost(s) direto(s) expirado(s)`);
    }
  } catch (err) {
    logger.error({ err }, "Erro ao expirar boosts diretos");
  }
}

async function expireHomeBanners() {
  try {
    const cleared = await db
      .update(homeBannersTable)
      .set({ active: false })
      .where(sql`${homeBannersTable.active} = true AND ${homeBannersTable.endsAt} IS NOT NULL AND ${homeBannersTable.endsAt} < NOW()`)
      .returning({ id: homeBannersTable.id });

    if (cleared.length > 0) {
      logger.info(`${cleared.length} banner(s) da home desativado(s) por vencimento`);
    }
  } catch (err) {
    logger.error({ err }, "Erro ao expirar banners da home");
  }
}

async function runExpirationCycle() {
  await expireBoosts();
  await expireDirectBoosts();
  await expireHomeBanners();
}

export function startBoostExpirationJob() {
  runExpirationCycle();
  setInterval(runExpirationCycle, 60 * 60 * 1000);
  logger.info("Job de expiração iniciado (boosts, boostedUntil, banners — intervalo: 1h)");
}
