export type PlanId = "gratuito" | "base" | "premium";

export interface PlanPrice {
  price: string;
  sub: string;
  total?: string;
  economia?: string;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  tagline: string;
  mensal: PlanPrice;
  anual: PlanPrice;
  features: string[];
  popular?: boolean;
  /** valor usado em /cadastro?plano=<param> */
  cadastroParam: string;
}

/**
 * Fonte ÚNICA de verdade dos planos exibidos na Home e na página Anuncie.
 * Alterar nome, preço ou benefício aqui reflete automaticamente nas duas
 * páginas (via componente PlanCards). Os valores devem bater com replit.md.
 */
export const PLANS: PlanDef[] = [
  {
    id: "gratuito",
    name: "Gratuito",
    tagline: "Para começar a ser encontrado",
    mensal: { price: "R$0", sub: "/mês" },
    anual: { price: "R$0", sub: "/mês" },
    features: [
      "Perfil básico do negócio",
      "1 foto na galeria",
      "Link para WhatsApp",
      "Aparece nas buscas locais",
    ],
    cadastroParam: "gratuito",
  },
  {
    id: "base",
    name: "Base",
    tagline: "Para quem quer crescer de verdade",
    mensal: { price: "R$59,90", sub: "/mês" },
    anual: {
      price: "R$49,90",
      sub: "/mês",
      total: "cobrado R$598,80/ano",
      economia: "Economize R$120/ano",
    },
    features: [
      "Perfil completo e verificado",
      "Até 10 fotos na galeria",
      "Até 10 produtos no catálogo",
      "Link para WhatsApp e Redes",
      "Prioridade nas buscas locais",
      "Recebe e responde avaliações",
      "Estatísticas de visitas e cliques",
      "Selo de destaque no perfil",
      "Suporte por email",
    ],
    popular: true,
    cadastroParam: "destaque",
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Para máxima visibilidade em Londrina",
    mensal: { price: "R$89,90", sub: "/mês" },
    anual: {
      price: "R$79,90",
      sub: "/mês",
      total: "cobrado R$958,80/ano",
      economia: "Economize R$120/ano",
    },
    features: [
      "Tudo do plano Base",
      "Fotos ilimitadas na galeria",
      "Até 20 produtos no catálogo",
      "Vídeo de apresentação",
      "Banner rotativo na página inicial",
      "1º lugar absoluto nas buscas",
      "Postagem em destaque no blog",
      "Suporte prioritário via WhatsApp",
    ],
    cadastroParam: "premium",
  },
];

export function getPlan(id: PlanId): PlanDef {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Plano não encontrado: ${id}`);
  return plan;
}

export const ANNUAL_COMPARISON_NOTE =
  "Planos anuais cobrados à vista — Base R$598,80/ano · Premium R$958,80/ano";
export const MONTHLY_COMPARISON_NOTE =
  "Planos mensais sem fidelidade — mude para anual e economize R$120/ano em qualquer plano";
