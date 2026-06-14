import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { aboutPageTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { csrfProtection } from "../middleware/csrf";
import { logAdminAction, getReqIp, ADMIN_DEFAULT_ID } from "../lib/audit";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

// ─── Defaults ────────────────────────────────────────────────────────────────
export const ABOUT_DEFAULTS: Record<string, { value: string; isCore: boolean; label: string; hint: string }> = {
  HERO_TITLE: {
    isCore: true,
    label: "Título principal (Hero)",
    hint: "Cabeçalho em destaque na parte superior da página.",
    value: "O hub do comércio local de Londrina",
  },
  HERO_SUBTITLE: {
    isCore: true,
    label: "Subtítulo (Hero)",
    hint: "Frase complementar abaixo do título.",
    value: "Hub Londrina nasceu do amor pela nossa cidade e da crença de que os melhores negócios estão aqui — na esquina da sua rua, no bairro onde você cresceu.",
  },
  STORY_TITLE: {
    isCore: true,
    label: "Título — Nossa História",
    hint: "Título da seção sobre a origem do projeto.",
    value: "Nossa História",
  },
  STORY_TEXT: {
    isCore: true,
    label: "Texto — Nossa História",
    hint: "Texto longo sobre a origem e motivação do projeto. Use \\n\\n para parágrafos.",
    value: "Em uma cidade que pulsa com a energia de quase 600 mil habitantes, percebemos que os negócios locais — o açougue do bairro, o salão que te atende há anos, a oficina de confiança — estavam cada vez mais invisíveis diante dos grandes portais digitais.\n\nFoi assim que o Hub Londrina nasceu: da vontade de devolver visibilidade a quem realmente move a economia da cidade. Não são as franquias que fazem Londrina ser Londrina — são os empreendedores que acordam cedo, que conhecem os clientes pelo nome, que reinvestem cada real aqui mesmo.\n\nCriamos uma plataforma onde qualquer negócio londrinense — do autônomo ao estabelecimento consolidado — pode se apresentar com profissionalismo, ser encontrado por quem realmente precisa do seu serviço, e crescer de forma sustentável dentro da própria cidade.",
  },
  MISSION_TITLE: {
    isCore: true,
    label: "Título — Nossa Missão",
    hint: "Título da seção de missão.",
    value: "Nossa Missão",
  },
  MISSION_TEXT: {
    isCore: true,
    label: "Texto — Nossa Missão",
    hint: "Declaração de missão da plataforma.",
    value: "Conectar londrinenses aos melhores negócios da sua cidade, valorizando o comércio local, fortalecendo as economias de bairro e celebrando quem faz Londrina ser Londrina.",
  },
  VALUES_TITLE: {
    isCore: true,
    label: "Título — Nossos Valores",
    hint: "Título da seção de valores.",
    value: "Os valores que nos guiam",
  },
  VALUES_ITEMS: {
    isCore: true,
    label: "Itens — Nossos Valores (JSON)",
    hint: 'Array JSON: [{"icon":"Heart","title":"...","text":"..."}]. Ícones disponíveis: Heart, Shield, TrendingUp, Star, Users, MapPin, Zap, Award.',
    value: JSON.stringify([
      { icon: "Heart", title: "Comunidade", text: "Acreditamos que negócios locais são o coração vivo de cada bairro. Quando você compra local, fortalece a vizinhança inteira." },
      { icon: "Shield", title: "Transparência", text: "Avaliações reais de clientes reais, informações verificadas e perfis honestos — sem filtros artificiais ou robôs." },
      { icon: "TrendingUp", title: "Crescimento", text: "Ferramentas digitais profissionais que antes só grandes empresas tinham, agora ao alcance de todo comerciante londrinense." },
      { icon: "Award", title: "Valorização", text: "Cada empreendedor londrinense merece estar em evidência. Nossa plataforma coloca o comércio local no centro do mapa digital." },
    ]),
  },
  BENEFITS_BIZ_TITLE: {
    isCore: true,
    label: "Título — Benefícios para Negócios",
    hint: "Título da seção de benefícios para comerciantes.",
    value: "Para quem tem negócio em Londrina",
  },
  BENEFITS_BIZ_ITEMS: {
    isCore: true,
    label: "Itens — Benefícios para Negócios (JSON)",
    hint: 'Array JSON: [{"icon":"...","title":"...","text":"..."}].',
    value: JSON.stringify([
      { icon: "MapPin", title: "Visibilidade por zona", text: "Seja encontrado por quem está no seu bairro. Organize sua presença digital por zona geográfica e alcance clientes próximos." },
      { icon: "Users", title: "Clientes certos", text: "Apareça para quem realmente procura o que você oferece. Motor de busca inteligente com sugestões patrocinadas." },
      { icon: "Zap", title: "Ferramentas completas", text: "Perfil profissional, vitrine de produtos, avaliações gerenciadas, métricas de acesso e impulsionamento estratégico — tudo em um painel simples." },
      { icon: "Star", title: "Destaque nos melhores momentos", text: "Boost na home, nas categorias e nas zonas: apareça exatamente quando e onde seus clientes estão procurando." },
    ]),
  },
  BENEFITS_CON_TITLE: {
    isCore: true,
    label: "Título — Benefícios para Consumidores",
    hint: "Título da seção de benefícios para quem procura serviços.",
    value: "Para quem mora e vive em Londrina",
  },
  BENEFITS_CON_ITEMS: {
    isCore: true,
    label: "Itens — Benefícios para Consumidores (JSON)",
    hint: 'Array JSON: [{"icon":"...","title":"...","text":"..."}].',
    value: JSON.stringify([
      { icon: "MapPin", title: "Perto de você", text: "Negócios organizados por zona da cidade — Centro, Norte, Sul, Leste e Oeste. Encontre o melhor da sua região." },
      { icon: "Shield", title: "Avaliações confiáveis", text: "Opiniões reais de clientes reais, moderadas pela nossa equipe. Nada de fake reviews ou pontuações infladas." },
      { icon: "Heart", title: "Contato direto", text: "WhatsApp direto com o negócio, sem intermediários, sem call center. A conversa é com quem realmente trabalha lá." },
    ]),
  },
  CTA_TITLE: {
    isCore: true,
    label: "Título — Call to Action",
    hint: "Título da seção de chamada para ação no final da página.",
    value: "Faça parte do Hub Londrina",
  },
  CTA_TEXT: {
    isCore: true,
    label: "Texto — Call to Action",
    hint: "Texto complementar do CTA.",
    value: "Seja você um comerciante que quer crescer ou um londrinense em busca dos melhores serviços da cidade — o Hub Londrina é o seu lugar.",
  },
};

export const ABOUT_CORE_KEYS = new Set(
  Object.entries(ABOUT_DEFAULTS)
    .filter(([, v]) => v.isCore)
    .map(([k]) => k)
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getAboutConfig(): Promise<Record<string, string>> {
  const rows = await db.select().from(aboutPageTable);
  const override: Record<string, string> = {};
  for (const r of rows) override[r.key] = r.value;
  const merged: Record<string, string> = {};
  for (const [k, def] of Object.entries(ABOUT_DEFAULTS)) {
    merged[k] = override[k] ?? def.value;
  }
  for (const [k, v] of Object.entries(override)) {
    if (!(k in ABOUT_DEFAULTS)) merged[k] = v;
  }
  return merged;
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) { res.status(401).json({ error: "Token não fornecido" }); return; }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { role?: string };
    if (payload.role !== "admin") { res.status(403).json({ error: "Acesso negado" }); return; }
    next();
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
}

// ─── PUBLIC ──────────────────────────────────────────────────────────────────
router.get("/about-page", async (_req: Request, res: Response) => {
  try {
    const data = await getAboutConfig();
    res.set("Cache-Control", "public, max-age=120");
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Falha ao carregar página Sobre Nós" });
  }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────
router.use("/admin/about-page", adminAuth);

router.get("/admin/about-page", async (_req: Request, res: Response) => {
  try {
    const dbRows = await db.select().from(aboutPageTable);
    const dbMap: Record<string, string> = {};
    for (const r of dbRows) dbMap[r.key] = r.value;

    const merged = Object.entries(ABOUT_DEFAULTS).map(([key, def]) => ({
      key,
      value: dbMap[key] ?? def.value,
      isCore: def.isCore,
      label: def.label,
      hint: def.hint,
      isOverridden: key in dbMap,
    }));

    const custom = dbRows
      .filter(r => !(r.key in ABOUT_DEFAULTS))
      .map(r => ({ key: r.key, value: r.value, isCore: false, label: r.key, hint: "", isOverridden: true }));

    res.json({ data: [...merged, ...custom] });
  } catch {
    res.status(500).json({ error: "Falha ao carregar" });
  }
});

const putSchema = z.object({ value: z.string().trim().min(1).max(50000) });

router.put("/admin/about-page/:key", csrfProtection, async (req: Request, res: Response) => {
  const key = String(req.params.key || "").trim();
  if (!key) { res.status(400).json({ error: "Chave inválida" }); return; }
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Valor inválido" }); return; }
  const { value } = parsed.data;

  await db
    .insert(aboutPageTable)
    .values({ key, value, isCore: ABOUT_CORE_KEYS.has(key), updatedAt: new Date(), updatedBy: "admin" })
    .onConflictDoUpdate({ target: aboutPageTable.key, set: { value, updatedAt: new Date(), updatedBy: "admin" } });

  await logAdminAction(ADMIN_DEFAULT_ID, "about_page.update", "about_page", 0, JSON.stringify({ key }), getReqIp(req));
  res.json({ success: true });
});

router.delete("/admin/about-page/:key", csrfProtection, async (req: Request, res: Response) => {
  const key = String(req.params.key || "").trim();
  if (ABOUT_CORE_KEYS.has(key)) { res.status(403).json({ error: "Chave principal não pode ser excluída — só editada." }); return; }
  await db.delete(aboutPageTable).where(eq(aboutPageTable.key, key));
  await logAdminAction(ADMIN_DEFAULT_ID, "about_page.delete", "about_page", 0, JSON.stringify({ key }), getReqIp(req));
  res.json({ success: true });
});

export default router;
