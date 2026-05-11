import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { loginLimiter } from "../middleware/rateLimiter";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { validateId, parseId } from "../middleware/validateId";
import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, productsTable, businessClicksTable, reviewsTable, searchBoostsTable, subscriptionsTable, homeBannersTable, supportTicketsTable, vitrineBoostsTable } from "@workspace/db/schema";
import { eq, sql, and, gte, lte, desc, asc, or } from "drizzle-orm";
import { uploadBufferToGCS, deleteGCSObject } from "../lib/gcsUpload";
import { vitrineSlotLockKey } from "../lib/boost-locks";
import { generatePdfReport } from "../lib/pdf-report.js";
import Stripe from "stripe";
import { businessDocumentsTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripeClient: Stripe | null = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" })
  : null;

const router: IRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required for lojista routes");
}

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function imageFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIMES.includes(file.mimetype) && ALLOWED_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Apenas imagens JPG, PNG, WebP e GIF são permitidas"));
  }
}

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: imageFilter });

interface LojistaPayload { businessId: number; email: string; role: string }

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

// H6: rota legacy desativada. Bypassava email verification, CNPJ check,
// rate limit, CSRF e marcava isVisible=true sem aprovação. Use /api/auth/register.
router.post("/lojista/register", (_req: Request, res: Response) => {
  res.status(410).json({
    error: "Rota descontinuada. Use POST /api/auth/register.",
    code: "ENDPOINT_DEPRECATED",
  });
});

router.post("/lojista/login", loginLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const [user] = await db
    .select()
    .from(businessUsersTable)
    .where(eq(businessUsersTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }

  // Registrar primeiro login (timer de documentação já iniciado no cadastro)
  const now = new Date();
  if (!user.firstLoginAt) {
    await db
      .update(businessUsersTable)
      .set({ firstLoginAt: now, lastLoginAt: now })
      .where(eq(businessUsersTable.id, user.id));
  } else {
    await db
      .update(businessUsersTable)
      .set({ lastLoginAt: now })
      .where(eq(businessUsersTable.id, user.id));
  }

  const token = jwt.sign(
    { businessId: user.businessId, email: user.email, role: "lojista" },
    JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({ token, businessId: user.businessId });
});

router.use("/lojista", lojistaAuth);

router.get("/lojista/profile", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const [boost] = await db.select().from(searchBoostsTable).where(
    and(
      eq(searchBoostsTable.businessId, businessId),
      eq(searchBoostsTable.status, "active"),
      or(
        sql`${searchBoostsTable.expiresAt} IS NULL`,
        sql`${searchBoostsTable.expiresAt} > NOW()`
      )
    )
  );

  const [userRecord] = await db
    .select({
      documentationRemainingDays: businessUsersTable.documentationRemainingDays,
      documentationStatus: businessUsersTable.documentationStatus,
      documentationDeadline: businessUsersTable.documentationDeadline,
    })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));

  res.json({
    ...business,
    _documentationDaysLeft: userRecord?.documentationRemainingDays ?? null,
    _documentationStatus: userRecord?.documentationStatus ?? null,
    _documentationDeadline: userRecord?.documentationDeadline ?? null,
    _boost: boost ? {
      boostType: boost.boostType,
      position: boost.position,
      expiresAt: boost.expiresAt,
    } : null,
  });
});

router.get("/lojista/boost-positions", async (_req: Request, res: Response) => {
  const BID_MAP: Record<number, number> = { 1: 149, 2: 119, 3: 99, 4: 79, 5: 59 };
  const activeMonthly = await db
    .select({ position: searchBoostsTable.position })
    .from(searchBoostsTable)
    .where(and(
      eq(searchBoostsTable.status, "active"),
      eq(searchBoostsTable.boostType, "monthly"),
      or(
        sql`${searchBoostsTable.expiresAt} IS NULL`,
        sql`${searchBoostsTable.expiresAt} > NOW()`
      )
    ));
  const occupiedPositions = new Set(activeMonthly.map(b => b.position));
  const positions = [1, 2, 3, 4, 5].map(p => ({
    position: p,
    bid: BID_MAP[p],
    occupied: occupiedPositions.has(p),
  }));
  res.json({ positions });
});

router.patch("/lojista/profile", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const allowed = [
    "name", "description", "phone", "whatsapp", "hours",
    "cnpj", "ownerName", "ownerPhone",
    "cep", "street", "number", "neighborhood",
    "instagram", "website", "zone", "categorySlug",
    "paymentMethods", "tags", "videoUrl",
    "razaoSocial", "nomeFantasia",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));
  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  if (updates.razaoSocial) {
    const [existing] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(and(
        sql`LOWER(${businessesTable.razaoSocial}) = LOWER(${updates.razaoSocial as string})`,
        sql`${businessesTable.id} != ${businessId}`
      ));
    if (existing) {
      res.status(400).json({ error: "Já existe um negócio cadastrado com essa razão social.", field: "razaoSocial" });
      return;
    }
  }

  const plan = business.planType;

  if (plan === "free" && (updates.instagram !== undefined || updates.website !== undefined)) {
    res.status(403).json({ error: "Instagram e Website disponíveis a partir do plano Destaque", code: "PLAN_REQUIRED", requiredPlan: "destaque", currentPlan: plan });
    return;
  }

  if (plan !== "premium" && updates.videoUrl !== undefined) {
    res.status(403).json({ error: "Vídeo disponível apenas no plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: plan });
    return;
  }

  if (updates.zone) {
    const validZones = ["centro", "norte", "sul", "leste", "oeste"];
    if (!validZones.includes(updates.zone as string)) {
      res.status(400).json({ error: "Zona inválida" });
      return;
    }
  }

  const result = await db
    .update(businessesTable)
    .set(updates)
    .where(eq(businessesTable.id, businessId))
    .returning();

  res.json(result[0]);
});

// Logo e banner são identidade visual básica — disponíveis em TODOS os planos
// (inclusive Gratuito). Diferenciais Premium estão em vitrine, vídeo, boost
// e métricas avançadas, não em poder mostrar uma foto de perfil.
router.post("/lojista/upload/logo", memoryUpload.single("file"), async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `logo-${Date.now()}${ext}`;
  const logoUrl = await uploadBufferToGCS(req.file.buffer, "logos", filename, req.file.mimetype);
  await db.update(businessesTable).set({ logoUrl }).where(eq(businessesTable.id, businessId));
  res.json({ logoUrl });
});

