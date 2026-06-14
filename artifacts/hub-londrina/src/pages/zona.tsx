import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Star, Zap, Megaphone } from "lucide-react";
import { Layout } from "@/components/Layout";
import { imgSrc } from "@/lib/utils";
import { BusinessCard } from "@/components/BusinessCard";
import { getCategoryIcon } from "@/lib/icons";
import { zoneConfig, type ZoneSlug } from "@/lib/zones";
import { SearchBar } from "@/components/SearchBar";

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

// Espelha ZONE_SLOTS (fonte única no backend: api-server/src/lib/boost-locks.ts).
// São 4 vagas pagas de destaque por zona; as vagas ainda não vendidas são
// preenchidas com a arte de venda "Anuncie você também".
const ZONE_FEATURED_SLOTS = 4;

// Cartão de venda branded para as vagas de destaque ainda não vendidas.
// Usa a cor da zona e leva para /anuncie. Altura casa com o BusinessCard (md).
function ZoneAdSlot({ color, onClick }: { color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center text-center min-h-[540px] rounded-3xl border-2 border-dashed bg-white px-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderColor: color + "55" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110"
        style={{ backgroundColor: color + "18", color }}
      >
        <Megaphone className="h-8 w-8" />
      </div>
      <span className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color }}>
        Vaga disponível
      </span>
      <h3 className="font-black text-xl text-[#3a2512] leading-tight mb-2">
        Anuncie você também
      </h3>
      <p className="text-sm text-gray-500 leading-snug max-w-[220px] mb-6">
        Apareça em destaque nesta região para quem está procurando o que você oferece.
      </p>
      <span
        className="inline-flex items-center gap-2 text-white font-bold text-sm px-6 py-3 rounded-full shadow transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        Anunciar agora <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

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

  const { data: featuredData } = useQuery<{ data: unknown[] }>({
    queryKey: [`/api/zones/${zone}/featured`],
    queryFn: () => fetch(`${BASE}/api/zones/${zone}/featured`).then(r => r.json()),
    staleTime: 30_000,
  });

  const businesses = (bizData?.data ?? []) as any[];
  const zoneFeatured = (featuredData?.data ?? []) as any[];
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
          backgroundImage: cfg.bannerUrl ? `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${imgSrc(cfg.bannerUrl)})` : undefined,
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

          {/* Barra de busca em modo zona (Task #119): autocomplete restrito à zona,
              patrocinados = Boost de Zona da região + upsell quando não há nenhum. */}
          <div className="max-w-xl mx-auto">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              variant="page"
              placeholder={`Buscar na ${cfg.label}...`}
              zone={zone}
              zoneLabel={cfg.label}
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO 2 — Vagas de destaque da zona (reservadas a quem compra o boost de zona).
          Sempre ZONE_FEATURED_SLOTS (4) vagas: as pagas (selo "Patrocinado") + a arte de
          venda "Anuncie você também" preenchendo as vagas ainda não vendidas → /anuncie.
          O ranking orgânico dos mais bem avaliados continua na grade "Todos os negócios"
          (ordenada plano→nota→cliques no backend). */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 font-bold text-sm uppercase tracking-wider mb-1" style={{ color: cfg.color }}>
              <Zap className="h-3.5 w-3.5" />
              Destaque para você
            </span>
            <h2 className="font-black text-2xl md:text-3xl text-[#3a2512]">
              Destaques da {cfg.label}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {zoneFeatured.slice(0, ZONE_FEATURED_SLOTS).map((biz: any) => (
              <div key={biz.id} className="relative">
                <div
                  className="absolute bottom-[180px] sm:bottom-[200px] right-3 z-10 flex items-center gap-1 text-white text-[10px] font-black px-2 py-1 rounded-full shadow"
                  style={{ backgroundColor: cfg.color }}
                >
                  <Star className="h-2.5 w-2.5 fill-white" />
                  Patrocinado
                </div>
                <BusinessCard business={biz} />
              </div>
            ))}
            {Array.from({
              length: Math.max(0, ZONE_FEATURED_SLOTS - zoneFeatured.length),
            }).map((_, i) => (
              <ZoneAdSlot
                key={`ad-${i}`}
                color={cfg.color}
                onClick={() => navigate("/anuncie")}
              />
            ))}
          </div>
        </div>
      </section>

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
