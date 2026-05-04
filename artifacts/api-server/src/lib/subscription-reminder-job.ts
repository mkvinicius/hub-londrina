import { db } from "@workspace/db";
import { searchBoostsTable, homeBannersTable, businessesTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendEmail, emails } from "../services/email";
import { logger } from "./logger";

const PANEL_URL = "https://www.hublondrina.com.br/lojista/assinaturas";

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function sendBoostExpiryReminders(): Promise<void> {
  try {
    const now = new Date();
    const in8Days = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Boosts expirando em 7 dias (janela: entre 6d23h e 7d23h de agora)
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
        sql`${searchBoostsTable.expiresAt} > ${in1Day}`,
        sql`${searchBoostsTable.expiresAt} <= ${in8Days}`,
        sql`${searchBoostsTable.expiresAt} > ${in7Days} - INTERVAL '1 hour'`,
        sql`${searchBoostsTable.expiresAt} <= ${in7Days} + INTERVAL '23 hours'`,
      ));

    // Boosts expirando em 1 dia (janela: próximas 24h depois de agora)
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
        sql`${searchBoostsTable.expiresAt} > NOW()`,
        sql`${searchBoostsTable.expiresAt} <= ${in1Day} + INTERVAL '23 hours'`,
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
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSoon = await db
      .select({
        id: homeBannersTable.id,
        businessId: homeBannersTable.businessId,
        endsAt: homeBannersTable.endsAt,
      })
      .from(homeBannersTable)
      .where(and(
        eq(homeBannersTable.status, "active"),
        sql`${homeBannersTable.endsAt} IS NOT NULL`,
        sql`${homeBannersTable.endsAt} > NOW()`,
        sql`${homeBannersTable.endsAt} <= ${in7Days} + INTERVAL '23 hours'`,
      ));

    for (const banner of expiringSoon) {
      if (!banner.endsAt) continue;
      const days = daysUntil(banner.endsAt);
      if (days !== 7 && days !== 1) continue;

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

  // Dispara 10 min após inicialização, depois todo dia
  setTimeout(async () => {
    await runReminderCycle();
    setInterval(runReminderCycle, INTERVAL_MS);
  }, 10 * 60 * 1000);

  logger.info("[SubscriptionReminder] Job de lembretes agendado (diário, início em 10 min).");
}
