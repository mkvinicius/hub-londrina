import { db } from "@workspace/db";
import { businessesTable, businessUsersTable } from "@workspace/db/schema";
import { and, eq, gt, inArray, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, emails } from "../services/email";
import { runOnceDaily } from "./job-checkpoint";
import { syncDocumentationState } from "./documentation-state";

const ONE_DAY = 24 * 60 * 60 * 1000;

// Task #63 — só envia o email de contagem regressiva nestes marcos para não
// floodar a caixa do lojista com um email por dia durante 10 dias.
const COUNTDOWN_EMAIL_DAYS = new Set([7, 3, 1]);

async function tickDocumentationTimers() {
  try {
    // Task #63 — TIMER COM BANCO DE DIAS.
    // O relógio só corre em estados `pending`/`rejected` com o timer ativo.
    // `submitted` e `approved` têm `documentationTimerPaused=true` (ver
    // documentation-state.ts), então os dias ficam "bancados": quando um doc é
    // rejeitado o lojista retoma exatamente de onde parou — nunca recalculamos
    // a partir de `firstLoginAt` (isso ignorava as pausas).
    const users = await db
      .select({
        userId: businessUsersTable.id,
        businessId: businessUsersTable.businessId,
        ownerEmail: businessesTable.ownerEmail,
        ownerName: businessesTable.ownerName,
        isVisible: businessesTable.isVisible,
        remaining: businessUsersTable.documentationRemainingDays,
        status: businessUsersTable.documentationStatus,
      })
      .from(businessUsersTable)
      .innerJoin(businessesTable, eq(businessesTable.id, businessUsersTable.businessId))
      .where(
        and(
          inArray(businessUsersTable.documentationStatus, ["pending", "rejected"]),
          isNotNull(businessUsersTable.firstLoginAt),
          eq(businessUsersTable.documentationTimerPaused, false),
          gt(businessUsersTable.documentationRemainingDays, 0),
        ),
      );

    let processed = 0;

    for (const u of users) {
      const newRemaining = Math.max(0, (u.remaining ?? 0) - 1);
      processed++;

      if (newRemaining > 0) {
        await db
          .update(businessUsersTable)
          .set({ documentationRemainingDays: newRemaining })
          .where(eq(businessUsersTable.id, u.userId));

        if (u.ownerEmail && COUNTDOWN_EMAIL_DAYS.has(newRemaining)) {
          try {
            const tpl = emails.documentacaoPendente(u.ownerName || "Lojista", newRemaining);
            await sendEmail(u.ownerEmail, tpl.subject, tpl.html);
          } catch (err) {
            logger.error({ err }, "[DocJob] Falha ao enviar countdown");
          }
        }
      } else {
        // Task #63 / Task #77 — Prazo estourou SEM documentação completa: a loja
        // fica OFFLINE independentemente do plano. A transição é derivada pela
        // FONTE ÚNICA (`syncDocumentationState`), que grava `documentationStatus`,
        // `documentationTimerPaused` e `businesses.isVisible=false` quando o estado
        // resolve para `expired` — NÃO duplicamos a escrita aqui (RULES.md R2).
        // Primeiro zeramos o banco de dias para que a fonte única enxergue
        // `remaining=0`; só a aprovação dos 3 docs religa a loja.
        await db
          .update(businessUsersTable)
          .set({ documentationRemainingDays: 0 })
          .where(eq(businessUsersTable.id, u.userId));

        const sync = await syncDocumentationState(u.businessId);

        // Email + log apenas quando o estado REALMENTE resolveu para `expired`
        // (allApproved escapa da expiração — defesa contra corrida de aprovação).
        if (sync.status === "expired") {
          if (u.ownerEmail) {
            try {
              const tpl = emails.documentacaoExpirada(u.ownerName || "Lojista");
              await sendEmail(u.ownerEmail, tpl.subject, tpl.html);
            } catch (err) {
              logger.error({ err }, "[DocJob] Falha ao enviar email de documentação expirada");
            }
          }

          logger.info(
            { businessId: u.businessId },
            "[DocJob] Documentação expirada — loja colocada OFFLINE (todos os planos) até aprovação",
          );
        }
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
    "Job de documentação iniciado — banco de dias (decremento 1/dia, pausa em submitted/approved), intervalo: 24h",
  );
}