router.post("/lojista/upload/banner", memoryUpload.single("file"), async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `banner-${Date.now()}${ext}`;
  const bannerUrl = await uploadBufferToGCS(req.file.buffer, "banners", filename, req.file.mimetype);
  await db.update(businessesTable).set({ bannerUrl }).where(eq(businessesTable.id, businessId));
  res.json({ bannerUrl });
});

router.post("/lojista/upload/photo", memoryUpload.single("file"), async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }

  const [business] = await db
    .select({ photos: businessesTable.photos, planType: businessesTable.planType })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const currentPhotos = business.photos || [];
  const limits: Record<string, number> = { free: 1, destaque: 10, premium: 999 };
  const limit = limits[business.planType] || 1;

  if (currentPhotos.length >= limit) {
    res.status(400).json({ error: `Limite de ${limit} foto(s) atingido para o plano ${business.planType}` });
    return;
  }

  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `photo-${Date.now()}${ext}`;
  const photoUrl = await uploadBufferToGCS(req.file.buffer, "photos", filename, req.file.mimetype);
  const newPhotos = [...currentPhotos, photoUrl];

  await db
    .update(businessesTable)
    .set({ photos: newPhotos })
    .where(eq(businessesTable.id, businessId));

  res.json({ photoUrl, totalPhotos: newPhotos.length });
});

router.delete("/lojista/photos/:index", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const idx = Number(req.params.index);

  const [business] = await db
    .select({ photos: businessesTable.photos })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!business) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  const photos = business.photos || [];
  if (idx < 0 || idx >= photos.length) {
    res.status(400).json({ error: "Índice inválido" });
    return;
  }

  const newPhotos = photos.filter((_: string, i: number) => i !== idx);

  await db
    .update(businessesTable)
    .set({ photos: newPhotos })
    .where(eq(businessesTable.id, businessId));

  // Uploads vivem no GCS — apenas removemos a referência no DB.
  // Limpeza de objetos órfãos no bucket é responsabilidade de um job separado.
  res.json({ photos: newPhotos });
});

router.get("/lojista/cep/:cep", async (req: Request, res: Response) => {
  const cep = req.params.cep.replace(/\D/g, "");
  if (cep.length !== 8) {
    res.status(400).json({ error: "CEP inválido" });
    return;
  }

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await resp.json() as { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean };
    if (data.erro) {
      res.status(404).json({ error: "CEP não encontrado" });
      return;
    }
    res.json({
      street: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    });
  } catch {
    res.status(500).json({ error: "Erro ao consultar CEP" });
  }
});

router.patch("/lojista/location", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const { cep, street, number, neighborhood } = req.body;

  if (!street || !number || !neighborhood) {
    res.status(400).json({ error: "Rua, número e bairro são obrigatórios" });
    return;
  }

  let lat: string | null = null;
  let lng: string | null = null;

  try {
    const q = `${street}, ${number}, ${neighborhood}, Londrina, PR, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "HubLondrina/1.0" },
    });
    const results = await resp.json() as Array<{ lat: string; lon: string }>;
    if (results.length > 0) {
      lat = results[0].lat;
      lng = results[0].lon;
    }
  } catch {
    // geocoding failed silently
  }

  const address = `${street}, ${number} - ${neighborhood}, Londrina`;

  const updates: Record<string, unknown> = {
    cep: cep || null,
    street,
    number,
    neighborhood,
    address,
    city: "Londrina",
    state: "PR",
  };
  if (lat) updates.lat = lat;
  if (lng) updates.lng = lng;

  await db.update(businessesTable).set(updates).where(eq(businessesTable.id, businessId));

  res.json({ lat, lng, address });
});

// Instagram embeds (Premium) — lista de URLs públicas (post/reel/tv) que aparecem
// na aba Instagram do perfil público via blockquote oEmbed.
//
// Validação estrita: parse via URL, força HTTPS, host exato instagram.com (com ou
// sem www), e pathname /p|/reel|/tv/<shortcode>/ (shortcode = [A-Za-z0-9_-]+).
// Normaliza para forma canônica: https://www.instagram.com/<type>/<code>/
// (sem query string nem fragmento) — o embed.js do Instagram não precisa deles
// e mantê-los só amplia a superfície de input para o script third-party.
const INSTAGRAM_SHORTCODE_RE = /^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/;
const INSTAGRAM_MAX_POSTS = 12;

function canonicalizeInstagramUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try { u = new URL(trimmed); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host !== "instagram.com" && host !== "www.instagram.com") return null;
  const m = u.pathname.match(INSTAGRAM_SHORTCODE_RE);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/`;
}

router.patch("/lojista/instagram-posts", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const { posts } = req.body as { posts?: unknown };

  if (!Array.isArray(posts)) {
    res.status(400).json({ error: "Campo 'posts' deve ser um array de URLs" });
    return;
  }
  if (posts.length > INSTAGRAM_MAX_POSTS) {
    res.status(400).json({ error: `Máximo ${INSTAGRAM_MAX_POSTS} posts permitidos`, code: "INSTAGRAM_LIMIT" });
    return;
  }

  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of posts) {
    if (typeof raw === "string" && raw.trim() === "") continue;
    const canon = canonicalizeInstagramUrl(raw);
    if (!canon) {
      res.status(400).json({ error: `URL inválida: ${String(raw)}. Use links do Instagram (post/reel/tv).`, code: "INVALID_INSTAGRAM_URL" });
      return;
    }
    if (seen.has(canon)) continue;
    seen.add(canon);
    cleaned.push(canon);
  }

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz) { res.status(404).json({ error: "Negócio não encontrado" }); return; }
  if (biz.planType !== "premium") {
    res.status(403).json({ error: "Aba Instagram disponível apenas no plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz.planType });
    return;
  }

  await db.update(businessesTable).set({ instagramPosts: cleaned } as any).where(eq(businessesTable.id, businessId));
  res.json({ posts: cleaned });
});

