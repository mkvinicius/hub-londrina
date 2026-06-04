import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, businessDocumentsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

export const DOCUMENTATION_DAYS = 10;
export const VALID_DOC_TYPES = ["personal_id", "cnpj_card", "address_proof"] as const;
export type DocumentationStatus =
  | "pending"
  | "submitted"
  | "rejected"
  | "approved"
  | "expired";

export interface DocumentationSyncResult {
  status: DocumentationStatus;
  allApproved: boolean;
  anyRejected: boolean;
  verified: boolean;
  /** true quando esta sincronização trouxe a loja de volta ao ar (isVisible false→true por aprovação) */
  cameOnline: boolean;
}

/**
 * Task #63 — FONTE ÚNICA DE VERDADE da documentação.
 *
 * Deriva o agregado `business_users.documentationStatus`, o flag de timer
 * (`documentationTimerPaused`) e o selo `businesses.verified` a partir do
 * estado real dos documentos (`business_documents.status`). Chamado por TODOS
 * os pontos que mexem em documentos (upload do lojista, aprovação/rejeição do
 * admin, cron de expiração e o heal de reconciliação no startup) para que o
 * banner do lojista, os cards de admin e o selo público nunca divirjam.
 *
 * Regras de status (derivadas dos docs):
 *  - todos os 3 aprovados        → `approved`  (timer pausado)
 *  - algum rejeitado             → `rejected`  (timer corre — retoma do banco)
 *  - 3 presentes, nenhum rejeit. → `submitted` (timer pausado/“banca” os dias)
 *  - faltam docs                 → `pending`   (timer corre)
 *  - pending/rejected E sem dias → `expired`   (timer zerado → loja offline)
 *
 * Regras de `verified` (selo público): ESTRITAMENTE derivado dos documentos —
 *  `verified = true` se e somente se os 3 docs estão aprovados; qualquer outro
 *  estado (pending/submitted/rejected/expired) força `verified = false`. Não há
 *  selo manual/legado: o heal de reconciliação corrige divergências históricas.
 *
 * Visibilidade: a RE-PUBLICAÇÃO da loja (isVisible=true, status=active,
 * planFrozen=false) na aprovação completa é OPT-IN via `reopenOnApproval` e só
 * deve ser usada no caminho de aprovação final do admin. Por padrão
 * (`reopenOnApproval=false`) a sincronização é puramente uma RECONCILIAÇÃO de
 * estado documental: deriva `documentationStatus`, `documentationTimerPaused` e
 * o selo `verified`, e para estados NÃO-expirados (pending/submitted/rejected)
 * NÃO mexe em `isVisible`/`status`/`planFrozen` — assim o heal de startup e o
 * cron, que rodam para todos os negócios, não desfazem uma ocultação manual do
 * admin nem republicam lojas por engano (uma loja paga ainda dentro do prazo de
 * 10 dias segue no ar).
 *
 * EXCEÇÃO `expired` (Task #71): documentação expirada = loja OFFLINE para TODOS
 * os planos (RULES.md R2). `expired` + `isVisible=true` é estado inválido. Por
 * isso, quando o estado resolve para `expired`, a reconciliação TAMBÉM grava
 * `isVisible=false` — não apenas o cron no instante da transição. Isso fecha a
 * brecha em que uma loja que chegou a `expired` por outro caminho (heal/sync,
 * ou cuja flag nunca foi virada) continuava aparecendo no site público. NUNCA
 * republica (não toca em `isVisible` no sentido true): só a aprovação dos 3
 * docs (`reopenOnApproval:true`) volta a colocá-la no ar.
 */
