import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { registerLimiter, cnpjLimiter, csrfTokenLimiter } from "../middleware/rateLimiter";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { businessesTable, businessUsersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendEmail, emails } from "../services/email";
import { generateCsrfToken, csrfProtection } from "../middleware/csrf";
import { getLegalValue } from "../lib/legal-config-store";
import { LEGAL_CONFIG_DEFAULTS } from "../lib/legal-config";
import { sanitizeBusiness } from "../lib/sanitize";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required for auth routes");

const router: IRouter = Router();

router.get("/auth/csrf-token", csrfTokenLimiter, (req: Request, res: Response) => {
  const token = generateCsrfToken();
  res.cookie("csrf-token", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Muitas tentativas. Tente novamente em 1 hora.", code: "TOO_MANY_REQUESTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

// H9: limita tentativas de reset com token (anti brute-force de tokens).
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos.", code: "TOO_MANY_REQUESTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

function stripCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

router.get("/auth/validate-cnpj", cnpjLimiter, async (req: Request, res: Response) => {
  const cnpj = req.query.cnpj as string;
  if (!cnpj) {
    res.status(400).json({ valid: false, reason: "CNPJ não informado" });
    return;
  }

  const digits = stripCnpj(cnpj);
  if (digits.length !== 14) {
    res.json({ valid: false, reason: "CNPJ deve ter 14 dígitos" });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      res.json({ valid: true, reason: "api_unavailable" });
      return;
    }

    const data = await resp.json();
    if (data.status === "ERROR") {
      res.json({ valid: false, reason: "CNPJ inválido" });
      return;
    }
    if (data.situacao && data.situacao !== "ATIVA") {
      res.json({ valid: false, reason: `Empresa ${data.situacao.toLowerCase()}` });
      return;
    }

    res.json({ valid: true, name: data.nome || data.fantasia || "" });
  } catch {
    res.json({ valid: true, reason: "api_unavailable" });
  }
});

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2).max(100),
  cnpj: z.string().min(14).max(18),
  phone: z.string().min(10).max(15),
  categorySlug: z.string().min(1),
  zone: z.string().min(1),
  cep: z.string().min(8).max(9),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  acceptedTermsVersion: z.string().optional(),
});

router.post("/auth/register", registerLimiter, csrfProtection, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inválidos", details: parsed.error.issues });
    return;
  }

  const { name, email, password, businessName, cnpj, phone, categorySlug, zone, cep, razaoSocial, nomeFantasia, acceptedTermsVersion } = parsed.data;

  // ... restante do código permanece igual

  // LGPD — consentimento explícito é obrigatório (Lei 13.709/2018, art. 8º).
  // O front envia a versão dos Termos que o usuário viu. Se versão não bate
  // com a vigente, força re-leitura (impede "aceitar termos antigos").
  const currentTermsVersion = (await getLegalValue("TERMS_VERSION")) ?? LEGAL_CONFIG_DEFAULTS.TERMS_VERSION;
  if (!acceptedTermsVersion || acceptedTermsVersion !== currentTermsVersion) {
    res.status(400).json({
      error: "Você precisa aceitar os Termos e a Política de Privacidade para concluir o cadastro.",
      code: "CONSENT_REQUIRED",
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Senha deve ter mínimo 8 caracteres" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  const [existingEmail] = await db
    .select({ id: businessUsersTable.id })
    .from(businessUsersTable)
    .where(eq(businessUsersTable.email, normalizedEmail));
  if (existingEmail) {
    res.status(400).json({ error: "Email já cadastrado", code: "EMAIL_DUPLICATE" });
    return;
  }

  const cleanCnpj = cnpj.trim();
  const [existingCnpj] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.cnpj, cleanCnpj));
  if (existingCnpj) {
    res.status(400).json({ error: "CNPJ já cadastrado", code: "CNPJ_DUPLICATE" });
    return;
  }

  const cleanPhone = phone.trim();
  const [existingPhone] = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(eq(businessesTable.phone, cleanPhone));
  if (existingPhone) {
    res.status(400).json({ error: "Telefone já cadastrado", code: "PHONE_DUPLICATE" });
    return;
  }

  if (razaoSocial && razaoSocial.trim()) {
    const [existingRazao] = await db
      .select({ id: businessesTable.id })
      .from(businessesTable)
      .where(sql`LOWER(${businessesTable.razaoSocial}) = LOWER(${razaoSocial.trim()})`);
    if (existingRazao) {
      res.status(400).json({ error: "Razão social já cadastrada na plataforma.", code: "RAZAO_SOCIAL_DUPLICATE", field: "razaoSocial" });
      return;
    }
  }

  const digits = stripCnpj(cnpj);
  if (digits.length === 14) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(`https://receitaws.com.br/v1/cnpj/${digits}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === "ERROR" || (data.situacao && data.situacao !== "ATIVA")) {
          res.status(400).json({ error: "CNPJ inválido ou empresa inativa", code: "CNPJ_INVALID" });
          return;
        }
      }
    } catch {
    }
  }

  const validZones = ["centro", "norte", "sul", "leste", "oeste"];
  const selectedZone = validZones.includes(zone) ? zone : "centro";
  // RULES.md R8 — region é o nome de exibição ("Zona Sul"), zone é o slug ("sul").
  // Antes salvava o slug em ambos, quebrando o card no front (mostrava "sul").
  const ZONE_DISPLAY: Record<string, string> = {
    centro: "Centro",
    norte: "Zona Norte",
    sul: "Zona Sul",
    leste: "Zona Leste",
    oeste: "Zona Oeste",
  };
  const selectedRegion = ZONE_DISPLAY[selectedZone] ?? "Centro";

  let street = "";
  let neighborhood = "";
  try {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const cepResp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (cepResp.ok) {
        const cepData = await cepResp.json();
        if (!cepData.erro) {
          street = cepData.logradouro || "";
          neighborhood = cepData.bairro || "";
        }
      }
    }
  } catch {
  }

  // Sanitize business data to prevent XSS
  const sanitizedBusinessData = sanitizeBusiness({
    name: businessName.trim(),
    categorySlug,
    zone: selectedZone,
    region: selectedRegion,
    ownerName: name.trim(),
    ownerEmail: normalizedEmail,
    phone: cleanPhone,
    cnpj: cleanCnpj,
    cep: cep.trim(),
    street,
    neighborhood,
    city: "Londrina",
    state: "PR",
    planType: "free",
    isVisible: false,
    status: "active",
    description: "",
    address: street ? `${street}, ${neighborhood}` : "",
    razaoSocial: razaoSocial ? razaoSocial.trim() : null,
    nomeFantasia: nomeFantasia ? nomeFantasia.trim() : null,
  });

  const [business] = await db.insert(businessesTable).values(sanitizedBusinessData).returning();

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = randomBytes(32).toString("hex");
  const [newUser] = await db.insert(businessUsersTable).values({
    email: normalizedEmail,
    passwordHash,
    businessId: business.id,
    emailVerificationToken: verifyToken,
    documentationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    documentationRemainingDays: 10,
    documentationStatus: "pending",
    documentationTimerPaused: false,
    consentTermsVersion: currentTermsVersion,
    consentTermsAt: new Date(),
    consentPrivacyAt: new Date(),
  }).returning();

  try {
    const tpl = emails.boasVindas(name.trim(), businessName.trim());
    await sendEmail(normalizedEmail, tpl.subject, tpl.html);
  } catch {}

  try {
    const verifyUrl = `https://www.hublondrina.com.br/lojista/verificar-email?token=${verifyToken}`;
    await sendEmail(normalizedEmail, "Confirme seu email — Hub Londrina", `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#d97706">Confirme seu email</h2>
        <p>Olá, ${name.trim()}! Clique no botão abaixo para confirmar seu endereço de email.</p>
        <p><a href="${verifyUrl}" style="background:#d97706;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;margin:10px 0;font-weight:bold">Confirmar email</a></p>
        <p style="color:#888;font-size:12px">Link válido por 24 horas. Se não solicitou este cadastro, ignore este email.</p>
      </div>
    `);
  } catch {}

  const lojistaToken = jwt.sign(
    { role: "lojista", businessId: business.id, email: normalizedEmail },
    JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    message: "Cadastro realizado! Seu negócio será publicado automaticamente em 10 dias.",
    businessId: business.id,
    token: lojistaToken,
  });
});