router.get("/lojista/products", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, businessId))
    .orderBy(asc(productsTable.sortOrder), desc(productsTable.createdAt));
  res.json({ data: products });
});

// Sanitiza link de WhatsApp informado pelo lojista. Aceita só wa.me / api.whatsapp.com
// (https). Bloqueia javascript:, data:, e qualquer outro domínio para evitar XSS/phishing
// quando o link é renderizado como href no perfil público (vitrine).
function sanitizeWhatsappLink(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (host === "wa.me" || host === "api.whatsapp.com" || host === "whatsapp.com") {
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
}

// Limite de fotos por produto, por plano (Task #7).
//   free      → 0 (não cadastra produtos novos)
//   destaque  → 5 fotos
//   premium   → 8 fotos
const PRODUCT_IMAGE_LIMITS: Record<string, number> = { free: 0, destaque: 5, premium: 8 };

// Sanitiza array de URLs de imagens. Aceita só strings http(s) ou paths
// relativos (/storage/...). Aplica limite por plano.
function sanitizeImageList(raw: unknown, plan: string): string[] | { error: string } {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return { error: "Campo 'images' deve ser um array" };
  const cleaned: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    if (!/^(https?:\/\/|\/)/i.test(t)) continue;
    cleaned.push(t);
  }
  const limit = PRODUCT_IMAGE_LIMITS[plan] ?? 0;
  if (cleaned.length > limit) {
    return { error: `Limite de ${limit} fotos por produto no plano ${plan}.` };
  }
  return cleaned;
}

router.post("/lojista/products", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const { name, description, price, mediaUrl, mediaType, whatsappLink, videoUrl, instagramReelUrl, quantity, images, video360Url } = req.body;

  if (!name) {
    res.status(400).json({ error: "Nome do produto é obrigatório" });
    return;
  }

  if (whatsappLink && !sanitizeWhatsappLink(whatsappLink)) {
    res.status(400).json({ error: "Link de WhatsApp inválido. Use https://wa.me/...", code: "INVALID_WHATSAPP_LINK" });
    return;
  }

  let canonicalReel: string | null = null;
  if (instagramReelUrl) {
    canonicalReel = canonicalizeInstagramUrl(instagramReelUrl);
    if (!canonicalReel) {
      res.status(400).json({ error: "Link do Instagram inválido. Use https://www.instagram.com/reel/... ou /p/...", code: "INVALID_INSTAGRAM_URL" });
      return;
    }
  }

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }

  // Limites de produtos/vitrine por plano: Gratuito=0, Base/Destaque=6, Premium=10.
  const PRODUCT_LIMITS: Record<string, number> = { free: 0, destaque: 6, premium: 10 };
  const limit = PRODUCT_LIMITS[biz.planType] ?? 0;
  if (limit === 0) {
    res.status(403).json({ error: "Cadastro de produtos disponível nos planos Base e Premium", code: "PLAN_REQUIRED", requiredPlan: "destaque", currentPlan: biz.planType });
    return;
  }
  const [{ count: existing }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.businessId, businessId));
  if (existing >= limit) {
    res.status(400).json({
      error: `Limite de ${limit} produto(s) atingido para o plano ${biz.planType}. Faça upgrade para Premium para cadastrar mais.`,
      code: "PRODUCT_LIMIT_REACHED",
      currentPlan: biz.planType,
      limit,
    });
    return;
  }

  const parsedQty = quantity === undefined || quantity === null || quantity === "" ? null : Number.parseInt(String(quantity), 10);
  const safeQty = parsedQty !== null && Number.isFinite(parsedQty) && parsedQty >= 0 ? parsedQty : null;

  const imagesResult = sanitizeImageList(images, biz.planType);
  if (!Array.isArray(imagesResult)) {
    res.status(400).json({ error: imagesResult.error, code: "PRODUCT_IMAGE_LIMIT" });
    return;
  }
  // Vídeo 360° é exclusivo Premium (gating aplicado também no PATCH).
  if (video360Url && biz.planType !== "premium") {
    res.status(403).json({ error: "Vídeo 360° é exclusivo do plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz.planType });
    return;
  }
  // Sincroniza mediaUrl/Type com a primeira foto da galeria quando enviada.
  const finalMediaUrl = imagesResult.length > 0 ? imagesResult[0] : (mediaUrl || null);
  const finalMediaType = imagesResult.length > 0 ? "image" : (mediaType || null);

  const [product] = await db
    .insert(productsTable)
    .values({
      businessId,
      name,
      description: description || null,
      price: price || null,
      mediaUrl: finalMediaUrl,
      mediaType: finalMediaType,
      images: imagesResult,
      video360Url: video360Url || null,
      whatsappLink: sanitizeWhatsappLink(whatsappLink),
      videoUrl: videoUrl || null,
      instagramReelUrl: canonicalReel,
      // R11 — vídeo entra como pending; admin precisa aprovar antes de aparecer na vitrine
      videoStatus: videoUrl ? "pending" : "none",
      quantity: safeQty,
    })
    .returning();

  res.json(product);
});

router.patch("/lojista/products/reorder", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const items = req.body as Array<{ id: number; sortOrder: number }>;

  if (!Array.isArray(items)) {
    res.status(400).json({ error: "Array de items esperado" });
    return;
  }

  // Reorder permitido em qualquer plano (incluindo Gratuito) para gerenciar produtos migrados.
  await Promise.all(
    items.map((item) =>
      db
        .update(productsTable)
        .set({ sortOrder: item.sortOrder })
        .where(and(eq(productsTable.id, item.id), eq(productsTable.businessId, businessId)))
    )
  );

  res.json({ success: true });
});

