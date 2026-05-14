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
        planType: businessesTable.planType,
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
        // Task #32 — Prazo de 10 dias estourou SEM documentação completa.
        // Marca como `expired` e NÃO auto-aprova/publica (trilho independente
        // do pagamento). Para plano free isso mantém a loja offline; para
        // pagos a loja continua visível (R2) mas o status reflete a pendência.
        await db
          .update(businessUsersTable)
          .set({
            documentationStatus: "expired",
            documentationRemainingDays: 0,
          })
          .where(eq(businessUsersTable.id, u.userId));

        if (u.ownerEmail) {
          try {
            const planoPago = u.planType === "destaque" || u.planType === "premium";
            const tpl = emails.documentacaoExpirada(u.ownerName || "Lojista", planoPago);
            await sendEmail(u.ownerEmail, tpl.subject, tpl.html);
          } catch (err) {
            logger.error({ err }, "[DocJob] Falha ao enviar email de documentação expirada");
          }
        }

        logger.info({ businessId: u.businessId }, "[DocJob] Documentação marcada como expirada após 10 dias sem envio");
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
