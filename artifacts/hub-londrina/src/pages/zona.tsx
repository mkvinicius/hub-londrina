import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, MapPin } from "lucide-react";
import { Layout } from "@/components/Layout";
import { BusinessCard } from "@/components/BusinessCard";
import { getCategoryIcon } from "@/lib/icons";
import { zoneConfig, type ZoneSlug } from "@/lib/zones";

interface ZoneApiData {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  bannerUrl: string | null;
}

interface ZoneStats {
  zone: string;
  label: string;
  color: string;
  totalBusinesses: number;
  byCategory: { slug: string; name: string; count: number }[];
  topRated: unknown[];
}

interface ZoneBusinesses {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

const BASE = import.meta.env.VITE_API_URL || "";

export default function ZonePage({ zone }: { zone: ZoneSlug }) {
  const fallback = zoneConfig[zone];
  const [, navigate] = useLocation();

  const { data: zoneApi } = useQuery<{ data: ZoneApiData }>({
    queryKey: [`/api/zones/${zone}`],
    queryFn: () => fetch(`${BASE}/api/zones/${zone}`).then(r => r.json()),
    staleTime: 60_000,
  });

  const apiCfg = zoneApi?.data;
  const cfg = {
    label: apiCfg?.name ?? fallback.label,
    color: apiCfg?.color ?? fallback.color,
    bgColor: fallback.bgColor,
    textColor: fallback.textColor,
    description: apiCfg?.description ?? fallback.description,
    bannerUrl: apiCfg?.bannerUrl ?? null,
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery<ZoneStats>({
    queryKey: [`/api/zones/${zone}/stats`],
    queryFn: () => fetch(`${BASE}/api/zones/${zone}/stats`).then(r => r.json()),
    staleTime: 60_000,
  });

  const categoryParam = selectedCategory ? `&category=${selectedCategory}` : "";
  const { data: bizData } = useQuery<ZoneBusinesses>({
    queryKey: [`/api/zones/${zone}/businesses`, selectedCategory, page],
    queryFn: () => fetch(`${BASE}/api/zones/${zone}/businesses?limit=${page * 12}${categoryParam}`).then(r => r.json()),
    staleTime: 30_000,
  });

  const businesses = (bizData?.data ?? []) as any[];
  const topRated = (stats?.topRated ?? []) as any[];
  const byCategory = stats?.byCategory ?? [];
  const total = bizData?.total ?? 0;
  const hasMore = businesses.length < total;

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    params.set("zona", zone);
    navigate(`/busca?${params.toString()}`);
  }

  return (
    <Layout>
      {/* SEÇÃO 1 — Hero da zona */}
      <section
        style={{
          backgroundColor: cfg.bgColor,
          minHeight: "280px",
          backgroundImage: cfg.bannerUrl ? `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${cfg.bannerUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        className="flex items-center"
      >
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 w-full text-center">
          <div
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4"
            style={{ backgroundColor: cfg.color + "18", color: cfg.color }}
          >
            <MapPin className="h-3.5 w-3.5" />
            Londrina, PR
          </div>

          <h1
            className="font-black text-4xl md:text-5xl lg:text-6xl mb-3 leading-tight"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </h1>

          <p className="text-base md:text-lg font-medium mb-8" style={{ color: cfg.textColor, opacity: 0.75 }}>
            {stats ? `${stats.totalBusinesses} negócios verificados nesta região` : cfg.description}
          </p>

          {/* Barra de busca */}
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto">
            <div className="flex flex-1 items-center px-4 py-3 gap-3 rounded-xl bg-white shadow-sm border border-gray-100">
              <Search className="h-4 w-4 flex-shrink-0" style={{ color: cfg.color }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={`Buscar na ${cfg.label}...`}
                className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 outline-none bg-transparent font-medium"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm flex-shrink-0 transition-opacity hover:opacity-90"
              style={{ backgroundColor: cfg.color }}
            >
              Buscar
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — Destaques da zona */}
      {topRated.length > 0 && (
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="mb-8">
              <span className="font-bold text-sm uppercase tracking-wider mb-1 block" style={{ color: cfg.color }}>
                Os mais bem avaliados
              </span>
              <h2 className="font-black text-2xl md:text-3xl text-[#3a2512]">
                Destaques da {cfg.label}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {topRated.map((biz: any) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 3 — Categorias com negócios na zona */}
      {byCategory.length > 0 && (
        <section className="py-12" style={{ backgroundColor: cfg.bgColor }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <h2 className="font-black text-2xl md:text-3xl text-[#3a2512] mb-8">
              Explore por categoria
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => { setSelectedCategory(null); setPage(1); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2"
                style={
                  selectedCategory === null
                    ? { backgroundColor: cfg.color, color: "#fff", borderColor: cfg.color }
                    : { backgroundColor: "#fff", color: cfg.textColor, borderColor: cfg.color + "30" }
                }
              >
                Todos
                <span className="text-xs opacity-70">({stats?.totalBusinesses ?? 0})</span>
              </button>
              {byCategory.map(cat => {
                const Icon = getCategoryIcon(cat.slug);
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => { setSelectedCategory(cat.slug); setPage(1); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2"
                    style={
                      isSelected
                        ? { backgroundColor: cfg.color, color: "#fff", borderColor: cfg.color }
                        : { backgroundColor: "#fff", color: cfg.textColor, borderColor: cfg.color + "30" }
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {cat.name}
                    <span className="text-xs opacity-70">({cat.count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 4 — Todos os negócios */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-baseline justify-between mb-8 gap-4">
            <h2 className="font-black text-2xl md:text-3xl text-[#3a2512]">
              {selectedCategory
                ? byCategory.find(c => c.slug === selectedCategory)?.name ?? "Resultados"
                : "Todos os negócios"}
            </h2>
            <span className="text-sm text-gray-500">{total} encontrados</span>
          </div>

          {businesses.length === 0 ? (
            <div className="text-center py-20">
              <MapPin className="h-12 w-12 mx-auto mb-4" style={{ color: cfg.color, opacity: 0.3 }} />
              <p className="text-gray-500 font-medium">
                Nenhum negócio encontrado nesta zona{selectedCategory ? " com este filtro" : ""}.
              </p>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mt-4 text-sm font-bold underline"
                  style={{ color: cfg.color }}
                >
                  Limpar filtro
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {businesses.map((biz: any) => (
                  <BusinessCard key={biz.id} business={biz} />
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-10">
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-sm text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: cfg.color }}
                  >
                    Ver mais negócios <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* SEÇÃO 5 — CTA para lojistas */}
      <section className="py-14" style={{ backgroundColor: cfg.color }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-black text-2xl md:text-3xl text-white mb-3 leading-tight">
            Seu negócio é da {cfg.label}?<br />Apareça aqui.
          </h2>
          <p className="text-white/75 text-base mb-7">
            Conecte seu negócio com quem já está procurando o que você oferece na sua região.
          </p>
          <button
            onClick={() => navigate("/cadastro")}
            className="bg-white font-black text-base px-10 py-3.5 rounded-full shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl"
            style={{ color: cfg.color }}
          >
            Cadastrar meu negócio — é grátis
          </button>
        </div>
      </section>
    </Layout>
  );
}