router.patch("/lojista/products/:id", validateId, async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const id = parseInt(req.params.id, 10);

  // Lojista pode editar/deletar produtos existentes mesmo no plano Gratuito
  // (caso tenha produtos migrados do antigo upload de fotos).
  const allowed = ["name", "description", "price", "mediaUrl", "mediaType", "whatsappLink", "isActive", "sortOrder", "videoUrl", "instagramReelUrl", "quantity", "images", "video360Url"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Plan-aware validations para galeria e vídeo 360°.
  if ("images" in updates || "video360Url" in updates) {
    const [biz] = await db
      .select({ planType: businessesTable.planType })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    if (!biz) {
      res.status(404).json({ error: "Negócio não encontrado" });
      return;
    }
    // Estado atual do produto para detectar "no-op" — preserva o caminho de
    // edição em planos restritos (ex.: free editando nome/preço de produto
    // migrado), em que o frontend reenvia o form inteiro mas a galeria/360
    // não mudaram. Sem isso, free seria bloqueado pelo limite de 0 fotos.
    const [existing] = await db
      .select({ images: productsTable.images, video360Url: productsTable.video360Url })
      .from(productsTable)
      .where(and(eq(productsTable.id, id), eq(productsTable.businessId, businessId)));
    if (!existing) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    if ("images" in updates) {
      const sanitized = sanitizeImageList(updates.images, "premium"); // só limpa formato
      if (!Array.isArray(sanitized)) {
        res.status(400).json({ error: sanitized.error, code: "PRODUCT_IMAGE_LIMIT" });
        return;
      }
      const currentImages = existing.images ?? [];
      const sameImages = sanitized.length === currentImages.length
        && sanitized.every((u, i) => u === currentImages[i]);
      if (!sameImages) {
        // Mudança real → aplica gating do plano atual.
        const limit = PRODUCT_IMAGE_LIMITS[biz.planType] ?? 0;
        if (sanitized.length > limit) {
          res.status(400).json({
            error: `Limite de ${limit} fotos por produto no plano ${biz.planType}.`,
            code: "PRODUCT_IMAGE_LIMIT",
          });
          return;
        }
        updates.images = sanitized;
        // Cover sync determinístico: mediaUrl/Type SEMPRE refletem images[0]
        // (ou null se array vazio), ignorando qualquer mediaUrl no mesmo
        // payload — propaga reorder/troca de capa sem race de campos.
        if (sanitized.length > 0) {
          updates.mediaUrl = sanitized[0];
          updates.mediaType = "image";
        } else if (!("mediaUrl" in req.body)) {
          updates.mediaUrl = null;
          updates.mediaType = null;
        }
      } else {
        // No-op: remove do update para não validar gates contra valor inalterado.
        delete updates.images;
      }
    }
    if ("video360Url" in updates) {
      const incoming = (updates.video360Url as string | null | undefined) || null;
      if (incoming === (existing.video360Url ?? null)) {
        // No-op: preserva edição em outros planos sem reaplicar gating.
        delete updates.video360Url;
      } else {
        if (incoming && biz.planType !== "premium") {
          res.status(403).json({ error: "Vídeo 360° é exclusivo do plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz.planType });
          return;
        }
        updates.video360Url = incoming;
      }
    }
  }
  if ("quantity" in updates) {
    const v = updates.quantity;
    if (v === null || v === "") {
      updates.quantity = null;
    } else {
      const n = Number.parseInt(String(v), 10);
      updates.quantity = Number.isFinite(n) && n >= 0 ? n : null;
    }
  }
  if ("whatsappLink" in updates) {
    const sanitized = sanitizeWhatsappLink(updates.whatsappLink);
    if (updates.whatsappLink && !sanitized) {
      res.status(400).json({ error: "Link de WhatsApp inválido. Use https://wa.me/...", code: "INVALID_WHATSAPP_LINK" });
      return;
    }
    updates.whatsappLink = sanitized;
  }
  if ("instagramReelUrl" in updates) {
    if (updates.instagramReelUrl) {
      const canon = canonicalizeInstagramUrl(updates.instagramReelUrl);
      if (!canon) {
        res.status(400).json({ error: "Link do Instagram inválido. Use https://www.instagram.com/reel/... ou /p/...", code: "INVALID_INSTAGRAM_URL" });
        return;
      }
      updates.instagramReelUrl = canon;
    } else {
      updates.instagramReelUrl = null;
    }
  }
  // R11 — qualquer mudança de videoUrl (incluindo remoção) reinicia o ciclo de aprovação
  if ("videoUrl" in updates) {
    updates.videoStatus = updates.videoUrl ? "pending" : "none";
    updates.videoApprovedAt = null;
    updates.videoRejectionReason = null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }

  const result = await db
    .update(productsTable)
    .set(updates)
    .where(and(eq(productsTable.id, id), eq(productsTable.businessId, businessId)))
    .returning();

  if (result.length === 0) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }
  res.json(result[0]);
});

router.delete("/lojista/products/:id", validateId, async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const id = parseInt(req.params.id, 10);

  // Lojista pode sempre deletar seus próprios produtos (incluindo plano Gratuito).
  const result = await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, id), eq(productsTable.businessId, businessId)))
    .returning();

  if (result.length === 0) {
    res.status(404).json({ error: "Produto não encontrado" });
    return;
  }
  res.json({ success: true });
});

