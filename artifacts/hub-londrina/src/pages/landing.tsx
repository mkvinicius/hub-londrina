import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Search, ArrowRight, Quote,
  CheckCircle2, ChevronDown, Heart, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { useListCategories, useListBusinesses } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";
import { BusinessCard } from "@/components/BusinessCard";

function VitrineCard({ p }: { p: { name: string; price: string; likes: string; comments: number; whatsapp: string; photo: string; video: string; business: string } }) {
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

  return (
    <div
      className="flex-shrink-0 md:flex-shrink relative rounded-2xl overflow-hidden cursor-pointer group w-[72vw] md:w-full h-[calc(72vw*1.45)] md:h-[295px]"
      style={{
        scrollSnapAlign: "start",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: `url(${p.photo})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={p.video} type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.08) 100%)" }} />
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">{p.business}</span>
        <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">▶ ao vivo</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-2">
        <div>
          <p className="text-white font-black text-sm leading-tight mb-0.5">{p.name}</p>
          <p className="text-white font-bold text-base leading-tight">{p.price}</p>
        </div>
        <a
          href={`https://wa.me/${p.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: "#25D366" }}
          onClick={e => e.stopPropagation()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Pedir no WhatsApp
        </a>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-white/70 text-[11px]"><Heart className="w-3 h-3" />{p.likes}</span>
          <span className="flex items-center gap-1 text-white/70 text-[11px]"><MessageCircle className="w-3 h-3" />{p.comments}</span>
        </div>
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
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: categoriesData } = useListCategories();
  const { data: featuredData } = useListBusinesses({ sort: "rating" });

  const categories = categoriesData?.data ?? [];
  const featuredBusinesses = (featuredData?.data ?? []).slice(0, 4);

  const regions = ["Todas as regiões", "Centro", "Gleba Palhano", "Zona Norte", "Zona Sul", "Jardim Quebec"];

  function handleSearch() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (region && region !== "Todas as regiões") params.set("regiao", region);
    navigate(`/busca?${params.toString()}`);
  }

  return (
    <Layout>
      {/* ===== HERO SECTION ===== */}
      <div
        className="relative w-full"
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
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
          <div className="w-full max-w-3xl">
            <div
              className="flex flex-col sm:flex-row overflow-visible relative z-20 rounded-2xl p-1.5 gap-1.5"
              style={{
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {/* Text input */}
              <div className="flex flex-1 items-center px-4 py-3 gap-3 rounded-xl bg-gray-50/80">
                <Search className="h-5 w-5 text-[#d97706] flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Restaurante, salão, mecânica em Londrina..."
                  className="flex-1 text-base text-gray-700 placeholder:text-gray-400 outline-none bg-transparent font-medium"
                />
              </div>

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
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-100 rounded-xl z-50 min-w-[200px] py-2 overflow-hidden"
                    style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)" }}>
                    {regions.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setRegion(r === "Todas as regiões" ? "" : r); setRegionOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-[#FFF3E0] transition-colors ${
                          (r === "Todas as regiões" && !region) || region === r ? "text-[#d97706] bg-[#FFF3E0]" : "text-gray-700"
                        }`}
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

      {/* ===== CATEGORIES SECTION ===== */}
      <section
        style={{
          background: "linear-gradient(145deg, #fef3c7 0%, #fff7ed 40%, #fef0d0 70%, #fde8b8 100%)",
          paddingBottom: "64px",
        }}
      >
        {/* Stats card — glassmorphism flutuante, dentro da seção para não vazar branco */}
        <div className="relative z-20 flex justify-center px-4 mb-10" style={{ marginTop: "-36px" }}>
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
              { value: "20", label: "Negócios verificados" },
              { value: "5", label: "Regiões de Londrina" },
              { value: "10", label: "Categorias" },
              { value: "Novo", label: "Negócio todo dia" },
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

      {/* ===== VITRINE DE PRODUTOS ===== */}
      {(() => {
        const produtos = [
          { name: "Queijo Artesanal", price: "R$ 25,00", likes: "1.2K", comments: 320, whatsapp: "5543999990001", photo: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=650&fit=crop", video: "/videos/vitrine-queijo.mp4", business: "Queijaria Mineira" },
          { name: "Cerveja Artesanal Gelada", price: "R$ 12,00", likes: "890", comments: 210, whatsapp: "5543999990002", photo: "https://images.unsplash.com/photo-1436076863939-06870fe779c2?w=400&h=650&fit=crop", video: "/videos/vitrine-cerveja.mp4", business: "Cervejaria do Sul" },
          { name: "Arranjo de Flores", price: "R$ 80,00", likes: "1.5K", comments: 360, whatsapp: "5543999990003", photo: "https://images.unsplash.com/photo-1487530811015-780c2a85d23c?w=400&h=650&fit=crop", video: "/videos/vitrine-flores.mp4", business: "Floricultura Bella" },
          { name: "Pão Artesanal", price: "R$ 18,00", likes: "760", comments: 145, whatsapp: "5543999990004", photo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=650&fit=crop", video: "/videos/vitrine-pao.mp4", business: "Padaria Artesanal" },
          { name: "Café Especial", price: "R$ 9,00", likes: "2.1K", comments: 487, whatsapp: "5543999990005", photo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=650&fit=crop", video: "/videos/vitrine-cafe.mp4", business: "Cafeteria Grão" },
        ];
        return (
          <section className="py-16" style={{ background: "#fdf6ec" }}>
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <div className="flex items-end justify-between mb-10 gap-4">
                <div>
                  <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-1 block">Direto pelo WhatsApp</span>
                  <h2 className="font-black text-3xl md:text-4xl text-[#3a2512]">Vitrine de Produtos</h2>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide" style={{ scrollSnapType: "x mandatory" }}>
                {produtos.map((p, i) => (
                  <VitrineCard key={i} p={p} />
                ))}
              </div>
            </div>
          </section>
        );
      })()}

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
                  onClick={() => navigate("/anuncie")}
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
                    <button className="w-full border border-white/20 text-white/80 hover:bg-white/10 rounded-xl py-2 text-sm font-bold transition-colors">
                      Começar
                    </button>
                  </div>

                  {/* Destaque */}
                  <div className="bg-[#d97706] rounded-2xl p-6 flex flex-col relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#d97706] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                      Popular
                    </div>
                    <h3 className="font-bold text-white mb-1">Destaque</h3>
                    <div className="text-3xl font-black text-white mb-4">R$49<span className="text-sm font-normal text-white/70">/mês</span></div>
                    <ul className="space-y-2 flex-grow mb-6">
                      {["Perfil verificado", "10 fotos", "Prioridade busca", "Avaliações"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                          <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => navigate("/anuncie")}
                      className="w-full bg-white text-[#d97706] hover:bg-gray-100 rounded-xl py-2 text-sm font-black transition-colors"
                    >
                      Assinar
                    </button>
                  </div>

                  {/* Premium */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                    <h3 className="font-bold text-white mb-1">Premium</h3>
                    <div className="text-3xl font-black text-white mb-4">R$89<span className="text-sm font-normal text-white/50">/mês</span></div>
                    <ul className="space-y-2 flex-grow mb-6">
                      {["Tudo do Destaque", "Fotos ilimitadas", "Banner inicial", "Suporte VIP"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                          <CheckCircle2 className="h-4 w-4 text-[#4CAF50] flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => navigate("/anuncie")}
                      className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-2 text-sm font-bold transition-colors"
                    >
                      Consultor
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
              onClick={() => navigate("/anuncie")}
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
