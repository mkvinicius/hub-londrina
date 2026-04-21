import { useLocation } from "wouter";
import { MapPin, Star, ArrowRight, Award, MessageCircle, ThumbsUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Business } from "@workspace/api-client-react";

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

function getSemReclamacoes(business: Business): boolean {
  return business.rating >= 4.5 && business.reviewsCount >= 5;
}

export function BusinessCard({ business: biz, size = "md", showDistance = false }: BusinessCardProps) {
  const [, navigate] = useLocation();
  const bemAvaliado = getBemAvaliado(biz);
  const maisAvaliado = getMaisAvaliado(biz);
  const semReclamacoes = getSemReclamacoes(biz) && !bemAvaliado && !maisAvaliado;

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => navigate(`/negocio/${biz.id}`)}
    >
      <div className={`relative overflow-hidden flex-shrink-0 ${size === "sm" ? "h-40" : "h-48"}`}>
        <div className="absolute top-3 right-3 z-10 bg-white dark:bg-gray-900 px-2 py-1 rounded-full flex items-center gap-1 text-xs font-black text-[#3a2512] dark:text-gray-100 shadow">
          <Star className="h-3.5 w-3.5 fill-[#d97706] text-[#d97706]" />
          {biz.rating > 0 ? biz.rating : "Novo"}
        </div>
        {biz.photoUrl ? (
          <img
            src={biz.photoUrl}
            alt={biz.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="inline-block text-xs font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full uppercase tracking-wider w-fit">
            {biz.categorySlug}
          </span>
          {(biz as any).boostInfo?.isActive && (
            <span className="text-xs text-gray-400 font-normal ml-auto">Patrocinado</span>
          )}
          {!(biz as any).boostInfo?.isActive && (biz as any)._boostBadge === "Impulsionado" && (
            <span className="text-xs text-purple-500 font-semibold ml-auto">Impulsionado</span>
          )}
          {bemAvaliado && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ThumbsUp className="h-2.5 w-2.5" />
              Bem Avaliado
            </span>
          )}
          {maisAvaliado && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              <Star className="h-2.5 w-2.5" />
              Mais Avaliado
            </span>
          )}
          {semReclamacoes && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              <ShieldCheck className="h-2.5 w-2.5" />
              Sem Reclamações
            </span>
          )}
          {biz.planType === "premium" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <Award className="h-2.5 w-2.5" />
              Premium
            </span>
          )}
        </div>
        <h3 className="font-bold text-base text-[#3a2512] dark:text-gray-100 group-hover:text-[#d97706] dark:group-hover:text-[#d97706] transition-colors leading-tight mb-1">
          {biz.name}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 line-clamp-2 flex-grow">{biz.description}</p>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <MapPin className="h-3.5 w-3.5 text-[#d97706] flex-shrink-0" />
            {biz.region}
          </div>
          {showDistance && biz.distanceKm !== undefined && (
            <span className="text-xs text-[#d97706] font-semibold">{biz.distanceKm} km de você</span>
          )}
        </div>
        {biz.whatsapp ? (
          <a
            href={`https://wa.me/55${biz.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl text-sm font-bold h-9 shadow-none flex items-center gap-2 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </a>
        ) : (
          <Button className="w-full bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-sm font-bold h-9 shadow-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm">
            Ver Perfil <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
