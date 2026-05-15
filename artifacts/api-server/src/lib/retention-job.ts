// LGPD — cron de retenção. Roda 1x por dia e:
// 1. Apaga business_documents de negócios cancelados há mais de RETENTION_MONTHS
//    (do GCS e da tabela). O período cobre a obrigação fiscal de guarda.
// 2. Hard-deleta business_users que solicitaram exclusão há mais de 30 dias
//    (a anonimização imediata já zerou PII; o hard-delete encerra o ciclo).
// Idempotente via runOnceDaily — múltiplos restarts no mesmo dia rodam só 1x.

import { db } from "@workspace/db";
import {
  businessesTable,
  businessUsersTable,
  businessDocumentsTable,
} from "@workspace/db/schema";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { logger } from "./logger";
import { runOnceDaily } from "./job-checkpoint";
import { deleteGCSObject } from "./gcsUpload";
import { LEGAL_CONFIG_DEFAULTS } from "./legal-config";
import { getLegalValue } from "./legal-config-store";

async function getRetentionMonths(): Promise<number> {
  const raw = (await getLegalValue("RETENTION_MONTHS")) ?? LEGAL_CONFIG_DEFAULTS.RETENTION_MONTHS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : Number(LEGAL_CONFIG_DEFAULTS.RETENTION_MONTHS);
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HARD_DELETE_GRACE_DAYS = 30;

async function purgeOldDocuments() {
  const retentionMonths = await getRetentionMonths();
  const cutoff = new Date(
    Date.now() - retentionMonths * 30 * ONE_DAY_MS,
  );

  const expired = await db
    .select({
      id: businessDocumentsTable.id,
      businessId: businessDocumentsTable.businessId,
      fileUrl: businessDocumentsTable.fileUrl,
    })
    .from(businessDocumentsTable)
    .innerJoin(
      businessesTable,
      eq(businessesTable.id, businessDocumentsTable.businessId),
    )
    .where(
      and(
        isNotNull(businessesTable.cancelledAt),
        lt(businessesTable.cancelledAt, cutoff),
      ),
    );

  let removed = 0;
  for (const doc of expired) {
    try {
      const PREFIX = "/storage/objects/";
      const gcsPath = doc.fileUrl.startsWith(PREFIX)
        ? doc.fileUrl.slice(PREFIX.length)
        : doc.fileUrl;
      await deleteGCSObject(gcsPath).catch(() => false);
      await db
        .delete(businessDocumentsTable)
        .where(eq(businessDocumentsTable.id, doc.id));
      removed++;
    } catch (err) {
      logger.warn(
        { err, docId: doc.id },
        "[RetentionJob] Falha ao apagar documento expirado",
      );
    }
  }

  if (removed > 0) {
    logger.info(
      `[RetentionJob] ${removed} documento(s) apagado(s) após ${retentionMonths} meses do cancelamento`,
    );
  }
}

async function purgeDeletedUsers() {
  const cutoff = new Date(Date.now() - HARD_DELETE_GRACE_DAYS * ONE_DAY_MS);

  const candidates = await db
    .select({
      id: businessUsersTable.id,
      businessId: businessUsersTable.businessId,
    })
    .from(businessUsersTable)
    .where(
      and(
        isNotNull(businessUsersTable.accountDeletionRequestedAt),
        lt(businessUsersTable.accountDeletionRequestedAt, cutoff),
      ),
    );

  let purged = 0;
  for (const u of candidates) {
    try {
      await db
        .delete(businessUsersTable)
        .where(eq(businessUsersTable.id, u.id));
      purged++;
    } catch (err) {
      logger.warn(
        { err, userId: u.id },
        "[RetentionJob] Falha ao hard-deletar business_user",
      );
    }
  }

  if (purged > 0) {
    logger.info(
      `[RetentionJob] ${purged} business_user(s) hard-deletado(s) após ${HARD_DELETE_GRACE_DAYS}d do pedido de exclusão`,
    );
  }
}

async function runCycle() {
  try {
    await purgeOldDocuments();
  } catch (err) {
    logger.error({ err }, "[RetentionJob] Erro em purgeOldDocuments");
  }
  try {
    await purgeDeletedUsers();
  } catch (err) {
    logger.error({ err }, "[RetentionJob] Erro em purgeDeletedUsers");
  }
}

export function startRetentionJob() {
  const wrapped = () => runOnceDaily("retention-job", runCycle);
  wrapped();
  setInterval(wrapped, ONE_DAY_MS);
  logger.info(
    `Job de retenção LGPD iniciado — documentos: ${LEGAL_CONFIG_DEFAULTS.RETENTION_MONTHS} meses (default) · users: ${HARD_DELETE_GRACE_DAYS}d, intervalo: 24h`,
  );
}