router.get("/auth/verify-email", async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.redirect("https://www.hublondrina.com.br/lojista/verificar-email?error=invalid");
  }

  const [user] = await db
    .select()
    .from(businessUsersTable)
    .where(eq(businessUsersTable.emailVerificationToken, token));

  if (!user) {
    return res.redirect("https://www.hublondrina.com.br/lojista/verificar-email?error=invalid");
  }

  await db
    .update(businessUsersTable)
    .set({ emailVerified: true, emailVerificationToken: null })
    .where(eq(businessUsersTable.id, user.id));

  return res.redirect("https://www.hublondrina.com.br/lojista/login?verified=1");
});

router.post("/auth/forgot-password", forgotLimiter, csrfProtection, async (req: Request, res: Response) => {
  const { email } = req.body;
  const GENERIC = "Se o email existir, você receberá as instruções em breve.";

  if (!email) {
    res.json({ message: GENERIC });
    return;
  }

  const normalizedEmail = (email as string).toLowerCase().trim();

  const [user] = await db
    .select()
    .from(businessUsersTable)
    .where(eq(businessUsersTable.email, normalizedEmail));

  if (!user) {
    res.json({ message: GENERIC });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .update(businessUsersTable)
    .set({ passwordResetToken: token, passwordResetExpiresAt: expiresAt })
    .where(eq(businessUsersTable.id, user.id));

  const [business] = await db
    .select({ ownerName: businessesTable.ownerName })
    .from(businessesTable)
    .where(eq(businessesTable.id, user.businessId));

  const tpl = emails.recuperacaoSenha(business?.ownerName || "Lojista", token);
  const sent = await sendEmail(normalizedEmail, tpl.subject, tpl.html);
  if (!sent) {
    req.log.warn({ email: normalizedEmail }, "[Auth] Falha ao enviar email de recuperação de senha");
  }

  res.json({ message: GENERIC });
});

router.post("/auth/reset-password", resetLimiter, async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: "Token e nova senha são obrigatórios." });
    return;
  }

  if ((newPassword as string).length < 8) {
    res.status(400).json({ error: "Senha deve ter mínimo 8 caracteres." });
    return;
  }

  const [user] = await db
    .select()
    .from(businessUsersTable)
    .where(eq(businessUsersTable.passwordResetToken, token as string));

  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
    res.status(400).json({ error: "Token inválido ou expirado." });
    return;
  }

  const hash = await bcrypt.hash(newPassword as string, 10);
  await db
    .update(businessUsersTable)
    .set({ passwordHash: hash, passwordResetToken: null, passwordResetExpiresAt: null })
    .where(eq(businessUsersTable.id, user.id));

  res.json({ message: "Senha atualizada com sucesso." });
});

export default router;