router.get("/lojista/metrics", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz) { res.status(404).json({ error: "Negócio não encontrado" }); return; }

  if (biz.planType === "free") {
    res.status(403).json({ error: "Métricas disponíveis a partir do plano Destaque", code: "PLAN_REQUIRED", requiredPlan: "destaque", currentPlan: "free" });
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [clicksByType, businessStats] = await Promise.all([
    db
      .select({
        type: businessClicksTable.type,
        count: sql<number>`count(*)::int`,
      })
      .from(businessClicksTable)
      .where(eq(businessClicksTable.businessId, businessId))
      .groupBy(businessClicksTable.type),

    db
      .select({
        clicks: businessesTable.clicks,
        whatsappClicks: businessesTable.whatsappClicks,
      })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId)),
  ]);

  const byType: Record<string, number> = {};
  for (const r of clicksByType) {
    byType[r.type] = r.count;
  }

  const base = {
    totalClicks: businessStats[0]?.clicks ?? 0,
    whatsappClicks: businessStats[0]?.whatsappClicks ?? 0,
    phoneClicks: byType["phone"] ?? 0,
    profileViews: byType["profile"] ?? 0,
    planType: biz.planType,
  };

  if (biz.planType === "premium") {
    const dailyClicks = await db
      .select({
        date: sql<string>`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`,
        clicks: sql<number>`count(*)::int`,
      })
      .from(businessClicksTable)
      .where(
        and(
          eq(businessClicksTable.businessId, businessId),
          gte(businessClicksTable.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`);

    res.json({ ...base, last30Days: dailyClicks });
  } else {
    res.json({ ...base, last30Days: [] });
  }
});

router.get("/lojista/reviews", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.businessId, businessId))
    .orderBy(desc(reviewsTable.createdAt));
  res.json({ data: reviews });
});

router.post("/lojista/reviews/:reviewId/respond", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz || biz.planType === "free") {
    res.status(403).json({ error: "Resposta a avaliações disponível a partir do plano Destaque", code: "PLAN_REQUIRED", requiredPlan: "destaque", currentPlan: biz?.planType || "free" });
    return;
  }
  const reviewId = parseId(req.params.reviewId);
  if (!reviewId) { res.status(400).json({ error: "ID inválido.", code: "INVALID_ID" }); return; }

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId));
  if (!review || review.businessId !== businessId) {
    res.status(404).json({ error: "Avaliação não encontrada" });
    return;
  }
  const { response } = req.body;
  if (!response?.trim()) { res.status(400).json({ error: "Resposta não pode ser vazia" }); return; }

  const [updated] = await db.update(reviewsTable).set({ ownerResponse: response.trim() }).where(eq(reviewsTable.id, reviewId)).returning();
  res.json({ review: updated });
});

router.delete("/lojista/reviews/:reviewId/respond", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const reviewId = parseId(req.params.reviewId);
  if (!reviewId) { res.status(400).json({ error: "ID inválido.", code: "INVALID_ID" }); return; }
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, reviewId));
  if (!review || review.businessId !== businessId) { res.status(404).json({ error: "Avaliação não encontrada" }); return; }
  await db.update(reviewsTable).set({ ownerResponse: null }).where(eq(reviewsTable.id, reviewId));
  res.json({ success: true });
});

const ALLOWED_PRODUCT_MIMES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
const ALLOWED_PRODUCT_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".mp4"];

function productMediaFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_PRODUCT_MIMES.includes(file.mimetype) && ALLOWED_PRODUCT_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Apenas imagens (JPG, PNG, WebP) e vídeos MP4 são permitidos"));
  }
}

const memoryProductUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: productMediaFilter,
});

router.post("/lojista/upload/product-media", memoryProductUpload.single("file"), async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz || biz.planType === "free") {
    res.status(403).json({ error: "Upload de mídia de produto disponível nos planos Destaque e Premium", code: "PLAN_REQUIRED", requiredPlan: "destaque" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }

  const isVideo = req.file.mimetype.startsWith("video/");
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

  if (req.file.size > maxSize) {
    res.status(400).json({ error: `Arquivo muito grande. Máximo: ${isVideo ? "50MB" : "10MB"}` });
    return;
  }

  const ext = path.extname(req.file.originalname) || ".jpg";
  const filename = `product-${Date.now()}${ext}`;
  const mediaUrl = await uploadBufferToGCS(req.file.buffer, "products", filename, req.file.mimetype);
  const mediaType: "image" | "video" = isVideo ? "video" : "image";
  res.json({ mediaUrl, mediaType });
});

router.patch("/lojista/password", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
    return;
  }

  const [user] = await db
    .select()
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));

  if (!user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Senha atual incorreta" });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(businessUsersTable)
    .set({ passwordHash })
    .where(eq(businessUsersTable.id, user.id));

  res.json({ success: true });
});

router.get("/lojista/report/pdf", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;

  const [biz] = await db
    .select({
      name: businessesTable.name,
      planType: businessesTable.planType,
      zone: businessesTable.zone,
      rating: businessesTable.rating,
      reviewsCount: businessesTable.reviewsCount,
      clicks: businessesTable.clicks,
      whatsappClicks: businessesTable.whatsappClicks,
    })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  if (!biz) { res.status(404).json({ error: "Negócio não encontrado" }); return; }
  if (biz.planType !== "premium") {
    res.status(403).json({ error: "Relatório PDF disponível apenas para o plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium" });
    return;
  }

  const monthParam = (req.query.month as string) || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(monthParam)) {
    res.status(400).json({ error: "Parâmetro 'month' inválido. Use o formato YYYY-MM" });
    return;
  }

  const [year, month] = monthParam.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const cacheDir = path.join(os.tmpdir(), "hub-reports");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  const cacheFile = path.join(cacheDir, `${businessId}-${monthParam}.pdf`);

  const cacheAge = fs.existsSync(cacheFile)
    ? Date.now() - fs.statSync(cacheFile).mtimeMs
    : Infinity;
  const CACHE_TTL = 3600 * 1000;

  if (cacheAge > CACHE_TTL) {
    const [clicksByType, dailyClicks, activeBoost] = await Promise.all([
      db
        .select({
          type: businessClicksTable.type,
          count: sql<number>`count(*)::int`,
        })
        .from(businessClicksTable)
        .where(and(
          eq(businessClicksTable.businessId, businessId),
          gte(businessClicksTable.createdAt, monthStart),
          lte(businessClicksTable.createdAt, monthEnd),
        ))
        .groupBy(businessClicksTable.type),

      db
        .select({
          date: sql<string>`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`,
          clicks: sql<number>`count(*)::int`,
        })
        .from(businessClicksTable)
        .where(and(
          eq(businessClicksTable.businessId, businessId),
          gte(businessClicksTable.createdAt, monthStart),
          lte(businessClicksTable.createdAt, monthEnd),
        ))
        .groupBy(sql`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${businessClicksTable.createdAt}, 'YYYY-MM-DD')`),

      db
        .select({ boostType: searchBoostsTable.boostContext, expiresAt: searchBoostsTable.expiresAt })
        .from(searchBoostsTable)
        .where(and(
          eq(searchBoostsTable.businessId, businessId),
          eq(searchBoostsTable.status, "active"),
          or(
            sql`${searchBoostsTable.expiresAt} IS NULL`,
            sql`${searchBoostsTable.expiresAt} > NOW()`,
          )
        ))
        .limit(1),
    ]);

    const byType: Record<string, number> = {};
    for (const r of clicksByType) byType[r.type] = r.count;

    await generatePdfReport({
      businessId,
      businessName: biz.name,
      planType: biz.planType,
      zone: biz.zone,
      month: monthParam,
      totalClicks: biz.clicks ?? 0,
      whatsappClicks: biz.whatsappClicks ?? 0,
      phoneClicks: byType["phone"] ?? 0,
      profileViews: byType["profile"] ?? 0,
      rating: biz.rating ?? 0,
      reviewsCount: biz.reviewsCount ?? 0,
      boostActive: activeBoost.length > 0,
      boostType: activeBoost[0]?.boostType ?? null,
      dailyClicks,
    }, cacheFile);
  }

  const filename = `hub-londrina-relatorio-${biz.name.replace(/\s+/g, "-").toLowerCase()}-${monthParam}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(cacheFile).pipe(res);
});

// ─── GET /lojista/subscriptions — painel unificado de assinaturas ─────────────
router.get("/lojista/subscriptions", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;

  const [biz] = await db.select({
    planType: businessesTable.planType,
    name: businessesTable.name,
    ownerName: businessesTable.ownerName,
    ownerEmail: businessesTable.ownerEmail,
  }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz) { res.status(404).json({ error: "Negócio não encontrado" }); return; }

  function daysUntil(date: Date | null | undefined): number | null {
    if (!date) return null;
    const diff = date.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const [sub, boosts, banner] = await Promise.all([
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.businessId, businessId)).limit(1),
    db.select().from(searchBoostsTable).where(and(
      eq(searchBoostsTable.businessId, businessId),
      or(eq(searchBoostsTable.status, "active"), eq(searchBoostsTable.status, "waitlist")),
    )),
    db.select().from(homeBannersTable).where(and(
      eq(homeBannersTable.businessId, businessId),
      or(
        eq(homeBannersTable.status, "active"),
        eq(homeBannersTable.status, "pending_review"),
      ),
    )).limit(1),
  ]);

  const planLabels: Record<string, string> = { free: "Gratuito", destaque: "Base", premium: "Premium" };
  const planPrices: Record<string, string> = { free: "R$0", destaque: "R$59,90", premium: "R$89,90" };
  const planFeatures: Record<string, string[]> = {
    free: ["Perfil básico", "1 foto", "Link WhatsApp", "Aparece nas buscas"],
    destaque: ["Até 10 fotos", "Logo e banner", "Selo Destaque", "Prioridade na busca", "Métricas básicas", "Suporte por email"],
    premium: ["Tudo do Base", "Vitrine de produtos", "Vídeo de apresentação", "Métricas avançadas", "Suporte WhatsApp VIP", "Topo garantido"],
  };

  const subscription = sub[0] ?? null;
  const renewsAt = subscription?.currentPeriodEnd ?? null;
  const daysUntilRenewal = daysUntil(renewsAt ?? undefined);

  const zoneBoost = boosts.find(b => b.boostContext === "zone") ?? null;
  const homeBoost = boosts.find(b => b.boostContext === "home_search") ?? null;
  const homeBanner = banner[0] ?? null;

  res.json({
    plan: {
      key: biz.planType || "free",
      label: planLabels[biz.planType || "free"] ?? biz.planType,
      price: planPrices[biz.planType || "free"] ?? "—",
      features: planFeatures[biz.planType || "free"] ?? [],
      status: subscription?.status ?? (biz.planType === "free" ? "free" : "unknown"),
      renewsAt: renewsAt?.toISOString() ?? null,
      daysUntilRenewal,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    },
    zoneBoost: zoneBoost ? {
      status: zoneBoost.status,
      zone: zoneBoost.zone,
      expiresAt: zoneBoost.expiresAt?.toISOString() ?? null,
      daysLeft: daysUntil(zoneBoost.expiresAt ?? undefined),
      price: "R$79",
      label: "Destaque de Zona",
    } : null,
    homeBoost: homeBoost ? {
      status: homeBoost.status,
      expiresAt: homeBoost.expiresAt?.toISOString() ?? null,
      daysLeft: daysUntil(homeBoost.expiresAt ?? undefined),
      price: "R$149",
      label: "Destaque Home + Busca",
    } : null,
    homeBanner: homeBanner ? {
      status: homeBanner.status,
      endsAt: homeBanner.endsAt?.toISOString() ?? null,
      daysLeft: daysUntil(homeBanner.endsAt ?? undefined),
      rejectionReason: homeBanner.rejectionReason,
      price: "R$299/mês",
      label: "Banner na Home",
    } : null,
  });
});

