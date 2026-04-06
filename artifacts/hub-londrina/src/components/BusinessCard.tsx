import { useLocation } from "wouter";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Business } from "@workspace/api-client-react";

interface BusinessCardProps {
  business: Business;
  size?: "sm" | "md";
}

export function BusinessCard({ business: biz, size = "md" }: BusinessCardProps) {
  const [, navigate] = useLocation();

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={() => navigate(`/negocio/${biz.id}`)}
    >
      <div className={`relative overflow-hidden flex-shrink-0 ${size === "sm" ? "h-40" : "h-48"}`}>
        <div className="absolute top-3 right-3 z-10 bg-white dark:bg-gray-900 px-2 py-1 rounded-full flex items-center gap-1 text-xs font-black text-[#3a2512] dark:text-gray-100 shadow">
          <Star className="h-3.5 w-3.5 fill-[#d97706] text-[#d97706]" />
          {biz.rating}
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
        <span className="inline-block text-xs font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider w-fit">
          {biz.categorySlug}
        </span>
        <h3 className="font-bold text-base text-[#3a2512] dark:text-gray-100 group-hover:text-[#d97706] dark:group-hover:text-[#d97706] transition-colors leading-tight mb-1">
          {biz.name}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 line-clamp-2 flex-grow">{biz.description}</p>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium mb-4">
          <MapPin className="h-3.5 w-3.5 text-[#d97706] flex-shrink-0" />
          {biz.region}
        </div>
        {biz.whatsapp ? (
          <a
            href={`https://wa.me/55${biz.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl text-sm font-bold h-9 shadow-none">
              WhatsApp
            </Button>
          </a>
        ) : (
          <Button className="w-full bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl text-sm font-bold h-9 shadow-none">
            Ver Perfil <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
