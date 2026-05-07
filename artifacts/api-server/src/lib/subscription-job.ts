import { db } from "@workspace/db";
import { subscriptionsTable, businessesTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { sendEmail, emails } from "../services/email";
import { logger } from "./logger";
import { runOnceDaily } from "./job-checkpoint";

async function runPastDueDowngradeJob(): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const pastDueSubs = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.status, "past_due"),
          sql`${subscriptionsTable.updatedAt} < ${sevenDaysAgo}`
        )
      );

    if (pastDueSubs.length === 0) {
      logger.info("[SubscriptionJob] Nenhuma assinatura past_due há mais de 7 dias.");
      return;
    }

    logger.info(`[SubscriptionJob] ${pastDueSubs.length} assinatura(s) para fazer downgrade.`);

    for (const sub of pastDueSubs) {
      try {
        await db
          .update(businessesTable)
          .set({ planType: "free" })
          .where(eq(businessesTable.id, sub.businessId));

        await db
          .update(subscriptionsTable)
          .set({ status: "canceled" })
          .where(eq(subscriptionsTable.id, sub.id));

        const [biz] = await db
          .select({ ownerEmail: businessesTable.ownerEmail, ownerName: businessesTable.ownerName })
          .from(businessesTable)
          .where(eq(businessesTable.id, sub.businessId));

        if (biz?.ownerEmail) {
          const tpl = emails.downgradeAssinatura(biz.ownerName || "Lojista");
          await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
        }

        logger.info(`[SubscriptionJob] Downgrade concluído — businessId=${sub.businessId}`);
      } catch (err) {
        logger.error({ err }, `[SubscriptionJob] Erro ao fazer downgrade de businessId=${sub.businessId}`);
      }
    }
  } catch (err) {
    logger.error({ err }, "[SubscriptionJob] Erro no job de downgrade past_due");
  }
}

export function startSubscriptionJob(): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000;

  setTimeout(async () => {
    await runOnceDaily("subscription-job", runPastDueDowngradeJob);
    setInterval(() => runOnceDaily("subscription-job", runPastDueDowngradeJob), INTERVAL_MS);
  }, 5 * 60 * 1000);

  logger.info("[SubscriptionJob] Job de downgrade past_due agendado (intervalo: 24h, início em 5 min, checkpoint diário).");
}
