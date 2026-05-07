import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import { db } from "@workspace/db";
import { uploadBufferToGCS, serveGCSObject } from "../lib/gcsUpload";
import {
  businessesTable,
  businessUsersTable,
  businessDocumentsTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendEmail, emails } from "../services/email";
import { logger } from "../lib/logger";
import { logAdminAction, getReqIp, ADMIN_DEFAULT_ID } from "../lib/audit";

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required for documents routes");
}

const VALID_TYPES = ["personal_id", "cnpj_card", "address_proof"] as const;
type DocType = (typeof VALID_TYPES)[number];

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function extractExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = extractExt(file.originalname);
    if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas JPG, PNG, WebP ou PDF (até 10MB)"));
    }
  },
});

interface LojistaPayload {
  businessId: number;
  email: string;
  role: string;
}
interface AdminPayload {
  role: string;
}

function lojistaAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET!) as LojistaPayload;
    if (payload.role !== "lojista") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    (req as any).lojista = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET!) as AdminPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

async function validateCnpjViaReceitaws(cnpj: string): Promise<{ ok: boolean; reason?: string }> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return { ok: false, reason: "CNPJ inválido (14 dígitos)" };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (!resp.ok) return { ok: true, reason: "api_unavailable" };
    const data = (await resp.json()) as { status?: string; message?: string; situacao?: string };
    if (data.status === "ERROR") return { ok: false, reason: data.message || "CNPJ inválido" };
    if (data.situacao && data.situacao !== "ATIVA") return { ok: false, reason: `Empresa ${data.situacao.toLowerCase()}` };
    return { ok: true };
  } catch {
    return { ok: true, reason: "api_unavailable" };
  }
}

function signedUrlFor(docId: number): string {
  const token = jwt.sign({ docId, kind: "doc" }, JWT_SECRET!, { expiresIn: "1h" });
  return `/api/documents/signed/${token}`;
}

// Pausa o timer SOMENTE quando os 3 tipos esperados foram enviados (sem rejeitados pendentes)
async function recomputeDocumentationStatus(businessId: number): Promise<void> {
  const docs = await db
    .select()
    .from(businessDocumentsTable)
    .where(eq(businessDocumentsTable.businessId, businessId));

  const byType = new Map<string, (typeof docs)[number]>();
  for (const d of docs) byType.set(d.documentType, d);

  const allPresent = VALID_TYPES.every((t) => byType.has(t));
  const anyRejected = docs.some((d) => d.status === "rejected");
  const allApproved = VALID_TYPES.every((t) => byType.get(t)?.status === "approved");

  if (allApproved) {
    // tratado pela rota PATCH (não toca aqui)
    return;
  }

  if (allPresent && !anyRejected) {
    // 3 docs enviados e nenhum rejeitado → pausa timer, status submitted
    await db
      .update(businessUsersTable)
      .set({ documentationStatus: "submitted", documentationTimerPaused: true })
      .where(eq(businessUsersTable.businessId, businessId));
  } else if (anyRejected) {
    await db
      .update(businessUsersTable)
      .set({ documentationStatus: "rejected", documentationTimerPaused: false })
      .where(eq(businessUsersTable.businessId, businessId));
  } else {
    // Faltam docs → continua pendente, timer rodando
    await db
      .update(businessUsersTable)
      .set({ documentationStatus: "pending", documentationTimerPaused: false })
      .where(eq(businessUsersTable.businessId, businessId));
  }
}

