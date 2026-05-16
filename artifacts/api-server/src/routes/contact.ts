import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod/v4";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  contactMessagesTable,
  faqsTable,
} from "@workspace/db/schema";
import { contactMessageLimiter } from "../middleware/rateLimiter";
import { validateId, parseId } from "../middleware/validateId";
import { csrfProtection } from "../middleware/csrf";
// Apply CSRF to public POSTs too — same pattern as /auth/register.
import { logAdminAction, getReqIp, ADMIN_DEFAULT_ID } from "../lib/audit";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const FAQ_CATEGORIES = ["consumidor", "lojista", "lgpd"] as const;
const MESSAGE_STATUSES = ["new", "read", "replied", "archived"] as const;

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { role?: string };
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// ============================================================================
// PÚBLICO — FAQs
// ============================================================================
router.get("/faqs", async (req: Request, res: Response) => {
  const category = String(req.query.category || "").toLowerCase();
  const where = (FAQ_CATEGORIES as readonly string[]).includes(category)
    ? and(eq(faqsTable.isActive, true), eq(faqsTable.category, category))
    : eq(faqsTable.isActive, true);
  const rows = await db
    .select({
      id: faqsTable.id,
      category: faqsTable.category,
      question: faqsTable.question,
      answer: faqsTable.answer,
      sortOrder: faqsTable.sortOrder,
    })
    .from(faqsTable)
    .where(where)
    .orderBy(asc(faqsTable.category), asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.set("Cache-Control", "public, max-age=300");
  res.json({ data: rows });
});

// ============================================================================
// PÚBLICO — Envio de mensagem de contato
// ============================================================================
const contactMessageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
});

router.post("/contact-messages", contactMessageLimiter, csrfProtection, async (req: Request, res: Response) => {
  const parsed = contactMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
    return;
  }
  const { name, email, phone, subject, message } = parsed.data;
  await db.insert(contactMessagesTable).values({
    name,
    email,
    phone: phone || null,
    subject,
    message,
    status: "new",
    ipAddress: getReqIp(req),
  });
  res.status(201).json({ success: true });
});

// ============================================================================
// ADMIN — FAQs CRUD
// ============================================================================
router.use("/admin/faqs", adminAuth);
router.use("/admin/contact-messages", adminAuth);

router.get("/admin/faqs", async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(faqsTable)
    .orderBy(asc(faqsTable.category), asc(faqsTable.sortOrder), asc(faqsTable.id));
  res.json({ data: rows });
});

const faqCreateSchema = z.object({
  category: z.enum(FAQ_CATEGORIES),
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(4000),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const faqUpdateSchema = faqCreateSchema.partial();

router.post("/admin/faqs", csrfProtection, async (req: Request, res: Response) => {
  const parsed = faqCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const { category, question, answer, sortOrder, isActive } = parsed.data;
  const [created] = await db
    .insert(faqsTable)
    .values({
      category,
      question,
      answer,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
    })
    .returning();
  await logAdminAction(ADMIN_DEFAULT_ID, "faq.create", "faq", created.id, JSON.stringify({ category, question }), getReqIp(req));
  res.status(201).json({ data: created });
});

router.patch("/admin/faqs/:id", validateId, csrfProtection, async (req: Request, res: Response) => {
  const id = parseId(req.params.id as string);
  if (id === null) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = faqUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  const [updated] = await db
    .update(faqsTable)
    .set(updates)
    .where(eq(faqsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "FAQ não encontrada" }); return; }
  await logAdminAction(ADMIN_DEFAULT_ID, "faq.update", "faq", id, JSON.stringify(parsed.data), getReqIp(req));
  res.json({ data: updated });
});

router.delete("/admin/faqs/:id", validateId, csrfProtection, async (req: Request, res: Response) => {
  const id = parseId(req.params.id as string);
  if (id === null) { res.status(400).json({ error: "ID inválido" }); return; }
  const result = await db.delete(faqsTable).where(eq(faqsTable.id, id)).returning();
  if (result.length === 0) { res.status(404).json({ error: "FAQ não encontrada" }); return; }
  await logAdminAction(ADMIN_DEFAULT_ID, "faq.delete", "faq", id, undefined, getReqIp(req));
  res.json({ success: true });
});

// ============================================================================
// ADMIN — Mensagens recebidas
// ============================================================================
router.get("/admin/contact-messages", async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const status = String(req.query.status || "").toLowerCase();

  const where = (MESSAGE_STATUSES as readonly string[]).includes(status)
    ? eq(contactMessagesTable.status, status)
    : undefined;

  const [rows, countRow, statsRow] = await Promise.all([
    db
      .select()
      .from(contactMessagesTable)
      .where(where)
      .orderBy(desc(contactMessagesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(contactMessagesTable).where(where),
    db
      .select({
        newCount: sql<number>`count(*) filter (where ${contactMessagesTable.status} = 'new')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(contactMessagesTable),
  ]);

  res.json({
    data: rows,
    total: countRow[0]?.count ?? 0,
    page,
    limit,
    newCount: statsRow[0]?.newCount ?? 0,
    grandTotal: statsRow[0]?.total ?? 0,
  });
});

const messageUpdateSchema = z.object({
  status: z.enum(MESSAGE_STATUSES).optional(),
  adminNotes: z.string().trim().max(2000).optional().or(z.literal("")),
});

router.patch("/admin/contact-messages/:id", validateId, csrfProtection, async (req: Request, res: Response) => {
  const id = parseId(req.params.id as string);
  if (id === null) { res.status(400).json({ error: "ID inválido" }); return; }
  const parsed = messageUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.adminNotes !== undefined) updates.adminNotes = parsed.data.adminNotes || null;
  const [updated] = await db
    .update(contactMessagesTable)
    .set(updates)
    .where(eq(contactMessagesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Mensagem não encontrada" }); return; }
  await logAdminAction(ADMIN_DEFAULT_ID, "contact_message.update", "contact_message", id, JSON.stringify(parsed.data), getReqIp(req));
  res.json({ data: updated });
});

router.delete("/admin/contact-messages/:id", validateId, csrfProtection, async (req: Request, res: Response) => {
  const id = parseId(req.params.id as string);
  if (id === null) { res.status(400).json({ error: "ID inválido" }); return; }
  const result = await db.delete(contactMessagesTable).where(eq(contactMessagesTable.id, id)).returning();
  if (result.length === 0) { res.status(404).json({ error: "Mensagem não encontrada" }); return; }
  await logAdminAction(ADMIN_DEFAULT_ID, "contact_message.delete", "contact_message", id, undefined, getReqIp(req));
  res.json({ success: true });
});

export default router;