// ─── Sprint 4.3 — DELETE /api/lojista/account (LGPD: anonimização) ───────────
router.delete("/lojista/account", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista as LojistaPayload;
  const { password } = (req.body ?? {}) as { password?: string };

  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "Senha atual é obrigatória" });
    return;
  }

  const [user] = await db
    .select()
    .from(businessUsersTable)
    .where(eq(businessUsersTable.businessId, businessId));
  if (!user) {
    res.status(404).json({ error: "Conta não encontrada" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Senha incorreta" });
    return;
  }

  // 1. Cancela assinatura Stripe (se existir e Stripe disponível)
  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.businessId, businessId));
    if (sub?.stripeSubscriptionId && stripeClient) {
      try {
        await stripeClient.subscriptions.cancel(sub.stripeSubscriptionId);
      } catch (err) {
        logger.warn({ err, businessId }, "[Account Delete] Falha ao cancelar assinatura Stripe (continuando)");
      }
      await db
        .update(subscriptionsTable)
        .set({ status: "canceled", cancelAtPeriodEnd: false })
        .where(eq(subscriptionsTable.id, sub.id));
    }
  } catch (err) {
    logger.error({ err, businessId }, "[Account Delete] Erro ao processar assinatura");
  }

  // 2. Deleta documentos do GCS (best-effort) e da tabela
  try {
    const docs = await db
      .select()
      .from(businessDocumentsTable)
      .where(eq(businessDocumentsTable.businessId, businessId));
    for (const doc of docs) {
      try {
        const PREFIX = "/storage/objects/";
        const gcsPath = doc.fileUrl.startsWith(PREFIX) ? doc.fileUrl.slice(PREFIX.length) : doc.fileUrl;
        const removed = await deleteGCSObject(gcsPath);
        if (!removed) {
          logger.warn({ docId: doc.id, gcsPath }, "[Account Delete] Arquivo GCS não encontrado (já removido)");
        }
      } catch (err) {
        logger.warn({ err, docId: doc.id }, "[Account Delete] Falha ao deletar arquivo GCS (continuando)");
      }
    }
    await db.delete(businessDocumentsTable).where(eq(businessDocumentsTable.businessId, businessId));
  } catch (err) {
    logger.error({ err, businessId }, "[Account Delete] Erro ao deletar documentos");
  }

  const sentinelEmail = `removed_${businessId}@deleted.hub`;

  // 3. Anonimiza business
  await db
    .update(businessesTable)
    .set({
      name: "Negócio Removido",
      description: "",
      phone: null,
      whatsapp: null,
      ownerName: "Removido",
      ownerEmail: sentinelEmail,
      ownerPhone: null,
      cnpj: null,
      isVisible: false,
      status: "deleted",
      logoUrl: null,
      bannerUrl: null,
      photos: [],
      instagram: null,
      website: null,
      videoUrl: null,
      tags: [],
      paymentMethods: [],
      cep: null,
      street: null,
      number: null,
      neighborhood: null,
      lat: null,
      lng: null,
      boostedUntil: null,
      homeFeatured: false,
      planType: "free",
    })
    .where(eq(businessesTable.id, businessId));

  // 4. Anonimiza business_user (mantém row para auditoria mas sem PII)
  await db
    .update(businessUsersTable)
    .set({
      email: sentinelEmail,
      passwordHash: "",
      firstLoginAt: null,
      documentationStatus: null,
      documentationDeadline: null,
      documentationRemainingDays: null,
      documentationTimerPaused: false,
    })
    .where(eq(businessUsersTable.id, user.id));

  logger.info({ businessId, userId: user.id }, "[Account Delete] Conta anonimizada (LGPD)");

  res.json({ success: true, message: "Conta removida com sucesso" });
});

