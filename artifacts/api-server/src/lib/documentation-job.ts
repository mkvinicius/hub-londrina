import { db } from "@workspace/db";
import { businessesTable, businessUsersTable } from "@workspace/db/schema";
import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, emails } from "../services/email";
import { runOnceDaily } from "./job-checkpoint";

const ONE_DAY = 24 * 60 * 60 * 1000;

async function tickDocumentationTimers() {
  try {
    const users = await db
      .select({
        userId: businessUsersTable.id,
        businessId: businessUsersTable.businessId,
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
        remaining: businessUsersTable.documentationRemainingDays,
      })
      .from(businessUsersTable)
      .innerJoin(businessesTable, eq(businessesTable.id, businessUsersTable.businessId))
      .where(
        and(
          ne(businessUsersTable.documentationStatus, "approved"),
          isNotNull(businessUsersTable.firstLoginAt),
          eq(businessUsersTable.documentationTimerPaused, false),
        ),
      );

    for (const u of users) {
      const newRemaining = (u.remaining ?? 10) - 1;

      if (newRemaining > 0) {
        await db
          .update(businessUsersTable)
          .set({ documentationRemainingDays: newRemaining })
          .where(eq(businessUsersTable.id, u.userId));

        if (u.ownerEmail) {
          try {
            const tpl = emails.documentacaoPendente(u.ownerName || "Lojista", newRemaining);
            await sendEmail(u.ownerEmail, tpl.subject, tpl.html);
          } catch (err) {
            logger.error({ err }, "[DocJob] Falha ao enviar countdown");
          }
        }
      } else {
        // Expirou — bloqueia loja, congela plano (mantém currentPeriodEnd intacto)
        await db
          .update(businessUsersTable)
          .set({
            documentationStatus: "expired",
            documentationRemainingDays: 0,
          })
          .where(eq(businessUsersTable.id, u.userId));

        await db
          .update(businessesTable)
          .set({ isVisible: false, planFrozen: true })
          .where(eq(businessesTable.id, u.businessId));

        if (u.ownerEmail) {
          try {
            const tpl = emails.documentacaoExpirada(u.ownerName || "Lojista");
            await sendEmail(u.ownerEmail, tpl.subject, tpl.html);
          } catch (err) {
            logger.error({ err }, "[DocJob] Falha ao enviar email de bloqueio");
          }
        }

        logger.warn({ businessId: u.businessId }, "[DocJob] Documentação expirada");
      }
    }

    if (users.length > 0) {
      logger.info(`[DocJob] Processados ${users.length} timers de documentação`);
    }
  } catch (err) {
    logger.error({ err }, "[DocJob] Erro no ciclo de documentação");
  }
}

async function tickFreePlanExpiration() {
  try {
    const cutoff = new Date(Date.now() - 30 * ONE_DAY);

    const expiring = await db
      .select({
        businessId: businessesTable.id,
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
      })
      .from(businessesTable)
      .innerJoin(businessUsersTable, eq(businessUsersTable.businessId, businessesTable.id))
      .where(
        and(
          eq(businessesTable.planType, "free"),
          isNotNull(businessUsersTable.firstLoginAt),
          eq(businessesTable.isVisible, true),
          sql`${businessUsersTable.firstLoginAt} < ${cutoff.toISOString()}`,
        ),
      );

    for (const b of expiring) {
      await db
        .update(businessesTable)
        .set({ isVisible: false })
        .where(eq(businessesTable.id, b.businessId));

      if (b.ownerEmail) {
        try {
          const tpl = emails.planoGratuitoExpirando(b.ownerName || "Lojista");
          await sendEmail(b.ownerEmail, tpl.subject, tpl.html);
        } catch (err) {
          logger.error({ err }, "[DocJob] Falha ao enviar email de plano gratuito expirado");
        }
      }
    }

    if (expiring.length > 0) {
      logger.info(`[DocJob] ${expiring.length} plano(s) gratuito(s) expirado(s) após 30 dias`);
    }
  } catch (err) {
    logger.error({ err }, "[DocJob] Erro na verificação de plano gratuito");
  }
}

async function runCycle() {
  await tickDocumentationTimers();
  await tickFreePlanExpiration();
}

export function startDocumentationJob() {
  const wrappedCycle = () => runOnceDaily("documentation-job", runCycle);
  wrappedCycle();
  setInterval(wrappedCycle, ONE_DAY);
  logger.info("Job de documentação iniciado (timer + plano gratuito 30d — intervalo: 24h, checkpoint diário)");
}