export async function syncDocumentationState(
  businessId: number,
  options: { reopenOnApproval?: boolean } = {},
): Promise<DocumentationSyncResult> {
  const { reopenOnApproval = false } = options;
  const docs = await db
    .select({
      documentType: businessDocumentsTable.documentType,
      status: businessDocumentsTable.status,
    })
    .from(businessDocumentsTable)
    .where(eq(businessDocumentsTable.businessId, businessId));

  const byType = new Map<string, string>();
  for (const d of docs) byType.set(d.documentType, d.status);

  const allPresent = VALID_DOC_TYPES.every((t) => byType.has(t));
  const anyRejected = docs.some((d) => d.status === "rejected");
  const allApproved = VALID_DOC_TYPES.every((t) => byType.get(t) === "approved");

  const [user] = await db
    .select({ remaining: businessUsersTable.documentationRemainingDays })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));
  const remaining = user?.remaining ?? DOCUMENTATION_DAYS;

  let status: DocumentationStatus;
  let paused: boolean;
  if (allApproved) {
    status = "approved";
    paused = true;
  } else if (anyRejected) {
    status = "rejected";
    paused = false;
  } else if (allPresent) {
    status = "submitted";
    paused = true;
  } else {
    status = "pending";
    paused = false;
  }

  // Expiração é STICKY: uma vez que o banco de dias zera SEM os 3 docs
  // aprovados, a loja fica `expired` (offline) até a APROVAÇÃO completa do
  // admin. Reenviar/completar os documentos (`submitted`) NÃO tira do estado
  // expirado — senão `isDocumentationExpired` voltaria a false e o pagamento/
  // heal republicariam a loja sem aprovação (ver RULES.md R2). Só `allApproved`
  // escapa da expiração.
  if (!allApproved && remaining <= 0) {
    status = "expired";
    paused = false;
  }

  await db
    .update(businessUsersTable)
    .set({ documentationStatus: status, documentationTimerPaused: paused })
    .where(eq(businessUsersTable.businessId, businessId));

  let cameOnline = false;

  if (allApproved) {
    if (reopenOnApproval) {
      // Caminho de APROVAÇÃO FINAL do admin: além do selo, re-publica a loja.
      const [biz] = await db
        .select({ isVisible: businessesTable.isVisible })
        .from(businessesTable)
        .where(eq(businessesTable.id, businessId));
      await db
        .update(businessesTable)
        .set({ verified: true, isVisible: true, status: "active", planFrozen: false })
        .where(eq(businessesTable.id, businessId));
      cameOnline = biz ? !biz.isVisible : false;
    } else {
      // RECONCILIAÇÃO (heal/cron/upload): deriva só o selo. NÃO mexe em
      // `isVisible`/`status`/`planFrozen` para não desfazer ocultação manual
      // do admin nem republicar lojas por engano no boot.
      await db
        .update(businessesTable)
        .set({ verified: true })
        .where(eq(businessesTable.id, businessId));
    }
  } else {
    // `verified` é ESTRITAMENTE derivado: qualquer estado não-aprovado
    // (pending/submitted/rejected/expired) remove o selo.
    //
    // Task #71 — `expired` derruba a loja para TODOS os planos (RULES.md R2).
    // Aqui garantimos que a reconciliação (heal/cron/upload) também grave
    // `isVisible=false` quando o estado é `expired`, e não só o cron no instante
    // da transição. Estados não-expirados (pending/submitted/rejected) seguem
    // conservadores: NÃO mexem em `isVisible` (loja paga no prazo de 10 dias
    // continua no ar) e nunca republicam — só a aprovação final do admin religa.
    await db
      .update(businessesTable)
      .set(status === "expired" ? { verified: false, isVisible: false } : { verified: false })
      .where(eq(businessesTable.id, businessId));
  }

  return { status, allApproved, anyRejected, verified: allApproved, cameOnline };
}

/**
 * Task #63 — true quando o prazo de documentação da loja estourou sem
 * aprovação completa. Usado como gate de publicação no Stripe: pagamento
 * NÃO pode re-publicar uma loja cuja documentação está `expired` — só a
 * aprovação dos 3 documentos volta a colocá-la no ar.
 */
export async function isDocumentationExpired(businessId: number): Promise<boolean> {
  const [user] = await db
    .select({ status: businessUsersTable.documentationStatus })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));
  return user?.status === "expired";
}

/**
 * Task #77 — DEFESA EM PROFUNDIDADE (RULES.md R2).
 *
 * Condição SQL para os reads públicos (listagem `/api/businesses`, busca
 * `/api/search` e zonas `/api/zones/...`) excluírem lojas cuja documentação
 * está `expired`, ALÉM do filtro de `isVisible`. Como `expired` = loja OFFLINE
 * para TODOS os planos (R2) e a visibilidade depende de UM único caminho de
 * escrita gravar `isVisible=false`, esta condição é a segunda camada: se algum
 * caminho futuro esquecer o gate, a loja expirada ainda assim NÃO reaparece no
 * site público. NÃO substitui o filtro de `isVisible` — soma-se a ele.
 *
 * Subquery correlacionada: a referência a `businesses.id` resolve para o FROM
 * externo (todas as rotas públicas têm `.from(businessesTable)` sem alias).
 */
export const NOT_DOCUMENTATION_EXPIRED = sql`NOT EXISTS (
  SELECT 1 FROM ${businessUsersTable}
  WHERE ${businessUsersTable.businessId} = ${businessesTable.id}
    AND ${businessUsersTable.documentationStatus} = 'expired'
)`;
