import { db } from "@workspace/db";
import { searchBoostsTable, businessesTable, homeBannersTable } from "@workspace/db/schema";
import { and, asc, eq, isNull, or, gt, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, emails } from "../services/email";

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

async function promoteWaitlist() {
  // Para cada contexto especial (zone por zona específica + home_search), conta vagas ativas
  // e promove o waitlist mais antigo se houver vaga disponível (max 6 por contexto/zona)
  try {
    const SLOTS = 6;
    const contexts: Array<{ ctx: "zone" | "home_search"; zones: (string | null)[] }> = [
      { ctx: "home_search", zones: [null] },
    ];

    // Descobre zonas que têm waitlist
    const zonesWithWaitlist = await db
      .selectDistinct({ zone: searchBoostsTable.zone })
      .from(searchBoostsTable)
      .where(and(
        eq(searchBoostsTable.boostContext, "zone"),
        eq(searchBoostsTable.status, "waitlist"),
      ));
    if (zonesWithWaitlist.length > 0) {
      contexts.push({ ctx: "zone", zones: zonesWithWaitlist.map(z => z.zone).filter((z): z is string => !!z) });
    }

    for (const { ctx, zones } of contexts) {
      for (const z of zones) {
        const slotConditions = [
          eq(searchBoostsTable.boostContext, ctx),
          eq(searchBoostsTable.status, "active"),
          or(isNull(searchBoostsTable.expiresAt), gt(searchBoostsTable.expiresAt, new Date())),
        ];
        if (ctx === "zone" && z) slotConditions.push(eq(searchBoostsTable.zone, z));
        const active = await db.select({ id: searchBoostsTable.id }).from(searchBoostsTable).where(and(...slotConditions));
        let freeSlots = SLOTS - active.length;
        if (freeSlots <= 0) continue;

        const waitlistConds = [
          eq(searchBoostsTable.boostContext, ctx),
          eq(searchBoostsTable.status, "waitlist"),
        ];
        if (ctx === "zone" && z) waitlistConds.push(eq(searchBoostsTable.zone, z));

        const queue = await db.select()
          .from(searchBoostsTable)
          .where(and(...waitlistConds))
          .orderBy(asc(searchBoostsTable.createdAt))
          .limit(freeSlots);

        for (const item of queue) {
          const startsAt = new Date();
          const expiresAt = new Date(Date.now() + (item.durationDays || 30) * 24 * 60 * 60 * 1000);
          await db.update(searchBoostsTable)
            .set({ status: "active", startsAt, expiresAt })
            .where(eq(searchBoostsTable.id, item.id));
          logger.info(`Boost promovido da fila: id=${item.id} bizId=${item.businessId} ctx=${ctx} zone=${z || "-"}`);

          try {
            const [biz] = await db.select().from(businessesTable).where(eq(businessesTable.id, item.businessId));
            if (biz?.ownerEmail) {
              const tpl = emails.boostAtivado(biz.ownerName || "Lojista", ctx, expiresAt);
              await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
            }
          } catch (emailErr) {
            logger.error({ err: emailErr }, "Erro enviando email de promoção da fila");
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Erro ao promover waitlist");
  }
}

async function runExpirationCycle() {
  await expireBoosts();
  await expireDirectBoosts();
  await expireHomeBanners();
  await promoteWaitlist();
}

export function startBoostExpirationJob() {
  runExpirationCycle();
  setInterval(runExpirationCycle, 60 * 60 * 1000);
  logger.info("Job de expiração iniciado (boosts, boostedUntil, banners — intervalo: 1h)");
}
