import { useLocation } from "wouter";
import {
  MapPin,
  Star,
  Heart,
  Crown,
  MessageCircle,
  ArrowRight,
  ThumbsUp,
  CheckCircle2,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { imgSrc } from "@/lib/utils";
import type { Business } from "@workspace/api-client-react";
import type { LucideIcon } from "lucide-react";

interface BusinessCardProps {
  business: Business;
  size?: "sm" | "md";
  showDistance?: boolean;
}

function getBemAvaliado(business: Business): boolean {
  return business.rating >= 4.7 && business.reviewsCount >= 10;
}

function getMaisAvaliado(business: Business): boolean {
  return business.reviewsCount >= 20;
}

function getVerificado(business: Business): boolean {
  return business.rating >= 4.5 && business.reviewsCount >= 5;
}

// Família visual unificada das pílulas (fundo claro + texto/ícone do tom).
type PillTone = "orange" | "gold" | "green" | "blue" | "purple";

const PILL_TONE: Record<PillTone, string> = {
  orange: "text-orange-700 bg-orange-50 ring-1 ring-orange-100",
  gold: "text-amber-700 bg-amber-50 ring-1 ring-amber-100",
  green: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100",
  blue: "text-blue-700 bg-blue-50 ring-1 ring-blue-100",
  purple: "text-violet-700 bg-violet-50 ring-1 ring-violet-100",
};

function Pill({
  icon: Icon,
  label,
  tone,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  tone: PillTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${PILL_TONE[tone]} ${className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// Iniciais para fallback quando o lojista não tem logoUrl.
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function BusinessCard({ business: biz, size = "md", showDistance = false }: BusinessCardProps) {
  const [, navigate] = useLocation();
  const bemAvaliado = getBemAvaliado(biz);
  const maisAvaliado = getMaisAvaliado(biz);
  const verificado = getVerificado(biz) && !bemAvaliado && !maisAvaliado;
  const isPremium = biz.planType === "premium";
  const isPatrocinado = (biz as any).boostInfo?.isActive === true;
  const isImpulsionado = !isPatrocinado && (biz as any)._boostBadge === "Impulsionado";

  // Capa: prioriza bannerUrl (subido em "Fotos" do painel), cai em photoUrl.
  const cardImg = imgSrc((biz as any).bannerUrl || biz.photoUrl);
  const logoImg = imgSrc((biz as any).logoUrl);

  const bannerH = size === "sm" ? "h-36" : "h-44";
  const logoSize = size === "sm" ? "w-20 h-20" : "w-[88px] h-[88px]";
  const logoOffset = size === "sm" ? "-top-10" : "-top-11";

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => navigate(`/negocio/${biz.id}`)}
    >
      {/* Banner com rating + favorito */}
      <div className={`relative overflow-hidden flex-shrink-0 ${bannerH}`}>
        {cardImg ? (
          <img
            src={cardImg}
            alt={biz.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
        )}
        <div className="absolute top-3 left-3 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black text-[#3a2512] dark:text-gray-100 shadow-sm">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
          {biz.rating > 0 ? biz.rating : "Novo"}
        </div>
        <button
          aria-label="Favoritar"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-gray-900/95 backdrop-blur flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors shadow-sm"
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* Badges de boost flutuantes no banner */}
        {(isPatrocinado || isImpulsionado) && (
          <div className="absolute bottom-3 left-3 z-10">
            {isPatrocinado ? (
              <Pill icon={Zap} label="Patrocinado" tone="orange" />
            ) : (
              <Pill icon={Zap} label="Impulsionado" tone="purple" />
            )}
          </div>
        )}
      </div>

      {/* Logo redonda flutuante centralizada na divisa */}
      <div className="relative">
        <div className={`absolute left-1/2 -translate-x-1/2 ${logoOffset} z-10`}>
          <div className={`${logoSize} rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white overflow-hidden`}>
            {logoImg ? (
              <img src={logoImg} alt={`Logo ${biz.name}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6F4E37] to-[#3a2512] flex items-center justify-center text-white">
                <span className="font-['Playfair_Display'] text-lg font-bold">{getInitials(biz.name)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo centralizado */}
      <div className={`pt-12 px-5 pb-5 flex flex-col flex-grow text-center ${size === "sm" ? "pt-10" : ""}`}>
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
          <span className="inline-block text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            {biz.categorySlug}
          </span>
          {isPremium && <Pill icon={Crown} label="Premium" tone="gold" />}
          {verificado && <Pill icon={CheckCircle2} label="Verificado" tone="green" />}
          {bemAvaliado && <Pill icon={ThumbsUp} label="Bem Avaliado" tone="blue" />}
          {maisAvaliado && <Pill icon={Trophy} label="Mais Avaliado" tone="purple" />}
        </div>

        <h3 className="font-black text-lg text-[#1a1a1a] dark:text-gray-100 group-hover:text-[#d97706] dark:group-hover:text-[#d97706] transition-colors leading-tight tracking-tight">
          {biz.name}
        </h3>

        {biz.description && (
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 line-clamp-2 leading-snug">
            {biz.description}
          </p>
        )}

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mt-3 mb-4">
          <MapPin className="h-3.5 w-3.5 text-[#d97706] flex-shrink-0" />
          {biz.region}
          {showDistance && (biz as any).distanceKm !== undefined && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-[#d97706] font-semibold">{(biz as any).distanceKm} km</span>
            </>
          )}
        </div>

        {biz.whatsapp ? (
          <a
            href={`https://wa.me/55${biz.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-auto"
          >
            <Button className="group relative w-full overflow-hidden bg-gradient-to-b from-[#25D366] via-[#1ebe57] to-[#159a45] text-white rounded-2xl text-sm font-bold h-11 flex items-center justify-center gap-2 ring-1 ring-inset ring-white/25 shadow-[0_10px_24px_-6px_rgba(34,197,94,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(34,197,94,0.7),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:translate-y-0 active:shadow-[0_4px_12px_-2px_rgba(34,197,94,0.5),inset_0_1px_0_rgba(255,255,255,0.3)]">
              <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
              <MessageCircle className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative" />
              <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">WhatsApp</span>
            </Button>
          </a>
        ) : (
          // Mesmo glamour do WhatsApp (gradiente vertical, sheen no hover, ring inset, glow)
          // mas em laranja-marca pra não confundir o usuário com a CTA verde de WhatsApp.
          <Button className="group relative mt-auto w-full overflow-hidden bg-gradient-to-b from-[#f5a623] via-[#d97706] to-[#a04d06] text-white rounded-2xl text-sm font-bold h-11 flex items-center justify-center gap-2 ring-1 ring-inset ring-white/25 shadow-[0_10px_24px_-6px_rgba(217,119,6,0.55),inset_0_1px_0_rgba(255,220,120,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(217,119,6,0.7),inset_0_1px_0_rgba(255,220,120,0.4)] hover:brightness-110 active:translate-y-0 active:shadow-[0_4px_12px_-2px_rgba(217,119,6,0.5),inset_0_1px_0_rgba(255,220,120,0.3)]">
            <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
            <ArrowRight className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative" />
            <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">Ver Perfil</span>
          </Button>
        )}
      </div>
    </div>
  );
}
