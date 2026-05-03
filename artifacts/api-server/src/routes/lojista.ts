import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { loginLimiter } from "../middleware/rateLimiter";
import multer from "multer";
import path from "path";
import { validateId, parseId } from "../middleware/validateId";
import { db } from "@workspace/db";
import { businessesTable, businessUsersTable, productsTable, businessClicksTable, reviewsTable, searchBoostsTable } from "@workspace/db/schema";
import { eq, sql, and, gte, desc, asc, or } from "drizzle-orm";
import { uploadBufferToGCS } from "../lib/gcsUpload";

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

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter });

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

router.post("/lojista/register", async (req: Request, res: Response) => {
  const { businessName, categorySlug, zone, ownerName, email, password } = req.body;

  if (!businessName || !email || !password || !ownerName) {
    res.status(400).json({ error: "Nome do negócio, responsável, email e senha são obrigatórios" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db.select().from(businessUsersTable).where(eq(businessUsersTable.email, normalizedEmail));
  if (existing.length > 0) {
    res.status(409).json({ error: "Este email já está cadastrado" });
    return;
  }

  const validZones = ["centro", "norte", "sul", "leste", "oeste"];
  const selectedZone = validZones.includes(zone) ? zone : "centro";

  const [business] = await db.insert(businessesTable).values({
    name: businessName.trim(),
    categorySlug: categorySlug || "servicos",
    zone: selectedZone,
    ownerName: ownerName.trim(),
    ownerEmail: normalizedEmail,
    planType: "free",
    isVisible: true,
    description: "",
    phone: "",
    whatsapp: "",
  }).returning();

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(businessUsersTable).values({
    email: normalizedEmail,
    passwordHash,
    businessId: business.id,
  });

  const token = jwt.sign(
    { businessId: business.id, email: normalizedEmail, role: "lojista" },
    JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, businessId: business.id });
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

  // Bloqueio: cadastros pendentes criados a partir de 03/05/2026 não logam até aprovação
  const PENDING_BLOCK_START = new Date("2026-05-03T00:00:00Z");
  const [business] = await db
    .select({ status: businessesTable.status, createdAt: businessesTable.createdAt })
    .from(businessesTable)
    .where(eq(businessesTable.id, user.businessId));

  if (business && business.status !== "active" && business.createdAt && business.createdAt >= PENDING_BLOCK_START) {
    res.status(403).json({
      error: "Seu cadastro está em análise pela nossa equipe. Você receberá um email assim que for aprovado (em até 24h).",
      code: "PENDING_APPROVAL",
    });
    return;
  }

  // Primeiro login: iniciar timer de documentação (10 dias)
  if (!user.firstLoginAt) {
    await db
      .update(businessUsersTable)
      .set({
        firstLoginAt: new Date(),
        documentationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        documentationRemainingDays: 10,
        documentationStatus: "pending",
        documentationTimerPaused: false,
      })
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

  res.json({
    ...business,
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

router.post("/lojista/upload/logo", memoryUpload.single("file"), async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo enviado" });
    return;
  }
  const [business] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!business || business.planType === "free") {
    res.status(403).json({ error: "Logo disponível apenas nos planos Destaque e Premium", code: "PLAN_REQUIRED", requiredPlan: "destaque", currentPlan: business?.planType || "free" });
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
  const [business] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!business || business.planType === "free") {
    res.status(403).json({ error: "Banner disponível apenas nos planos Destaque e Premium", code: "PLAN_REQUIRED", requiredPlan: "destaque", currentPlan: business?.planType || "free" });
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

  const removed = photos[idx];
  const newPhotos = photos.filter((_: string, i: number) => i !== idx);

  await db
    .update(businessesTable)
    .set({ photos: newPhotos })
    .where(eq(businessesTable.id, businessId));

  const filePath = path.join(UPLOAD_BASE, "..", removed);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

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

router.get("/lojista/products", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, businessId))
    .orderBy(asc(productsTable.sortOrder), desc(productsTable.createdAt));
  res.json({ data: products });
});

router.post("/lojista/products", async (req: Request, res: Response) => {
  const { businessId } = (req as any).lojista;
  const { name, description, price, mediaUrl, mediaType, whatsappLink } = req.body;

  if (!name) {
    res.status(400).json({ error: "Nome do produto é obrigatório" });
    return;
  }

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz || biz.planType !== "premium") {
    res.status(403).json({ error: "Vitrine de produtos disponível apenas no plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz?.planType || "free" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      businessId,
      name,
      description: description || null,
      price: price || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      whatsappLink: whatsappLink || null,
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

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz || biz.planType !== "premium") {
    res.status(403).json({ error: "Vitrine de produtos disponível apenas no plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz?.planType });
    return;
  }

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

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz || biz.planType !== "premium") {
    res.status(403).json({ error: "Vitrine de produtos disponível apenas no plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz?.planType });
    return;
  }

  const allowed = ["name", "description", "price", "mediaUrl", "mediaType", "whatsappLink", "isActive", "sortOrder"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
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

  const [biz] = await db.select({ planType: businessesTable.planType }).from(businessesTable).where(eq(businessesTable.id, businessId));
  if (!biz || biz.planType !== "premium") {
    res.status(403).json({ error: "Vitrine de produtos disponível apenas no plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium", currentPlan: biz?.planType });
    return;
  }

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
  if (!biz || biz.planType !== "premium") {
    res.status(403).json({ error: "Upload de mídia de produto é exclusivo do plano Premium", code: "PLAN_REQUIRED", requiredPlan: "premium" });
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

export default router;
