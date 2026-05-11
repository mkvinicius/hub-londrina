import { ThumbsUp, Trophy, CheckCircle2, Sparkles, BadgeCheck, type LucideIcon } from "lucide-react";

// Limiares centralizados — qualquer ajuste aqui propaga para card, perfil
// público e qualquer outro lugar que importe getBadges(). Ranking de busca no
// backend continua independente (PLAN_ORDER + rating), mas se um dia for
// preciso usar os mesmos thresholds no servidor, basta importar este módulo
// (sem dependências de UI no cálculo).

export const BADGE_THRESHOLDS = {
  novo_dias: 30,                  // Negócio cadastrado há até 30 dias
  confiavel_rating: 4.5,
  confiavel_reviews: 5,
  bem_avaliado_rating: 4.7,
  bem_avaliado_reviews: 10,
  mais_avaliado_reviews: 20,
} as const;

export type AutoBadgeKey = "novo" | "confiavel" | "bem_avaliado" | "mais_avaliado";

export interface BadgeMeta {
  key: AutoBadgeKey;
  label: string;
  tone: "blue" | "purple" | "green" | "teal";
  icon: LucideIcon;
  tooltip: string;
}

export const BADGE_META: Record<AutoBadgeKey, BadgeMeta> = {
  novo: {
    key: "novo",
    label: "Novo",
    tone: "teal",
    icon: Sparkles,
    tooltip: `Cadastrado há menos de ${BADGE_THRESHOLDS.novo_dias} dias no Hub Londrina. Dê uma chance e deixe sua avaliação!`,
  },
  confiavel: {
    key: "confiavel",
    label: "Confiável",
    tone: "green",
    icon: BadgeCheck,
    tooltip: `Selo automático: nota ≥ ${BADGE_THRESHOLDS.confiavel_rating} com pelo menos ${BADGE_THRESHOLDS.confiavel_reviews} avaliações. Não confundir com o selo "Verificado", concedido manualmente pela equipe Hub Londrina.`,
  },
  bem_avaliado: {
    key: "bem_avaliado",
    label: "Bem Avaliado",
    tone: "blue",
    icon: ThumbsUp,
    tooltip: `Selo automático: nota ≥ ${BADGE_THRESHOLDS.bem_avaliado_rating} com pelo menos ${BADGE_THRESHOLDS.bem_avaliado_reviews} avaliações. Reflete consistência de boa experiência.`,
  },
  mais_avaliado: {
    key: "mais_avaliado",
    label: "Mais Avaliado",
    tone: "purple",
    icon: Trophy,
    tooltip: `Selo automático: pelo menos ${BADGE_THRESHOLDS.mais_avaliado_reviews} avaliações de clientes. Reflete volume de movimento e popularidade.`,
  },
};

interface BadgeInput {
  rating?: number | null;
  reviewsCount?: number | null;
  createdAt?: string | Date | null;
}

/**
 * Calcula quais selos automáticos o negócio merece, na ordem em que devem ser
 * exibidos. "Confiável" só aparece se o negócio NÃO ganhou Bem Avaliado nem
 * Mais Avaliado (evita poluição visual com 3 selos similares). "Novo" é
 * mutuamente exclusivo com os de mérito (negócio recente ainda não teve tempo
 * de acumular reviews).
 */
export function getAutoBadges(biz: BadgeInput): BadgeMeta[] {
  const rating = Number(biz.rating ?? 0);
  const reviews = Number(biz.reviewsCount ?? 0);

  const isNovo = (() => {
    if (!biz.createdAt) return false;
    const created = new Date(biz.createdAt).getTime();
    if (!Number.isFinite(created)) return false;
    const days = (Date.now() - created) / 86_400_000;
    return days >= 0 && days <= BADGE_THRESHOLDS.novo_dias;
  })();

  const bemAvaliado =
    rating >= BADGE_THRESHOLDS.bem_avaliado_rating &&
    reviews >= BADGE_THRESHOLDS.bem_avaliado_reviews;

  const maisAvaliado = reviews >= BADGE_THRESHOLDS.mais_avaliado_reviews;

  const confiavel =
    !bemAvaliado &&
    !maisAvaliado &&
    rating >= BADGE_THRESHOLDS.confiavel_rating &&
    reviews >= BADGE_THRESHOLDS.confiavel_reviews;

  // "Novo" só faz sentido quando o negócio AINDA não tem mérito acumulado.
  // Caso contrário, o selo de mérito é mais informativo.
  const showNovo = isNovo && !confiavel && !bemAvaliado && !maisAvaliado;

  const out: BadgeMeta[] = [];
  if (showNovo) out.push(BADGE_META.novo);
  if (confiavel) out.push(BADGE_META.confiavel);
  if (bemAvaliado) out.push(BADGE_META.bem_avaliado);
  if (maisAvaliado) out.push(BADGE_META.mais_avaliado);
  return out;
}
