import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { registerLimiter, cnpjLimiter } from "../middleware/rateLimiter";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { businessesTable, businessUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, emails } from "../services/email";
import { generateCsrfToken, csrfProtection } from "../middleware/csrf";

const router: IRouter = Router();

router.get("/auth/csrf-token", (req: Request, res: Response) => {
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

router.post("/auth/register", registerLimiter, csrfProtection, async (req: Request, res: Response) => {
  const { name, email, password, businessName, cnpj, phone, categorySlug, zone, cep } = req.body;

  if (!name || !email || !password || !businessName || !cnpj || !phone || !categorySlug || !zone || !cep) {
    res.status(400).json({ error: "Todos os campos são obrigatórios" });
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

  const [business] = await db.insert(businessesTable).values({
    name: businessName.trim(),
    categorySlug,
    zone: selectedZone,
    region: selectedZone,
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
    status: "pending",
    description: "",
    address: street ? `${street}, ${neighborhood}` : "",
  }).returning();

  const passwordHash = await bcrypt.hash(password, 10);
  const verifyToken = randomBytes(32).toString("hex");
  const [newUser] = await db.insert(businessUsersTable).values({
    email: normalizedEmail,
    passwordHash,
    businessId: business.id,
    emailVerificationToken: verifyToken,
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

  res.status(201).json({
    message: "Cadastro recebido! Nossa equipe vai revisar em até 24h.",
    businessId: business.id,
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
    .set({ emailVerified: "true", emailVerificationToken: null })
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

  try {
    const tpl = emails.recuperacaoSenha(business?.ownerName || "Lojista", token);
    await sendEmail(normalizedEmail, tpl.subject, tpl.html);
  } catch {}

  res.json({ message: GENERIC });
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
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
