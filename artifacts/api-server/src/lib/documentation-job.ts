import { db } from "@workspace/db";
import { businessesTable, businessUsersTable } from "@workspace/db/schema";
import { and, eq, isNotNull, ne } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, emails } from "../services/email";
import { runOnceDaily } from "./job-checkpoint";

const ONE_DAY = 24 * 60 * 60 * 1000;
const DOCUMENTATION_DAYS = 10;

async function tickDocumentationTimers() {
  try {
    const users = await db
      .select({
        userId: businessUsersTable.id,
        businessId: businessUsersTable.businessId,
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
        remaining: businessUsersTable.documentationRemainingDays,
        firstLoginAt: businessUsersTable.firstLoginAt,
        status: businessUsersTable.documentationStatus,
      })
      .from(businessUsersTable)
      .innerJoin(businessesTable, eq(businessesTable.id, businessUsersTable.businessId))
      .where(
        and(
          ne(businessUsersTable.documentationStatus, "approved"),
          ne(businessUsersTable.documentationStatus, "expired"),
          isNotNull(businessUsersTable.firstLoginAt),
          eq(businessUsersTable.documentationTimerPaused, false),
        ),
      );

    let processed = 0;

    for (const u of users) {
      const daysSinceLogin = Math.floor(
        (Date.now() - new Date(u.firstLoginAt!).getTime()) / ONE_DAY,
      );
      const newRemaining = Math.max(0, DOCUMENTATION_DAYS - daysSinceLogin);

      if (newRemaining >= (u.remaining ?? DOCUMENTATION_DAYS)) {
        continue;
      }

      processed++;

      await db
        .update(businessUsersTable)
        .set({ documentationRemainingDays: newRemaining })
        .where(eq(businessUsersTable.id, u.userId));

      if (newRemaining > 0) {
        if (u.ownerEmail) {
          try {
            const tpl = emails.documentacaoPendente(u.ownerName || "Lojista", newRemaining);
            await sendEmail(u.ownerEmail, tpl.subject, tpl.html);
          } catch (err) {
            logger.error({ err }, "[DocJob] Falha ao enviar countdown");
          }
        }
      } else {
        // Período de 10 dias concluído — publicar o negócio automaticamente
        await db
          .update(businessUsersTable)
          .set({
            documentationStatus: "approved",
            documentationRemainingDays: 0,
          })
          .where(eq(businessUsersTable.id, u.userId));

        await db
          .update(businessesTable)
          .set({ isVisible: true })
          .where(eq(businessesTable.id, u.businessId));

        if (u.ownerEmail) {
          try {
            await sendEmail(
              u.ownerEmail,
              "Seu negócio está publicado no Hub Londrina! 🎉",
              `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <h2 style="color:#d97706">Parabéns, ${u.ownerName || "Lojista"}!</h2>
                <p>Seu negócio já está <strong>visível para todos os usuários</strong> do Hub Londrina.</p>
                <p>Acesse seu painel para acompanhar as métricas e impulsionar ainda mais sua presença.</p>
                <p><a href="https://www.hublondrina.com.br/lojista" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Acessar meu painel</a></p>
              </div>`,
            );
          } catch (err) {
            logger.error({ err }, "[DocJob] Falha ao enviar email de publicação");
          }
        }

        logger.info({ businessId: u.businessId }, "[DocJob] Negócio publicado automaticamente após 10 dias");
      }
    }

    if (processed > 0) {
      logger.info(`[DocJob] ${processed} timer(s) de documentação avançados`);
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
          eq(businessUsersTable.documentationStatus, "approved"),
        ),
      );

    const cutoffTime = cutoff.getTime();
    let count = 0;

    for (const b of expiring) {
      if (!b.ownerName) continue;
      count++;

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

    void cutoffTime;

    if (count > 0) {
      logger.info(`[DocJob] ${count} plano(s) gratuito(s) expirado(s) após 30 dias`);
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
  logger.info(
    "Job de documentação iniciado — cálculo por firstLoginAt (idempotente), intervalo: 24h",
  );
}
