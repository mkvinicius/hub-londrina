import { db } from "@workspace/db";
import { searchBoostsTable, homeBannersTable, businessesTable } from "@workspace/db/schema";
import { and, eq, gt, lte, isNotNull, sql } from "drizzle-orm";
import { sendEmail, emails } from "../services/email";
import { logger } from "./logger";

const PANEL_URL = "https://www.hublondrina.com.br/lojista/plano";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function sendBoostExpiryReminders(): Promise<void> {
  try {
    const now = new Date();

    // Window for "expiring in ~7 days": expires_at between (now+6d23h) and (now+7d23h)
    const win7Start = addHours(now, 6 * 24 + 23);
    const win7End   = addHours(now, 7 * 24 + 23);

    // Window for "expiring in ~1 day": expires_at between now and (now+1d23h)
    const win1End   = addHours(now, 1 * 24 + 23);

    const expiringIn7 = await db
      .select({
        id: searchBoostsTable.id,
        businessId: searchBoostsTable.businessId,
        boostContext: searchBoostsTable.boostContext,
        expiresAt: searchBoostsTable.expiresAt,
      })
      .from(searchBoostsTable)
      .where(and(
        eq(searchBoostsTable.status, "active"),
        gt(searchBoostsTable.expiresAt, win7Start),
        lte(searchBoostsTable.expiresAt, win7End),
      ));

    const expiringIn1 = await db
      .select({
        id: searchBoostsTable.id,
        businessId: searchBoostsTable.businessId,
        boostContext: searchBoostsTable.boostContext,
        expiresAt: searchBoostsTable.expiresAt,
      })
      .from(searchBoostsTable)
      .where(and(
        eq(searchBoostsTable.status, "active"),
        gt(searchBoostsTable.expiresAt, now),
        lte(searchBoostsTable.expiresAt, win1End),
      ));

    for (const boost of [...expiringIn7, ...expiringIn1]) {
      if (!boost.expiresAt) continue;
      const days = daysUntil(boost.expiresAt);
      if (days !== 7 && days !== 1) continue;

      const [biz] = await db.select({
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
      }).from(businessesTable).where(eq(businessesTable.id, boost.businessId));

      if (!biz?.ownerEmail) continue;

      const label = boost.boostContext === "zone" ? "Destaque de Zona" : "Destaque Home + Busca";
      const tpl = emails.assinaturaExpirando(biz.ownerName || "Lojista", label, days, PANEL_URL);
      await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
      logger.info(`[SubscriptionReminder] Email enviado — boost ${boost.id} vence em ${days}d — biz=${boost.businessId}`);
    }
  } catch (err) {
    logger.error({ err }, "[SubscriptionReminder] Erro ao enviar lembretes de boost");
  }
}

async function sendBannerExpiryReminders(): Promise<void> {
  try {
    const now = new Date();

    // Window for "expiring in ~7 days"
    const win7Start = addHours(now, 6 * 24 + 23);
    const win7End   = addHours(now, 7 * 24 + 23);

    // Window for "expiring in ~1 day"
    const win1End   = addHours(now, 1 * 24 + 23);

    const expiringSoon = await db
      .select({
        id: homeBannersTable.id,
        businessId: homeBannersTable.businessId,
        endsAt: homeBannersTable.endsAt,
      })
      .from(homeBannersTable)
      .where(and(
        eq(homeBannersTable.status, "active"),
        isNotNull(homeBannersTable.endsAt),
        gt(homeBannersTable.endsAt, now),
        lte(homeBannersTable.endsAt, win7End),
      ));

    for (const banner of expiringSoon) {
      if (!banner.endsAt) continue;
      const days = daysUntil(banner.endsAt);
      if (days !== 7 && days !== 1) continue;

      // Refine: only send for the right window
      const inWin7 = banner.endsAt > win7Start && banner.endsAt <= win7End;
      const inWin1 = banner.endsAt > now && banner.endsAt <= win1End;
      if (!inWin7 && !inWin1) continue;

      const [biz] = await db.select({
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
      }).from(businessesTable).where(eq(businessesTable.id, banner.businessId));

      if (!biz?.ownerEmail) continue;

      const tpl = emails.assinaturaExpirando(biz.ownerName || "Lojista", "Banner na Home", days, PANEL_URL);
      await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
      logger.info(`[SubscriptionReminder] Email enviado — banner ${banner.id} vence em ${days}d — biz=${banner.businessId}`);
    }
  } catch (err) {
    logger.error({ err }, "[SubscriptionReminder] Erro ao enviar lembretes de banner");
  }
}

async function runReminderCycle(): Promise<void> {
  logger.info("[SubscriptionReminder] Iniciando ciclo de lembretes de assinatura...");
  await sendBoostExpiryReminders();
  await sendBannerExpiryReminders();
  logger.info("[SubscriptionReminder] Ciclo concluído.");
}

export function startSubscriptionReminderJob(): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000;

  setTimeout(async () => {
    await runReminderCycle();
    setInterval(runReminderCycle, INTERVAL_MS);
  }, 10 * 60 * 1000);

  logger.info("[SubscriptionReminder] Job de lembretes agendado (diário, início em 10 min).");
}