// POST /api/lojista/documents — upload de documento
router.post(
  "/lojista/documents",
  lojistaAuth,
  docUpload.single("file"),
  async (req: Request, res: Response) => {
    const { businessId: rawBid } = (req as any).lojista as LojistaPayload;
    const businessId = Number(rawBid);
    if (!Number.isInteger(businessId) || businessId <= 0) {
      res.status(400).json({ error: "businessId inválido no token" });
      return;
    }

    const { documentType } = req.body as { documentType?: string };
    if (!documentType || !VALID_TYPES.includes(documentType as DocType)) {
      res.status(400).json({ error: "documentType inválido" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Arquivo não enviado" });
      return;
    }

    const ext = extractExt(req.file.originalname);
    const filename = `${documentType}-${Date.now()}${ext}`;
    // Upload para GCS em pasta privada por businessId
    // fileUrl é apenas referência interna; jamais retornado ao cliente
    const fileUrl = await uploadBufferToGCS(
      req.file.buffer,
      `documents/${businessId}`,
      filename,
      req.file.mimetype,
    );
    // Remover arquivo anterior do mesmo tipo: apenas registro no banco
    // (objetos antigos no GCS ficam órfãos — limpeza por job opcional)

    await db
      .delete(businessDocumentsTable)
      .where(
        and(
          eq(businessDocumentsTable.businessId, businessId),
          eq(businessDocumentsTable.documentType, documentType),
        ),
      );

    const [doc] = await db
      .insert(businessDocumentsTable)
      .values({
        businessId,
        documentType,
        fileUrl,
        status: "submitted",
        submittedAt: new Date(),
      })
      .returning();

    // Recalcula status do lojista — só pausa timer se tem os 3 tipos
    await recomputeDocumentationStatus(businessId);

    let cnpjAlert: string | null = null;
    if (documentType === "cnpj_card") {
      const [biz] = await db
        .select({ cnpj: businessesTable.cnpj })
        .from(businessesTable)
        .where(eq(businessesTable.id, businessId));
      if (biz?.cnpj) {
        const v = await validateCnpjViaReceitaws(biz.cnpj);
        if (!v.ok) {
          cnpjAlert = v.reason || "CNPJ não validado";
          logger.warn(
            { businessId, cnpj: biz.cnpj, reason: v.reason },
            "[Documents] CNPJ não validado via ReceitaWS — alerta admin",
          );
        }
      }
    }

    res.status(201).json({
      document: { ...doc, fileUrl: undefined, signedUrl: signedUrlFor(doc.id) },
      cnpjAlert,
    });
  },
);

// GET /api/lojista/documents — lista documentos do lojista
router.get("/lojista/documents", lojistaAuth, async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista as LojistaPayload;

  const docs = await db
    .select()
    .from(businessDocumentsTable)
    .where(eq(businessDocumentsTable.businessId, businessId));

  const [user] = await db
    .select({
      documentationStatus: businessUsersTable.documentationStatus,
      documentationRemainingDays: businessUsersTable.documentationRemainingDays,
      documentationTimerPaused: businessUsersTable.documentationTimerPaused,
      documentationDeadline: businessUsersTable.documentationDeadline,
    })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));

  res.json({
    documents: docs.map((d) => ({ ...d, fileUrl: undefined, signedUrl: signedUrlFor(d.id) })),
    documentationStatus: user?.documentationStatus ?? "pending",
    documentationRemainingDays: user?.documentationRemainingDays ?? 10,
    documentationTimerPaused: user?.documentationTimerPaused ?? false,
    documentationDeadline: user?.documentationDeadline ?? null,
  });
});

// GET /api/admin/documents — lista empresas pendentes/submetidas/rejeitadas
router.get("/admin/documents", adminAuth, async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      businessId: businessesTable.id,
      businessName: businessesTable.name,
      ownerName: businessesTable.ownerName,
      ownerEmail: businessesTable.ownerEmail,
      cnpj: businessesTable.cnpj,
      isVisible: businessesTable.isVisible,
      planFrozen: businessesTable.planFrozen,
      documentationStatus: businessUsersTable.documentationStatus,
      documentationRemainingDays: businessUsersTable.documentationRemainingDays,
      documentationTimerPaused: businessUsersTable.documentationTimerPaused,
      documentationDeadline: businessUsersTable.documentationDeadline,
      firstLoginAt: businessUsersTable.firstLoginAt,
    })
    .from(businessUsersTable)
    .innerJoin(businessesTable, eq(businessesTable.id, businessUsersTable.businessId))
    .where(
      inArray(businessUsersTable.documentationStatus, [
        "pending",
        "submitted",
        "rejected",
        "expired",
      ]),
    );

  const businessIds = rows.map((r) => r.businessId);
  const allDocs = businessIds.length
    ? await db
        .select()
        .from(businessDocumentsTable)
        .where(inArray(businessDocumentsTable.businessId, businessIds))
    : [];

  const result = rows
    .map((r) => ({
      ...r,
      documents: allDocs
        .filter((d) => d.businessId === r.businessId)
        .map((d) => ({ ...d, fileUrl: undefined, signedUrl: signedUrlFor(d.id) })),
    }))
    .sort((a, b) => (a.documentationRemainingDays ?? 99) - (b.documentationRemainingDays ?? 99));

  res.json({ items: result });
});

