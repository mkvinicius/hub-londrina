import { useState } from "react";
import { useLocation } from "wouter";
import {
  Search, ArrowRight, Quote,
  CheckCircle2, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { useListCategories, useListBusinesses } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";
import { BusinessCard } from "@/components/BusinessCard";

const testimonials = [
  {
    name: "Mariana Costa",
    role: "Moradora da Zona Sul",
    content: "O Hub Londrina mudou a forma como descubro novos lugares. Encontrei uma padaria artesanal incrível do lado de casa.",
    initials: "MC",
    bg: "bg-pink-100 text-pink-700",
  },
  {
    name: "Roberto Silva",
    role: "Dono de Oficina",
    content: "Desde que anunciei minha oficina aqui, o movimento aumentou muito. Ótimo para conectar o negócio com a comunidade.",
    initials: "RS",
    bg: "bg-blue-100 text-blue-700",
  },
  {
    name: "Juliana Alves",
    role: "Estudante",
    content: "Sempre uso para achar onde comer no fim de semana. As avaliações são reais e me ajudam a escolher bem.",
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
        className="relative w-full overflow-hidden"
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
            Descubra os Melhores Negócios Locais de Londrina
          </h1>

          <p
            className="text-white text-base md:text-lg font-medium mb-10"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
          >
            Encontre produtos e serviços perto de você.
          </p>

          {/* Search bar */}
          <div className="w-full max-w-3xl">
            <div className="flex flex-col sm:flex-row bg-white rounded-2xl shadow-2xl overflow-visible border border-white/20 relative z-20">
              {/* Text input */}
              <div className="flex flex-1 items-center px-5 py-4 gap-3 border-b sm:border-b-0 sm:border-r border-gray-200">
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="O que você está procurando?"
                  className="flex-1 text-base text-gray-700 placeholder:text-gray-400 outline-none bg-transparent font-medium"
                />
              </div>

              {/* Region dropdown */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setRegionOpen(!regionOpen)}
                  className="flex items-center gap-3 px-5 py-4 text-base font-semibold text-gray-700 whitespace-nowrap w-full sm:w-auto border-b sm:border-b-0 border-gray-200"
                >
                  <span>{region || "Selecione a Região"}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${regionOpen ? "rotate-180" : ""}`} />
                </button>
                {regionOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[200px] py-2 overflow-hidden">
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

              {/* Buscar button */}
              <button
                type="button"
                onClick={handleSearch}
                className="flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-base px-8 py-4 transition-colors rounded-b-2xl sm:rounded-b-none sm:rounded-r-2xl"
              >
                <Search className="h-4 w-4" />
                Buscar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-[#6F4E37] py-5">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-center gap-6 md:gap-16 text-white">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black">+500</span>
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Negócios Cadastrados</span>
          </div>
          <div className="hidden md:block w-px h-10 bg-white/20"></div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black">+12 mil</span>
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Usuários Ativos</span>
          </div>
          <div className="hidden md:block w-px h-10 bg-white/20"></div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black">10</span>
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Categorias</span>
          </div>
          <div className="hidden md:block w-px h-10 bg-white/20"></div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-black">5</span>
            <span className="text-xs uppercase tracking-wider text-white/70 font-semibold">Regiões da Cidade</span>
          </div>
        </div>
      </div>

      {/* ===== CATEGORIES SECTION ===== */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-1 block">Explore por categoria</span>
              <h2 className="font-black text-3xl md:text-4xl text-[#3a2512]">O que você precisa?</h2>
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
                  className="group flex flex-col items-center gap-3 p-5 bg-gray-50 hover:bg-[#FFF3E0] rounded-2xl border border-gray-100 hover:border-[#d97706]/30 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <span className="font-bold text-sm text-center text-[#3a2512] group-hover:text-[#d97706] transition-colors leading-tight">
                    {category.name}
                  </span>
                  {category.businessCount !== undefined && (
                    <span className="text-xs text-gray-400">{category.businessCount} negócios</span>
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
                  Coloque seu negócio no mapa de Londrina.
                </h2>
                <p className="text-white/70 text-base mb-8 leading-relaxed">
                  Conecte sua marca aos londrinenses que já estão procurando pelos seus produtos e serviços.
                </p>
                <Button
                  onClick={() => navigate("/anuncie")}
                  className="w-full sm:w-auto bg-[#d97706] hover:bg-[#b45309] text-white rounded-full px-8 h-12 font-bold text-sm shadow-none border-0 self-start"
                >
                  Anuncie Seu Negócio
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
            Seu negócio ainda não está aqui?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/anuncie")}
              className="bg-white hover:bg-gray-100 text-[#d97706] font-black text-base px-10 py-3.5 rounded-full shadow-lg transition-colors"
            >
              Cadastrar Meu Negócio
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
