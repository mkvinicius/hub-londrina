import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search, ArrowRight, ArrowLeft, Quote,
  CheckCircle2, ChevronDown, Zap, MessageCircle, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { useListCategories, useListBusinesses } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";
import { BusinessCard } from "@/components/BusinessCard";
import { imgSrc } from "@/lib/utils";
import { useSeo } from "@/lib/seo";

const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Hub Londrina",
  url: "https://www.hublondrina.com.br",
  inLanguage: "pt-BR",
  description: "Diretório de negócios locais de Londrina/PR. Restaurantes, salões, clínicas, oficinas, comércio e serviços.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.hublondrina.com.br/busca?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

interface VitrineCardData {
  productId: number;
  businessId: number;
  name: string;
  price: string | null;
  videoUrl: string;
  photoUrl: string | null;
  images: string[];
  whatsapp: string | null;
  businessName: string;
  fixed: boolean;
}

function buildVitrineWaUrl(p: VitrineCardData): string | null {
  const waNumber = (p.whatsapp || "").replace(/\D/g, "");
  if (!waNumber) return null;
  const normalized = waNumber.startsWith("55") ? waNumber : `55${waNumber}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Olá! Vi o *${p.name}* da *${p.businessName}* no Hub Londrina e tenho interesse!`)}`;
}

// R11/T9 — Modal aberto quando o produto da Vitrine tem múltiplas fotos.
// Mostra carrossel + WhatsApp + link para o perfil do negócio. Quando o produto
// tem só 1 foto, o card mantém o comportamento antigo (navegar para o perfil).
function VitrineDetailModal({
  card,
  onClose,
  onOpenBusiness,
}: {
  card: VitrineCardData | null;
  onClose: () => void;
  onOpenBusiness: (businessId: number) => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setPhotoIdx(0); }, [card?.productId]);

  const photos = card?.images ?? [];
  const waUrl = card ? buildVitrineWaUrl(card) : null;

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {card && (
          <>
            <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800">
              {photos.length > 0 ? (
                <img
                  src={imgSrc(photos[Math.min(photoIdx, photos.length - 1)])}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              ) : card.photoUrl ? (
                <img src={imgSrc(card.photoUrl)} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
              )}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Foto anterior"
                    onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute top-1/2 -translate-y-1/2 left-2 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próxima foto"
                    onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                    className="absolute top-1/2 -translate-y-1/2 right-2 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/75"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Ir para foto ${i + 1}`}
                        onClick={() => setPhotoIdx(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? "bg-white w-4" : "bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="px-3 pt-3 flex gap-2 overflow-x-auto">
                {photos.map((u, i) => (
                  <button
                    key={`${u}-${i}`}
                    type="button"
                    onClick={() => setPhotoIdx(i)}
                    className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${i === photoIdx ? "border-[#d97706]" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={imgSrc(u)} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="p-6">
              <DialogHeader>
                <span className="text-[10px] font-bold text-[#d97706] uppercase tracking-wider mb-1 block">{card.businessName}</span>
                <DialogTitle className="text-xl font-black text-[#3a2512] dark:text-gray-100">{card.name}</DialogTitle>
                <DialogDescription className="sr-only">Detalhes do produto {card.name}</DialogDescription>
              </DialogHeader>
              {card.price && (
                <p className="text-[#d97706] font-black text-2xl mt-2">R$ {card.price}</p>
              )}
              <div className="mt-5 flex flex-col gap-2">
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#25D366] via-[#1ebe57] to-[#159a45] text-white font-black px-4 py-3 rounded-xl shadow-[0_6px_16px_-4px_rgba(34,197,94,0.55)] hover:brightness-110 transition-all"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Pedir no WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenBusiness(card.businessId); }}
                  className="w-full flex items-center justify-center gap-2 border border-[#d97706] text-[#d97706] hover:bg-[#fff5ea] font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver perfil do negócio
                </button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VitrineCard({ p, onClick }: { p: VitrineCardData; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => video.play().catch(() => {});

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      },
      { threshold: 0.1 }
    );
    observer.observe(video);

    const onTouch = () => tryPlay();
    document.addEventListener("touchstart", onTouch, { once: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("touchstart", onTouch);
    };
  }, []);

  const priceLabel = p.price ? `R$ ${p.price}` : "";
  const waNumber = (p.whatsapp || "").replace(/\D/g, "");
  const waUrl = waNumber
    ? `https://wa.me/${waNumber.startsWith("55") ? waNumber : "55" + waNumber}?text=${encodeURIComponent(`Olá! Vi o *${p.name}* da *${p.businessName}* no Hub Londrina e tenho interesse!`)}`
    : null;

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 md:flex-shrink relative rounded-2xl overflow-hidden cursor-pointer group w-[82vw] md:w-full vitrine-card"
      style={{
        scrollSnapAlign: "start",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      {p.photoUrl && (
        <div className="absolute inset-0" style={{ backgroundImage: `url(${imgSrc(p.photoUrl)})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={p.videoUrl} type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.08) 100%)" }} />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider truncate">{p.businessName}</span>
        {p.fixed && <span className="text-[9px] font-bold text-[#FF9800] uppercase tracking-wider">★ destaque</span>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
        <div>
          <p className="text-white font-black text-sm leading-tight mb-0.5">{p.name}</p>
          {priceLabel && <p className="text-white font-bold text-base leading-tight">{priceLabel}</p>}
        </div>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-b from-[#25D366] via-[#1ebe57] to-[#159a45] ring-1 ring-inset ring-white/25 shadow-[0_8px_20px_-4px_rgba(34,197,94,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_26px_-6px_rgba(34,197,94,0.7),inset_0_1px_0_rgba(255,255,255,0.4)]"
            onClick={e => e.stopPropagation()}
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
            <svg className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] relative" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">Pedir no WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
}

const testimonials = [
  {
    name: "Mariana Costa",
    role: "Moradora da Zona Sul",
    content: "Achei uma padaria artesanal a 3 quadras de casa que eu não sabia que existia. Agora compro lá toda semana.",
    initials: "MC",
    bg: "bg-pink-100 text-pink-700",
  },
  {
    name: "Roberto Silva",
    role: "Dono de oficina, Zona Norte",
    content: "Na primeira semana já recebi contato de cliente novo pelo WhatsApp. O perfil paga ele mesmo.",
    initials: "RS",
    bg: "bg-blue-100 text-blue-700",
  },
  {
    name: "Juliana Alves",
    role: "Estudante, Centro",
    content: "Uso toda vez que preciso de algum serviço aqui em Londrina. Muito melhor do que ficar perguntando no grupo do WhatsApp.",
    initials: "JA",
    bg: "bg-green-100 text-green-700",
  },
];

export default function Landing() {
  useSeo({
    title: "Hub Londrina — Diretório de negócios locais em Londrina/PR",
    description: "Encontre restaurantes, salões, clínicas, oficinas, comércio e serviços em Londrina/PR. Feito por londrinense, para londrinense.",
    canonicalPath: "/",
    ogImage: "/opengraph.jpg",
    jsonLd: HOME_JSON_LD,
  });
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [, navigate] = useLocation();

  const [homeBanners, setHomeBanners] = useState<{ id: number; title: string | null; imageUrl: string; linkUrl: string | null; businessId: number | null }[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  // T9 — produto da Vitrine selecionado para o modal/carrossel (>1 foto).
  const [vitrineModal, setVitrineModal] = useState<VitrineCardData | null>(null);

  const { data: categoriesData } = useListCategories();
  const { data: featuredData } = useListBusinesses({ sort: "rating" });

  const categories = categoriesData?.data ?? [];
  const featuredBusinesses = (featuredData?.data ?? []).slice(0, 4);

  const BASE = import.meta.env.VITE_API_URL || "";

  const { data: platformStats } = useQuery<{ businesses: number; categories: number; regions: number; totalClicks: number; totalUsers: number }>({
    queryKey: ["/api/stats"],
    queryFn: () => fetch(`${BASE}/api/stats`).then(r => r.json()),
    staleTime: 60_000,
  });

  // R11 — Vitrine de Produtos. Servidor já aplica regra "<6 esconde" (cards=[]).
  // staleTime 0 + no-store no servidor garantem rotação aleatória a cada visita.
  const { data: vitrineData } = useQuery<{ cards: VitrineCardData[] }>({
    queryKey: ["/api/vitrine"],
    queryFn: () => fetch(`${BASE}/api/vitrine`).then(r => r.json()),
    staleTime: 0,
    gcTime: 0,
  });
  const vitrineCards = vitrineData?.cards ?? [];

  const [dynamicRegions, setDynamicRegions] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${BASE}/api/regions`)
      .then(r => r.json())
      .then(d => setDynamicRegions(d.data || []))
      .catch(() => {});
    fetch(`${BASE}/api/home-banners`)
      .then(r => r.json())
      .then(d => setHomeBanners(d.data || []))
      .catch(() => {});
  }, [BASE]);

  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % homeBanners.length), 5000);
    return () => clearInterval(t);
  }, [homeBanners.length]);

  const regions = ["Todas as regiões", ...dynamicRegions];

  const ZONE_REDIRECT: Record<string, string> = {
    "Centro": "/centro",
    "Zona Norte": "/norte",
    "Zona Sul": "/sul",
    "Zona Leste": "/leste",
    "Zona Oeste": "/oeste",
  };

  const ZONE_OPTIONS = [
    { label: "Centro", path: "/centro" },
    { label: "Zona Norte", path: "/norte" },
    { label: "Zona Sul", path: "/sul" },
    { label: "Zona Leste", path: "/leste" },
    { label: "Zona Oeste", path: "/oeste" },
  ];

  function handleSearch() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (region && region !== "Todas as regiões" && !ZONE_REDIRECT[region]) params.set("regiao", region);
    if (region && ZONE_REDIRECT[region]) {
      navigate(ZONE_REDIRECT[region]);
      return;
    }
    navigate(`/busca?${params.toString()}`);
  }

  // ─── Autocomplete (mesmo /api/autocomplete da página /busca: Patrocinados primeiro) ───
  interface AcItem { id: number; name: string; categorySlug: string }
  const [acSponsored, setAcSponsored] = useState<AcItem[]>([]);
  const [acSuggestions, setAcSuggestions] = useState<AcItem[]>([]);
  const [acOpen, setAcOpen] = useState(false);
  const acRef = useRef<HTMLDivElement>(null);
  const acTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

  const fetchAutocomplete = useCallback((q: string) => {
    if (q.length < 2) { setAcSponsored([]); setAcSuggestions([]); setAcOpen(false); return; }
    if (acTimer.current) clearTimeout(acTimer.current);
    acTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setAcSponsored(data.sponsored || []);
        setAcSuggestions(data.suggestions || []);
        setAcOpen((data.sponsored?.length || data.suggestions?.length) > 0);
      } catch {
        setAcOpen(false);
      }
    }, 250);
  }, [API_BASE]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (acRef.current && !acRef.current.contains(e.target as Node)) setAcOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectAcItem(name: string) {
    setQuery(name);
    setAcOpen(false);
    const params = new URLSearchParams({ q: name });
    if (region && region !== "Todas as regiões" && !ZONE_REDIRECT[region]) params.set("regiao", region);
    navigate(`/busca?${params.toString()}`);
  }

  return (
    <Layout>
      {/* ===== HERO SECTION ===== */}
      {/* B6: hero ocupa 100svh no mobile (evita "salto" da barra de URL),
          mantém clamp(480-700px) a partir de md. */}
      <div
        className="relative w-full min-h-[100svh] md:min-h-0"
        style={{ height: "clamp(480px, 72vh, 700px)" }}
      >
        {/* Background image — full, sem ofuscação */}
        <img
          src="/hero-empreendedores.jpg"
          alt="Empreendedores locais de Londrina"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Overlay escuro leve só para legibilidade do texto */}
        <div className="absolute inset-0 bg-black/45" />

        {/* Content — absolutamente centrado */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center">
          <h1
            className="font-black uppercase leading-tight mb-4 max-w-4xl text-white"
            style={{
              fontSize: "clamp(1.8rem, 4.5vw, 3.4rem)",
              letterSpacing: "0.01em",
              textShadow: "0 2px 20px rgba(0,0,0,0.5)",
            }}
          >
            Feito por londrinense. Para londrinense.
          </h1>

          <p
            className="text-white text-base md:text-lg font-medium mb-10"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
          >
            Aqui você encontra negócios de verdade — da sua cidade, do seu bairro, de gente que vive do mesmo lado que você.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-3xl" ref={acRef}>
            <div
              className="flex flex-col sm:flex-row overflow-visible relative z-40 rounded-2xl p-1.5 gap-1.5"
              style={{
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {/* Text input */}
              <div className="relative flex flex-1 items-center px-4 py-3 gap-3 rounded-xl bg-gray-50/80">
                <Search className="h-5 w-5 text-[#d97706] flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); fetchAutocomplete(e.target.value); }}
                  onFocus={() => { if (query.length >= 2 && (acSponsored.length || acSuggestions.length)) setAcOpen(true); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Restaurante, salão, mecânica..."
                  className="flex-1 text-base text-gray-700 placeholder:text-gray-400 outline-none bg-transparent font-medium"
                />
              </div>

              {/* Autocomplete dropdown — Patrocinados primeiro, depois sugestões */}
              {acOpen && (acSponsored.length > 0 || acSuggestions.length > 0) && (
                <div
                  className="absolute left-1.5 right-1.5 top-full mt-2 bg-white rounded-2xl border border-gray-100 overflow-hidden text-left"
                  style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)", zIndex: 50 }}
                >
                  {acSponsored.length > 0 && (
                    <>
                      <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Patrocinados</span>
                      </div>
                      {acSponsored.map(item => {
                        const Icon = getCategoryIcon(item.categorySlug);
                        return (
                          <button key={`sp-${item.id}`} type="button" onMouseDown={() => selectAcItem(item.name)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left">
                            <Icon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-gray-800 flex-1">{item.name}</span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Patrocinado</span>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {acSponsored.length > 0 && acSuggestions.length > 0 && (
                    <div className="mx-4 border-t border-gray-100" />
                  )}
                  {acSuggestions.length > 0 && (
                    <>
                      {acSponsored.length > 0 && (
                        <div className="px-4 pt-2 pb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Sugestões</span>
                        </div>
                      )}
                      {acSuggestions.map(item => {
                        const Icon = getCategoryIcon(item.categorySlug);
                        return (
                          <button key={`sg-${item.id}`} type="button" onMouseDown={() => selectAcItem(item.name)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                            <Icon className="h-4 w-4 text-gray-300 flex-shrink-0" />
                          </button>
                        );
                      })}
                    </>
                  )}
                  <div className="h-2" />
                </div>
              )}

              {/* Region dropdown */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setRegionOpen(!regionOpen)}
                  className="flex items-center gap-3 px-5 py-3 text-base font-semibold text-gray-700 whitespace-nowrap w-full sm:w-auto rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors h-full"
                >
                  <span className="text-sm">{region || "Selecione a Região"}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${regionOpen ? "rotate-180" : ""}`} />
                </button>
                {regionOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl min-w-[220px] py-2 overflow-hidden overflow-y-auto max-h-80"
                    style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)", zIndex: 9999 }}>
                    {/* Opção todas */}
                    <button
                      type="button"
                      onClick={() => { setRegion(""); setRegionOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[#FFF3E0] transition-colors ${!region ? "text-[#d97706] bg-[#FFF3E0]" : "text-gray-700"}`}
                    >
                      Todas as regiões
                    </button>
                    {/* Separador — Zonas */}
                    <div className="px-4 pt-2 pb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Explorar por zona</span>
                    </div>
                    {ZONE_OPTIONS.map((z) => (
                      <button
                        key={z.path}
                        type="button"
                        onClick={() => { setRegionOpen(false); navigate(z.path); }}
                        className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-[#FFF3E0] transition-colors flex items-center gap-2 ${region === z.label ? "text-[#d97706] bg-[#FFF3E0]" : "text-gray-800"}`}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor:
                          z.path === "/centro" ? "#dc2626" :
                          z.path === "/norte"  ? "#3d7a28" :
                          z.path === "/sul"    ? "#2563eb" :
                          z.path === "/leste"  ? "#d97706" : "#7c3aed"
                        }} />
                        {z.label}
                      </button>
                    ))}
                    {/* Separador — Bairros */}
                    {dynamicRegions.length > 0 && (
                      <div className="px-4 pt-2 pb-1 border-t border-gray-50 mt-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Por bairro</span>
                      </div>
                    )}
                    {dynamicRegions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRegion(r); setRegionOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-[#FFF3E0] transition-colors ${region === r ? "text-[#d97706] bg-[#FFF3E0]" : "text-gray-700"}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Buscar button — floating card */}
              <button
                type="button"
                onClick={handleSearch}
                className="flex items-center justify-center gap-2 text-white font-bold text-base px-7 py-3 transition-all duration-200 active:scale-[0.97] active:translate-y-0.5 flex-shrink-0"
                style={{
                  borderRadius: "999px",
                  background: "linear-gradient(170deg, #f5a623 0%, #d97706 45%, #a04d06 100%)",
                  boxShadow: "0 6px 20px rgba(160,77,6,0.55), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,220,120,0.35), inset 0 -2px 0 rgba(0,0,0,0.2)",
                  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  transform: "translateY(-1px)",
                }}
                onMouseEnter={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = "linear-gradient(170deg, #f7bc45 0%, #e8940a 45%, #b45309 100%)";
                  btn.style.boxShadow = "0 10px 28px rgba(160,77,6,0.6), 0 4px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,220,120,0.4), inset 0 -2px 0 rgba(0,0,0,0.2)";
                  btn.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = "linear-gradient(170deg, #f5a623 0%, #d97706 45%, #a04d06 100%)";
                  btn.style.boxShadow = "0 6px 20px rgba(160,77,6,0.55), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,220,120,0.35), inset 0 -2px 0 rgba(0,0,0,0.2)";
                  btn.style.transform = "translateY(-1px)";
                }}
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HOME BANNERS ===== */}
      {homeBanners.length > 0 && (
        <div className="bg-gray-50 py-4 px-4">
          <div className="max-w-5xl mx-auto relative overflow-hidden rounded-2xl shadow-md">
            {homeBanners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`transition-opacity duration-700 ${idx === bannerIdx ? "opacity-100" : "opacity-0 absolute inset-0"}`}
              >
                {banner.linkUrl || banner.businessId ? (
                  <a
                    href={banner.linkUrl || `/negocio/${banner.businessId}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        const r = await fetch(`${BASE}/api/home-banners/${banner.id}/click`, { method: "POST" });
                        const j = await r.json().catch(() => ({}));
                        const target = j.redirectTo || banner.linkUrl || `/negocio/${banner.businessId}`;
                        if (target.startsWith("/")) navigate(target);
                        else window.open(target, "_blank", "noopener,noreferrer");
                      } catch {
                        const target = banner.linkUrl || `/negocio/${banner.businessId}`;
                        if (target.startsWith("/")) navigate(target);
                        else window.open(target, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <img src={banner.imageUrl} alt={banner.title || ""} className="w-full h-36 md:h-48 object-cover rounded-2xl" />
                  </a>
                ) : (
                  <img src={banner.imageUrl} alt={banner.title || ""} className="w-full h-36 md:h-48 object-cover rounded-2xl" />
                )}
              </div>
            ))}
            {homeBanners.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {homeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBannerIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === bannerIdx ? "bg-white scale-125" : "bg-white/50"}`}
                  />
                ))}
              </div>
            )}
            <div className="absolute top-2 right-3 text-[10px] text-white/70 font-medium bg-black/30 px-2 py-0.5 rounded-full">
              Publicidade
            </div>
          </div>
        </div>
      )}

      {/* ===== CATEGORIES SECTION ===== */}
      <section
        style={{
          background: "linear-gradient(145deg, #fef3c7 0%, #fff7ed 40%, #fef0d0 70%, #fde8b8 100%)",
          paddingBottom: "64px",
        }}
      >
        {/* Stats card — glassmorphism flutuante, dentro da seção para não vazar branco */}
        <div className="relative z-10 flex justify-center px-4 mb-10" style={{ marginTop: "-36px" }}>
          <div
            className="grid grid-cols-4 text-white"
            style={{
              width: "800px",
              maxWidth: "calc(100% - 32px)",
              minHeight: "72px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(111,78,55,0.85) 0%, rgba(58,37,18,0.92) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.40), 0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            {[
              { value: platformStats ? `+${platformStats.businesses}` : "…", label: "Negócios" },
              { value: platformStats ? `+${platformStats.totalUsers}` : "…", label: "Lojistas" },
              { value: platformStats ? String(platformStats.categories) : "…", label: "Categorias" },
              { value: platformStats ? String((platformStats as any).totalZones ?? 5) : "5", label: "Regiões" },
            ].map((stat, i, arr) => (
              <div key={stat.label} className="flex items-center justify-center">
                <div className="flex flex-col items-center gap-0.5 py-4 px-2">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                    {stat.value}
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/60 font-bold">
                    {stat.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className="w-px h-10 bg-white/15" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-1 block">Negócios do seu bairro, da sua cidade</span>
              <h2 className="font-black text-3xl md:text-4xl text-[#3a2512]">Quando você compra local, Londrina cresce.</h2>
            </div>
            <button
              onClick={() => navigate("/categorias")}
              className="hidden md:flex items-center gap-2 text-sm font-bold text-[#d97706] hover:text-[#b45309] transition-colors whitespace-nowrap"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {categories.slice(0, 10).map((category) => {
              const Icon = getCategoryIcon(category.icon);
              const colorClasses = getCategoryColorClasses(category.color);
              return (
                <button
                  key={category.id}
                  onClick={() => navigate(`/busca?categoria=${category.slug}`)}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.62)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.85)",
                    boxShadow: "0 4px 20px rgba(111,78,55,0.10), 0 1px 4px rgba(0,0,0,0.04)",
                    transform: "translateY(0px)",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(-5px)";
                    el.style.boxShadow = "0 12px 36px rgba(111,78,55,0.18), 0 4px 12px rgba(217,119,6,0.12)";
                    el.style.background = "rgba(255,255,255,0.85)";
                    el.style.border = "1px solid rgba(217,119,6,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.transform = "translateY(0px)";
                    el.style.boxShadow = "0 4px 20px rgba(111,78,55,0.10), 0 1px 4px rgba(0,0,0,0.04)";
                    el.style.background = "rgba(255,255,255,0.62)";
                    el.style.border = "1px solid rgba(255,255,255,0.85)";
                  }}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="font-bold text-sm text-center text-[#3a2512] group-hover:text-[#d97706] transition-colors leading-tight">
                    {category.name}
                  </span>
                  {category.businessCount !== undefined && (
                    <span className="text-xs text-[#6F4E37]/50">{category.businessCount} negócios</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 md:hidden text-center">
            <button
              onClick={() => navigate("/categorias")}
              className="inline-flex items-center gap-2 text-sm font-bold text-[#d97706]"
            >
              Ver todas as categorias <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ===== VITRINE DE PRODUTOS — R11 ===== */}
      {vitrineCards.length > 0 && (
        <section className="py-16" style={{ background: "#fdf6ec" }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-1 block">Direto pelo WhatsApp</span>
                <h2 className="font-black text-3xl md:text-4xl text-[#3a2512]">Vitrine de Produtos</h2>
              </div>
            </div>

            <div
              className={`flex gap-4 overflow-x-auto pb-4 md:mx-0 md:px-0 md:grid md:overflow-visible scrollbar-hide justify-start pl-[9vw] md:pl-0 ${vitrineCards.length >= 6 ? "md:grid-cols-6" : "md:grid-cols-4"}`}
              style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
            >
              {vitrineCards.slice(0, 12).map((p) => (
                <VitrineCard
                  key={p.productId}
                  p={p}
                  onClick={() => {
                    // T9 — múltiplas fotos → abre modal/carrossel; senão mantém
                    // o comportamento antigo de abrir o perfil do negócio.
                    if ((p.images?.length ?? 0) > 1) {
                      setVitrineModal(p);
                    } else {
                      navigate(`/negocio/${p.businessId}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
          <VitrineDetailModal
            card={vitrineModal}
            onClose={() => setVitrineModal(null)}
            onOpenBusiness={(id) => navigate(`/negocio/${id}`)}
          />
        </section>
      )}

      {/* ===== FEATURED BUSINESSES ===== */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-1 block">Aprovados pela comunidade</span>
              <h2 className="font-black text-3xl md:text-4xl text-[#3a2512]">Destaques da Semana</h2>
            </div>
            <button
              onClick={() => navigate("/busca")}
              className="hidden md:flex items-center gap-2 text-sm font-bold text-[#d97706] hover:text-[#b45309] transition-colors whitespace-nowrap"
            >
              Ver todos <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredBusinesses.map((biz) => (
              <BusinessCard key={biz.id} business={biz} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOR BUSINESS — PRICING CTA ===== */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-[#4a2c0e] rounded-3xl overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Left */}
              <div className="lg:w-5/12 p-10 lg:p-14 flex flex-col justify-center">
                <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-3 block">Para Empreendedores</span>
                <h2 className="font-black text-3xl lg:text-4xl text-white mb-4 leading-tight">
                  Você construiu seu negócio em Londrina. Agora Londrina vai te encontrar.
                </h2>
                <p className="text-white/70 text-base mb-8 leading-relaxed">
                  Seu perfil aparece pra londrinenses que já estão procurando o que você oferece. Comece grátis — sem cartão, sem contrato.
                </p>
                <Button
                  onClick={() => navigate("/cadastro")}
                  className="w-full sm:w-auto bg-[#d97706] hover:bg-[#b45309] text-white rounded-full px-8 h-12 font-bold text-sm shadow-none border-0 self-start"
                >
                  Cadastrar meu negócio — é grátis
                </Button>
              </div>

              {/* Right — pricing cards */}
              <div className="lg:w-7/12 bg-[#3a1f0d] p-10 lg:p-14">
                <div className="grid md:grid-cols-3 gap-4 h-full">
                  {/* Gratuito */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                    <h3 className="font-bold text-white mb-1">Gratuito</h3>
                    <div className="text-3xl font-black text-white mb-4">R$0<span className="text-sm font-normal text-white/50">/mês</span></div>
                    <ul className="space-y-2 flex-grow mb-6">
                      {["Perfil básico", "1 foto", "Link WhatsApp"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                          <CheckCircle2 className="h-4 w-4 text-white/40 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => navigate("/cadastro")}
                      className="w-full border border-white/20 text-white/80 hover:bg-white/10 rounded-xl py-2 text-sm font-bold transition-colors"
                    >
                      Começar
                    </button>
                  </div>

                  {/* Destaque */}
                  <div className="bg-[#d97706] rounded-2xl p-6 flex flex-col relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#d97706] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                      Popular
                    </div>
                    <h3 className="font-bold text-white mb-1">Destaque</h3>
                    <div className="text-3xl font-black text-white mb-4">R$59,90<span className="text-sm font-normal text-white/70">/mês</span></div>
                    <ul className="space-y-2 flex-grow mb-6">
                      {["Perfil verificado", "10 fotos", "Prioridade busca", "Avaliações"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                          <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => navigate("/anuncie#planos")}
                      className="w-full bg-white text-[#d97706] hover:bg-gray-100 rounded-xl py-2 text-sm font-black transition-colors"
                    >
                      Assinar
                    </button>
                  </div>

                  {/* Premium */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                    <h3 className="font-bold text-white mb-1">Premium</h3>
                    <div className="text-3xl font-black text-white mb-4">R$89,90<span className="text-sm font-normal text-white/50">/mês</span></div>
                    <ul className="space-y-2 flex-grow mb-6">
                      {["Tudo do Destaque", "Fotos ilimitadas", "Banner inicial", "Suporte VIP"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                          <CheckCircle2 className="h-4 w-4 text-[#4CAF50] flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => navigate("/anuncie#planos")}
                      className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-2 text-sm font-bold transition-colors"
                    >
                      Assinar Premium
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-black text-3xl md:text-4xl text-[#3a2512] mb-3">Como funciona</h2>
            <p className="text-gray-500 text-base">Simples, rápido e totalmente gratuito para começar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            <div className="hidden md:block absolute top-10 left-[17%] right-[17%] h-px border-t-2 border-dashed border-[#d97706]/30 z-0"></div>
            {[
              { n: "1", title: "Busque", desc: "Procure pelo que precisa ou explore as categorias disponíveis.", color: "bg-[#d97706]" },
              { n: "2", title: "Escolha", desc: "Veja fotos, avaliações e informações detalhadas de cada negócio.", color: "bg-[#4CAF50]" },
              { n: "3", title: "Conecte", desc: "Entre em contato diretamente pelo WhatsApp ou telefone.", color: "bg-[#6F4E37]" },
            ].map((step) => (
              <div key={step.n} className="flex flex-col items-center text-center relative z-10">
                <div className={`w-20 h-20 ${step.color} text-white rounded-full flex items-center justify-center text-3xl font-black shadow-lg mb-5`}>
                  {step.n}
                </div>
                <h3 className="font-black text-xl text-[#3a2512] mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="font-black text-3xl md:text-4xl text-[#3a2512] mb-2">O que dizem os londrinenses</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
                <Quote className="h-7 w-7 text-[#d97706] mb-4 opacity-40" />
                <p className="text-gray-600 text-sm leading-relaxed mb-5 italic">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${t.bg}`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-[#3a2512]">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-14 bg-[#d97706]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="font-black text-2xl md:text-3xl text-white mb-6">
            Seu negócio é de Londrina. Seu cliente também.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/cadastro")}
              className="bg-white hover:bg-gray-100 text-[#d97706] font-black text-base px-10 py-3.5 rounded-full shadow-lg transition-colors"
            >
              Cadastrar meu negócio — é grátis
            </button>
            <button
              onClick={() => navigate("/busca")}
              className="border-2 border-white/50 text-white font-bold text-base px-10 py-3.5 rounded-full hover:bg-white/10 transition-colors"
            >
              Explorar a Cidade
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