// B4 — Tickets de suporte (lojista)
router.get("/lojista/support", lojistaAuth, async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista as LojistaPayload;
  const rows = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.businessId, businessId))
    .orderBy(desc(supportTicketsTable.createdAt))
    .limit(100);
  res.json({ data: rows });
});

// ────────────────────────────────────────────────────────────────────────
// R11 — Vitrine de Produtos (lojista)
// ────────────────────────────────────────────────────────────────────────
const VITRINE_VIDEO_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const VITRINE_VIDEO_MIMES = ["video/mp4"];
const VITRINE_VIDEO_EXTS = [".mp4"];

function vitrineVideoFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (VITRINE_VIDEO_MIMES.includes(file.mimetype) && VITRINE_VIDEO_EXTS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Apenas vídeos MP4 são aceitos para a vitrine"));
  }
}

const vitrineVideoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VITRINE_VIDEO_MAX_BYTES },
  fileFilter: vitrineVideoFilter,
});

// Upload de vídeo da vitrine — Premium-only, MP4 ≤20MB.
// Retorna apenas a URL; o videoStatus será marcado como pending quando o
// lojista anexar o vídeo a um produto (POST/PATCH /lojista/products).
router.post(
  "/lojista/upload/vitrine-video",
  vitrineVideoUpload.single("file"),
  async (req: Request, res: Response) => {
    const { businessId } = (req as any).lojista as LojistaPayload;
    const [biz] = await db
      .select({ planType: businessesTable.planType })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    if (!biz || biz.planType !== "premium") {
      res.status(403).json({
        error: "Vitrine de produtos disponível apenas no plano Premium",
        code: "PLAN_REQUIRED",
        requiredPlan: "premium",
        currentPlan: biz?.planType ?? "free",
      });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }
    const filename = `vitrine-${businessId}-${Date.now()}.mp4`;
    const videoUrl = await uploadBufferToGCS(req.file.buffer, "vitrine", filename, "video/mp4");
    res.json({ videoUrl });
  },
);

// Status da vitrine para o lojista: ocupação dos 4 slots, slot do próprio
// lojista (se houver), elegibilidade (Premium + ≥1 produto com vídeo aprovado).
router.get("/lojista/vitrine-boost/status", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista as LojistaPayload;
  const [biz] = await db
    .select({ planType: businessesTable.planType })
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));

  const now = new Date();

  const allActive = await db
    .select()
    .from(vitrineBoostsTable)
    .where(and(
      eq(vitrineBoostsTable.status, "active"),
      or(sql`${vitrineBoostsTable.endsAt} IS NULL`, sql`${vitrineBoostsTable.endsAt} > ${now}`)!,
    ));
  const used = allActive.length;
  const mine = allActive.find((b) => b.businessId === businessId) ?? null;

  const approvedVideos = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(and(
      eq(productsTable.businessId, businessId),
      eq(productsTable.videoStatus, "approved"),
      eq(productsTable.isActive, true),
    ));
  const hasApprovedVideo = (approvedVideos[0]?.count ?? 0) > 0;

  res.json({
    eligible: biz?.planType === "premium" && hasApprovedVideo,
    planType: biz?.planType ?? "free",
    hasApprovedVideo,
    totalSlots: 4,
    used,
    available: Math.max(0, 4 - used),
    mySlot: mine,
  });
});