// PATCH /api/admin/documents/:id — aprovar/rejeitar
router.patch("/admin/documents/:id", adminAuth, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const { action, reason } = req.body as { action?: string; reason?: string };
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action deve ser 'approve' ou 'reject'" });
    return;
  }
  if (action === "reject" && !reason?.trim()) {
    res.status(400).json({ error: "Motivo da rejeição é obrigatório" });
    return;
  }

  const [doc] = await db
    .select()
    .from(businessDocumentsTable)
    .where(eq(businessDocumentsTable.id, id));
  if (!doc) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  if (action === "approve") {
    await db
      .update(businessDocumentsTable)
      .set({ status: "approved", reviewedAt: new Date(), rejectionReason: null })
      .where(eq(businessDocumentsTable.id, id));

    const allDocs = await db
      .select()
      .from(businessDocumentsTable)
      .where(eq(businessDocumentsTable.businessId, doc.businessId));
    const approvedTypes = new Set(
      allDocs.filter((d) => d.status === "approved").map((d) => d.documentType),
    );
    const allApproved = VALID_TYPES.every((t) => approvedTypes.has(t));

    if (allApproved) {
      await db
        .update(businessUsersTable)
        .set({
          documentationStatus: "approved",
          documentationTimerPaused: true,
        })
        .where(eq(businessUsersTable.businessId, doc.businessId));

      await db
        .update(businessesTable)
        .set({ isVisible: true, planFrozen: false })
        .where(eq(businessesTable.id, doc.businessId));

      const [biz] = await db
        .select({ ownerName: businessesTable.ownerName, ownerEmail: businessesTable.ownerEmail })
        .from(businessesTable)
        .where(eq(businessesTable.id, doc.businessId));
      if (biz?.ownerEmail) {
        try {
          const tpl = emails.documentacaoAprovada(biz.ownerName || "Lojista");
          await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
        } catch (err) {
          logger.error({ err }, "[Documents] Falha ao enviar email de aprovação");
        }
      }
    } else {
      // alguns aprovados mas não todos — recomputa
      await recomputeDocumentationStatus(doc.businessId);
    }

    // Sprint 4.2 — audit log: aprovação de documento
    await logAdminAction(ADMIN_DEFAULT_ID, "document.approve", "business_document", id, JSON.stringify({ businessId: doc.businessId, documentType: doc.documentType, allApproved }), getReqIp(req));

    res.json({ ok: true, allApproved });
    return;
  }

  // Rejeitar
  await db
    .update(businessDocumentsTable)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      rejectionReason: reason!.trim(),
    })
    .where(eq(businessDocumentsTable.id, id));

  await db
    .update(businessUsersTable)
    .set({
      documentationStatus: "rejected",
      documentationTimerPaused: false,
    })
    .where(eq(businessUsersTable.businessId, doc.businessId));

  const [biz] = await db
    .select({ ownerName: businessesTable.ownerName, ownerEmail: businessesTable.ownerEmail })
    .from(businessesTable)
    .where(eq(businessesTable.id, doc.businessId));
  if (biz?.ownerEmail) {
    try {
      const tpl = emails.documentacaoRejeitada(biz.ownerName || "Lojista", reason!.trim());
      await sendEmail(biz.ownerEmail, tpl.subject, tpl.html);
    } catch (err) {
      logger.error({ err }, "[Documents] Falha ao enviar email de rejeição");
    }
  }

  // Sprint 4.2 — audit log: rejeição de documento
  await logAdminAction(ADMIN_DEFAULT_ID, "document.reject", "business_document", id, JSON.stringify({ businessId: doc.businessId, documentType: doc.documentType, reason: reason!.trim() }), getReqIp(req));

  res.json({ ok: true });
});

// GET /api/documents/signed/:token — download autenticado via JWT temporário
router.get("/documents/signed/:token", async (req: Request, res: Response) => {
  const token = String(req.params.token || "");
  let payload: { docId?: number; kind?: string };
  try {
    payload = jwt.verify(token, JWT_SECRET!) as { docId?: number; kind?: string };
  } catch {
    res.status(401).json({ error: "Link expirado ou inválido" });
    return;
  }
  if (payload.kind !== "doc" || !payload.docId) {
    res.status(400).json({ error: "Token inválido" });
    return;
  }

  const [doc] = await db
    .select()
    .from(businessDocumentsTable)
    .where(eq(businessDocumentsTable.id, payload.docId));
  if (!doc) {
    res.status(404).json({ error: "Documento não encontrado" });
    return;
  }

  // doc.fileUrl é o path retornado por uploadBufferToGCS (ex: "/storage/objects/uploads/documents/<biz>/<file>")
  // Extrai o caminho dentro do bucket (sem o prefixo /storage/objects/)
  const PREFIX = "/storage/objects/";
  const gcsPath = doc.fileUrl.startsWith(PREFIX)
    ? doc.fileUrl.slice(PREFIX.length)
    : doc.fileUrl;

  const obj = await serveGCSObject(gcsPath);
  if (!obj) {
    res.status(404).json({ error: "Arquivo não encontrado" });
    return;
  }

  res.setHeader("Content-Type", obj.contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.send(obj.buffer);
});

export default router;
