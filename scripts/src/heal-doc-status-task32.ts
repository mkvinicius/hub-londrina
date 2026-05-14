// Task #32 — Reverte business_users.documentation_status='approved' que foi
// gravado erroneamente pelo fluxo antigo (pagamento aprovava docs).
// Recalcula a partir da realidade em business_documents:
//   - 0..2 docs (sem rejected)        → pending  (timer rodando)
//   - 3 docs / nenhum rejected        → submitted (timer pausado)
//   - qualquer rejected               → rejected
//   - 3 docs todos approved           → approved (mantém)
//
// Idempotente. Uso: pnpm --filter @workspace/scripts run heal-doc-status-task32

import { db } from "@workspace/db";
import {
  businessDocumentsTable,
  businessUsersTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const VALID_TYPES = ["personal_id", "cnpj_card", "address_proof"] as const;

async function main() {
  const candidates = await db
    .select({
      userId: businessUsersTable.id,
      businessId: businessUsersTable.businessId,
      firstLoginAt: businessUsersTable.firstLoginAt,
    })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.documentationStatus, "approved"));

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const DOCUMENTATION_DAYS = 10;

  let kept = 0;
  let recomputed = 0;

  for (const u of candidates) {
    const docs = await db
      .select({
        documentType: businessDocumentsTable.documentType,
        status: businessDocumentsTable.status,
      })
      .from(businessDocumentsTable)
      .where(eq(businessDocumentsTable.businessId, u.businessId));

    const byType = new Map(docs.map((d) => [d.documentType, d.status]));
    const allPresent = VALID_TYPES.every((t) => byType.has(t));
    const anyRejected = docs.some((d) => d.status === "rejected");
    const allApproved =
      allPresent && VALID_TYPES.every((t) => byType.get(t) === "approved");

    if (allApproved) {
      kept++;
      continue;
    }

    let newStatus: "rejected" | "submitted" | "pending" | "expired";
    let timerPaused: boolean;
    if (anyRejected) {
      newStatus = "rejected";
      timerPaused = false;
    } else if (allPresent) {
      newStatus = "submitted";
      timerPaused = true;
    } else {
      newStatus = "pending";
      timerPaused = false;
    }

    // Recalcula remainingDays a partir de firstLoginAt (idêntico ao cron).
    // Sem isso, lojistas curados ficariam com remaining=0 e o timer travado.
    let remainingDays = DOCUMENTATION_DAYS;
    if (u.firstLoginAt) {
      const daysSinceLogin = Math.floor(
        (Date.now() - new Date(u.firstLoginAt).getTime()) / ONE_DAY,
      );
      remainingDays = Math.max(0, DOCUMENTATION_DAYS - daysSinceLogin);
    }

    // Se já estourou o prazo e os docs ainda não foram aprovados, vai pra expired.
    if (remainingDays === 0 && newStatus !== "rejected") {
      newStatus = "expired";
      timerPaused = false;
    }

    await db
      .update(businessUsersTable)
      .set({
        documentationStatus: newStatus,
        documentationTimerPaused: timerPaused,
        documentationRemainingDays: remainingDays,
      })
      .where(eq(businessUsersTable.id, u.userId));

    recomputed++;
    console.log(
      `  · biz ${u.businessId}: approved → ${newStatus} (docs: ${docs.length}, rejected: ${anyRejected}, remainingDays: ${remainingDays})`,
    );
  }

  console.log(
    `\n[heal-doc-status-task32] OK — ${kept} mantidos como approved, ${recomputed} recalculados.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