// Inicia checkout do boost "Vitrine Destaque" (R$49/mês recorrente).
// Gates (R11): Premium + ≥1 produto com videoStatus=approved + sem boost ativo/pendente.
router.post("/lojista/vitrine-boost/checkout", async (req: Request, res: Response) => {
  if (!stripeClient) {
    res.status(500).json({ error: "Stripe não configurado" });
    return;
  }
  const { businessId, email } = (req as any).lojista as LojistaPayload;
  const priceId = process.env.STRIPE_VITRINE_BOOST_PRICE_ID;
  if (!priceId) {
    res.status(500).json({ error: "STRIPE_VITRINE_BOOST_PRICE_ID não configurado" });
    return;
  }

  const [biz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, businessId));
  if (!biz) {
    res.status(404).json({ error: "Negócio não encontrado" });
    return;
  }
  if (biz.planType !== "premium") {
    res.status(403).json({
      error: "Boost Vitrine exige plano Premium",
      code: "PLAN_REQUIRED",
      requiredPlan: "premium",
      currentPlan: biz.planType,
    });
    return;
  }

  // R11 — sem vídeo aprovado, não permite o checkout
  const approved = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(and(
      eq(productsTable.businessId, businessId),
      eq(productsTable.videoStatus, "approved"),
      eq(productsTable.isActive, true),
    ))
    .limit(1);
  if (approved.length === 0) {
    res.status(409).json({
      error: "Você precisa de pelo menos um vídeo aprovado pelo admin antes de contratar o boost.",
      code: "NO_APPROVED_VIDEO",
    });
    return;
  }

  // Reserva atômica do slot pending: o INSERT abaixo dispara o partial
  // unique index `vitrine_boosts_one_open_per_business` se já existir
  // pending/active/waitlist deste lojista. Captura como 409 idempotente,
  // evitando criar Stripe session duplicada em cliques rápidos paralelos.
  let pendingRowId: number;
  try {
    const [row] = await db
      .insert(vitrineBoostsTable)
      .values({
        businessId,
        productId: approved[0].id,
        status: "pending",
      })
      .returning({ id: vitrineBoostsTable.id });
    pendingRowId = row.id;
  } catch (err: any) {
    // 23505 = unique_violation (Postgres)
    if (err?.code === "23505") {
      res.status(409).json({
        error: "Você já tem um boost de vitrine ativo ou em processamento.",
        code: "BOOST_ALREADY_EXISTS",
      });
      return;
    }
    throw err;
  }

  try {
    // Reaproveita customerId existente se houver
    const [existingSub] = await db
      .select({ stripeCustomerId: subscriptionsTable.stripeCustomerId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.businessId, businessId));

    let customerId = existingSub?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email,
        name: biz.name,
        metadata: { businessId: String(businessId) },
      });
      customerId = customer.id;
    }

    const FRONTEND_URL = process.env.FRONTEND_URL
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://www.hublondrina.com.br");

    const session = await stripeClient.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/lojista/boost?vitrine=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/lojista/boost?vitrine=cancelled`,
      metadata: { businessId: String(businessId), kind: "vitrine_boost" },
      subscription_data: {
        metadata: { businessId: String(businessId), kind: "vitrine_boost" },
      },
      locale: "pt-BR",
    });

    // Atrela a sessão Stripe ao pending row (UNIQUE em stripeSessionId)
    await db.update(vitrineBoostsTable)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(vitrineBoostsTable.id, pendingRowId));

    logger.info(`[Vitrine] Checkout iniciado biz=${businessId} session=${session.id}`);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    // Stripe falhou — limpa o pending row para liberar nova tentativa.
    await db.delete(vitrineBoostsTable).where(eq(vitrineBoostsTable.id, pendingRowId));
    throw err;
  }
});

// Sync pós-checkout — confirma a sessão e ativa o boost (idempotente).
router.post("/lojista/vitrine-boost/sync", async (req: Request, res: Response) => {
  if (!stripeClient) {
    res.status(500).json({ error: "Stripe não configurado" });
    return;
  }
  const { businessId } = (req as any).lojista as LojistaPayload;
  const sessionId = String(req.body?.sessionId ?? "").trim();
  if (!sessionId) {
    res.status(400).json({ error: "sessionId obrigatório" });
    return;
  }

  const session = await stripeClient.checkout.sessions.retrieve(sessionId);
  if (Number(session.metadata?.businessId) !== businessId || session.metadata?.kind !== "vitrine_boost") {
    res.status(403).json({ error: "Sessão não pertence a este lojista" });
    return;
  }
  if (session.payment_status !== "paid" || !session.subscription) {
    res.status(409).json({ error: "Pagamento ainda não confirmado", status: session.payment_status });
    return;
  }

  const subscriptionId = String(session.subscription);

  // Alocação atômica do slot — pg_advisory_xact_lock evita que dois syncs
  // concorrentes (ex: webhook + retorno do navegador) ambos virem 'active'
  // quando há só 1 vaga, violando o cap de 4 slots.
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${vitrineSlotLockKey()})`);

    const now = new Date();
    const occupied = await tx
      .select({ id: vitrineBoostsTable.id })
      .from(vitrineBoostsTable)
      .where(and(
        eq(vitrineBoostsTable.status, "active"),
        or(sql`${vitrineBoostsTable.endsAt} IS NULL`, sql`${vitrineBoostsTable.endsAt} > ${now}`)!,
      ));
    const newStatus: "active" | "waitlist" = occupied.length < 4 ? "active" : "waitlist";

    const [row] = await tx.select().from(vitrineBoostsTable)
      .where(eq(vitrineBoostsTable.stripeSessionId, sessionId));
    if (!row) return { error: "not_found" as const };
    if (row.status === "active" || row.status === "waitlist") {
      return { duplicate: true as const, status: row.status };
    }

    await tx.update(vitrineBoostsTable)
      .set({
        status: newStatus,
        stripeSubscriptionId: subscriptionId,
        startsAt: newStatus === "active" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(vitrineBoostsTable.id, row.id));

    return { status: newStatus };
  });

  if ("error" in result) {
    res.status(404).json({ error: "Boost não encontrado para a sessão" });
    return;
  }
  if ("duplicate" in result) {
    res.json({ ok: true, status: result.status, duplicate: true });
    return;
  }

  logger.info(`[Vitrine Sync] biz=${businessId} session=${sessionId} -> ${result.status}`);
  res.json({ ok: true, status: result.status });
});

router.post("/lojista/support", lojistaAuth, async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista as LojistaPayload;
  const subject = String(req.body?.subject ?? "").trim();
  const message = String(req.body?.message ?? "").trim();
  const priorityRaw = String(req.body?.priority ?? "normal").trim();
  const priority = ["low", "normal", "high", "urgent"].includes(priorityRaw) ? priorityRaw : "normal";

  if (!subject || subject.length > 200) {
    res.status(400).json({ error: "Assunto inválido (1-200 caracteres)" });
    return;
  }
  if (!message || message.length > 5000) {
    res.status(400).json({ error: "Mensagem inválida (1-5000 caracteres)" });
    return;
  }

  const [row] = await db
    .insert(supportTicketsTable)
    .values({ businessId, subject, message, priority })
    .returning();

  res.status(201).json({ data: row });
});

export default router;
