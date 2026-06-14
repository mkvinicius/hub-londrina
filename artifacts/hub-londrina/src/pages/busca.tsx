import { useState, useEffect, Fragment } from "react";
import { useLocation } from "wouter";
import {
  MapPin, SlidersHorizontal, Search,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Navigation, Loader2, Star, Zap, X
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { BrandButton } from "@/components/BrandButton";
import { useSearch, useListCategories } from "@workspace/api-client-react";
import type { Business, Category } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";
import { BusinessCard } from "@/components/BusinessCard";
import { SearchBar } from "@/components/SearchBar";

const PAGE_SIZE = 8;
const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

const BTN_ELEVATION = "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm";

export default function Busca() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [region, setRegion] = useState(searchParams.get("regiao") ?? "");
  const [zone, setZone] = useState(searchParams.get("zona") ?? "");
  const [categoria, setCategoria] = useState(searchParams.get("categoria") ?? "");
  const [sort, setSort] = useState("relevance");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);
  const [page, setPage] = useState(1);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyResults, setNearbyResults] = useState<Business[] | null>(null);
  const [nearbyError, setNearbyError] = useState("");
  const [catOpen, setCatOpen] = useState(true);
  const [regOpen, setRegOpen] = useState(true);

  // Destaques em [Categoria] — só busca quando uma categoria está selecionada
  const [categoryFeatured, setCategoryFeatured] = useState<any[]>([]);
  useEffect(() => {
    if (!categoria) { setCategoryFeatured([]); return; }
    let cancelled = false;
    fetch(`${API_BASE}/api/categories/${encodeURIComponent(categoria)}/featured`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setCategoryFeatured(d.data || []); })
      .catch(() => { if (!cancelled) setCategoryFeatured([]); });
    return () => { cancelled = true; };
  }, [categoria]);

  const { data: searchData, isLoading } = useSearch({
    q: query || undefined,
    region: region || undefined,
    zone: zone || undefined,
    category: categoria || undefined,
  });

  async function handleNearby() {
    if (nearbyMode) {
      setNearbyMode(false);
      setNearbyResults(null);
      setNearbyError("");
      return;
    }
    if (!navigator.geolocation) {
      setNearbyError("Seu navegador não suporta geolocalização.");
      return;
    }
    setNearbyLoading(true);
    setNearbyError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: "5" });
          if (categoria) params.set("category", categoria);
          if (region && region !== "todas") params.set("region", region);
          const res = await fetch(`${API_BASE}/api/businesses/nearby?${params}`);
          const data = await res.json();
          setNearbyResults(data.data || []);
          setNearbyMode(true);
        } catch {
          setNearbyError("Erro ao buscar negócios próximos.");
        } finally {
          setNearbyLoading(false);
        }
      },
      (err) => {
        setNearbyError(
          err.code === err.PERMISSION_DENIED
            ? "Permita o acesso à localização para usar este recurso."
            : "Não foi possível obter sua localização. Tente novamente."
        );
        setNearbyLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  }

  const REGION_TO_ZONE: Record<string, string> = {
    "centro": "centro", "zona centro": "centro",
    "zona norte": "norte", "zona sul": "sul",
    "zona leste": "leste", "zona oeste": "oeste",
    "norte": "norte", "sul": "sul", "leste": "leste", "oeste": "oeste",
  };
  const zoneFromRegion = region && region !== "todas"
    ? REGION_TO_ZONE[region.trim().toLowerCase()]
    : undefined;
  const categoriesZone =
    (zone && zone !== "todas" ? zone : undefined) ?? zoneFromRegion;
  const { data: categoriesData } = useListCategories(
    categoriesZone ? { zone: categoriesZone } : undefined,
  );
  const categories = categoriesData?.data ?? [];

  const [dynamicRegions, setDynamicRegions] = useState<string[]>([
    "Centro", "Zona Norte", "Zona Sul", "Zona Leste", "Zona Oeste",
  ]);
  useEffect(() => {
    fetch(`${API_BASE}/api/zones`)
      .then(r => r.json())
      .then(d => {
        const names = (d.data || [])
          .filter((z: any) => z.active !== false)
          .map((z: any) => z.name)
          .filter(Boolean);
        if (names.length) setDynamicRegions(names);
      })
      .catch(() => {});
  }, []);

  // Fuzzy fallback: dois cenários distintos do backend.
  //   fuzzyUsed=true  → backend retornou resultados fuzzy no mesmo escopo (banner sobre resultados)
  //   didYouMean=str  → 0 resultados mesmo com fuzzy, mas existe sugestão global (banner no estado vazio)
  const fuzzyUsed = !nearbyMode && (searchData as any)?.fuzzyUsed === true;
  const normalizedQuery: string | undefined = (searchData as any)?.normalizedQuery;
  const didYouMean: string | undefined = !nearbyMode ? (searchData as any)?.didYouMean : undefined;

  const results: Business[] = nearbyMode && nearbyResults !== null
    ? nearbyResults
    : searchData?.data ?? [];
  const sorted = [...results].sort((a, b) => {
    if (nearbyMode && a.distanceKm !== undefined && b.distanceKm !== undefined) {
      return a.distanceKm - b.distanceKm;
    }
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "reviews") return b.reviewsCount - a.reviewsCount;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Separador de "Destaques desta zona" (Task #84): só na Busca filtrada por
  // zona, na ordenação padrão (relevância), 1ª página e fora do "Perto de mim".
  // Os patrocinados já vêm primeiro do backend; aqui só marcamos onde o bloco
  // pago termina e começam os anúncios orgânicos. Sem alterar ordem/regra.
  const isFeatured = (b: Business) =>
    Boolean((b as any).boostInfo?.isActive) || Boolean((b as any)._boostBadge);
  const zoneActive = !!zone && zone !== "todas";
  const showZoneSplit = zoneActive && !nearbyMode && sort === "relevance" && page === 1;
  const featuredCount = showZoneSplit ? paginated.filter(isFeatured).length : 0;
  // Cabeçalho aparece sempre que houver patrocinados no contexto válido; a linha
  // "Outros anúncios" só quando há patrocinados E orgânicos para separar.
  const showZoneHeader = showZoneSplit && featuredCount > 0;
  const showZoneDivider = showZoneHeader && featuredCount < paginated.length;

  useEffect(() => { setPage(1); }, [query, region, categoria, sort]);

  function handleSearch() {
    setQuery(localQuery);
    const params = new URLSearchParams();
    if (localQuery) params.set("q", localQuery);
    if (region && region !== "todas") params.set("regiao", region);
    if (zone && zone !== "todas") params.set("zona", zone);
    if (categoria) params.set("categoria", categoria);
    navigate(`/busca?${params.toString()}`);
  }

  function handleSelectSuggestion(name: string) {
    setLocalQuery(name);
    setQuery(name);
    const params = new URLSearchParams({ q: name });
    if (region && region !== "todas") params.set("regiao", region);
    if (categoria) params.set("categoria", categoria);
    navigate(`/busca?${params.toString()}`);
  }

  function clearFilters() {
    setQuery("");
    setLocalQuery("");
    setRegion("");
    setZone("");
    setCategoria("");
    setNearbyMode(false);
    setNearbyResults(null);
    setNearbyError("");
    navigate("/busca");
  }

  const activeFiltersCount = [
    region && region !== "todas",
    categoria,
  ].filter(Boolean).length;
  const selectedRegionLabel = region && region !== "todas" ? region : "";
  const selectedCategoryLabel = categoria ? categories.find(c => c.slug === categoria)?.name ?? categoria : "";


  return (
    <Layout>
      <div className="min-h-screen pb-20 bg-gray-50 transition-colors">
        <div className="bg-white border-b border-gray-100 py-5 px-4 transition-colors">
          <div className="max-w-3xl mx-auto">
            {/* Search bar — componente compartilhado com a home */}
            <SearchBar
              value={localQuery}
              onChange={setLocalQuery}
              onSearch={handleSearch}
              onSelectSuggestion={handleSelectSuggestion}
              variant="page"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">

          {/* ─── DESTAQUES EM [CATEGORIA] ──────────────────────────────────── */}
          {categoria && categoryFeatured.length > 0 && !nearbyMode && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-700">
                    Destaques em {selectedCategoryLabel || categoria}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {categoryFeatured.length} patrocinado{categoryFeatured.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryFeatured.map((biz: any) => (
                  <div key={`cf-${biz.id}`} className="relative">
                    <div className="absolute bottom-[180px] sm:bottom-[200px] right-3 z-10 flex items-center gap-1 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow">
                      <Star className="h-2.5 w-2.5 fill-white" />
                      Patrocinado
                    </div>
                    <BusinessCard business={biz} />
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-gray-200" />
            </div>
          )}

          {/* Results header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h1 className="font-bold text-xl text-[#3a2512]">
              {isLoading ? (
                <span className="text-gray-400">Buscando...</span>
              ) : (
                <>
                  <span className="text-[#d97706] font-black">{sorted.length}</span>{" "}
                  {sorted.length === 1 ? "negócio encontrado" : "negócios encontrados"}
                  {selectedRegionLabel && ` em ${selectedRegionLabel}`}
                  {selectedCategoryLabel && ` na categoria ${selectedCategoryLabel}`}
                  {query && ` para "${query}"`}
                </>
              )}
            </h1>

            <div className="flex items-center gap-3">
              <button
                onClick={handleNearby}
                disabled={nearbyLoading}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border ${BTN_ELEVATION} ${nearbyMode ? "bg-[#4CAF50] text-white border-[#4CAF50] shadow-md" : "bg-white text-[#3a2512] border-gray-200 hover:border-[#4CAF50] hover:text-[#4CAF50]"}`}
              >
                {nearbyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                {nearbyMode ? "Ver todos" : "Perto de mim"}
              </button>
              <button
                className={`md:hidden flex items-center gap-2 text-sm font-bold text-[#3a2512] border border-gray-200 rounded-xl px-4 py-2.5 bg-white ${BTN_ELEVATION}`}
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrar
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-[#d97706] text-white rounded-full text-xs flex items-center justify-center font-black">{activeFiltersCount}</span>
                )}
              </button>

              <div className="flex items-center bg-white rounded-xl border border-gray-200 px-3 h-10 gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap font-medium">Ordenar:</span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="border-0 shadow-none h-8 px-0 focus:ring-0 text-sm font-bold text-[#3a2512] w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="rating">Maior Nota</SelectItem>
                    <SelectItem value="reviews">Mais Avaliados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {nearbyError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <Navigation className="h-4 w-4 flex-shrink-0" />
              {nearbyError}
            </div>
          )}

          {/* Banner fuzzy — aparece quando não houve resultado exato mas o backend encontrou
              sugestões por similaridade de trigramas (erro de digitação, acento errado, etc.) */}
          {fuzzyUsed && normalizedQuery && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-3 flex-wrap">
              <span>
                Nenhum resultado exato. Mostrando resultados similares a{" "}
                <strong>"{query}"</strong>.
              </span>
              <button
                onClick={() => handleSelectSuggestion(normalizedQuery)}
                className="text-amber-700 underline font-bold whitespace-nowrap hover:text-amber-900"
              >
                Você quis dizer "{normalizedQuery}"?
              </button>
            </div>
          )}

          {nearbyMode && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <Navigation className="h-4 w-4 flex-shrink-0" />
              Mostrando negócios em até 5 km de você, ordenados por distância.
            </div>
          )}

          <div className="flex gap-6 items-start">
            <aside className={`
              w-[240px] flex-shrink-0 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-colors
              ${mobileFiltersOpen
                ? "fixed inset-0 z-[60] overflow-auto rounded-none w-full shadow-none"
                : "hidden md:block sticky top-24"}
            `}>
              {mobileFiltersOpen ? (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <h2 className="font-black text-xl text-[#3a2512]">Filtros</h2>
                  <button onClick={() => setMobileFiltersOpen(false)}>
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                  <SlidersHorizontal className="h-4 w-4 text-[#d97706]" />
                  <h2 className="font-black text-base text-[#3a2512]">Filtros</h2>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <button
                    type="button"
                    onClick={() => setCatOpen(!catOpen)}
                    className="w-full font-bold text-sm text-[#3a2512] mb-3 flex items-center justify-between cursor-pointer hover:text-[#d97706] transition-colors"
                  >
                    Categoria
                    {catOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {catOpen && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setCategoria("")}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${BTN_ELEVATION} ${
                          !categoria ? "bg-[#d97706] text-white font-bold shadow-md -translate-y-0.5" : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Todas
                      </button>
                      {categories.map((cat: Category) => {
                        const Icon = getCategoryIcon(cat.icon);
                        const colorClasses = getCategoryColorClasses(cat.color);
                        const isSelected = categoria === cat.slug;
                        const countLabel = cat.businessCount !== undefined ? cat.businessCount : undefined;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setCategoria(cat.slug === categoria ? "" : cat.slug)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${BTN_ELEVATION} flex items-center justify-between ${
                              isSelected ? "bg-[#d97706] text-white font-bold shadow-md -translate-y-0.5" : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${isSelected ? "text-white" : colorClasses.split(" ")[1]}`} />
                              {cat.name}
                            </span>
                            {countLabel !== undefined && (
                              <span className={`text-xs ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                                {countLabel}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setRegOpen(!regOpen)}
                    className="w-full font-bold text-sm text-[#3a2512] mb-3 flex items-center justify-between cursor-pointer hover:text-[#d97706] transition-colors"
                  >
                    Região
                    {regOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {regOpen && (
                    <div className="space-y-1">
                      {["todas", ...dynamicRegions].map((reg) => {
                        const isSelected = (reg === "todas" && !region) || region === reg;
                        return (
                          <button
                            key={reg}
                            onClick={() => setRegion(reg === "todas" ? "" : reg)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${BTN_ELEVATION} ${
                              isSelected
                                ? "bg-[#d97706] text-white font-bold shadow-md -translate-y-0.5"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {reg === "todas" ? "Todas" : reg}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {(activeFiltersCount > 0 || query || nearbyMode) && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    className={`w-full border border-gray-200 text-[#3a2512] rounded-xl py-2 text-sm font-bold ${BTN_ELEVATION}`}
                    onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}

              {mobileFiltersOpen && (
                <div className="mt-4">
                  <button
                    className={`w-full bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl py-3 text-sm font-bold ${BTN_ELEVATION}`}
                    onClick={() => { handleSearch(); setMobileFiltersOpen(false); }}
                  >
                    Aplicar Filtros
                  </button>
                </div>
              )}
            </aside>

            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-72 bg-white rounded-2xl animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <Search className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-black text-xl text-[#3a2512] mb-2">Nenhum resultado</h3>
                  {didYouMean ? (
                    <p className="text-gray-500 mb-4 text-sm">
                      Nenhum negócio encontrado para{" "}
                      <strong>"{query}"</strong>
                      {" "}neste filtro.{" "}
                      <button
                        onClick={() => handleSelectSuggestion(didYouMean)}
                        className="text-[#d97706] underline font-bold"
                      >
                        Você quis dizer "{didYouMean}"?
                      </button>
                    </p>
                  ) : (
                    <p className="text-gray-500 mb-6 text-sm">Tente buscar com outros termos ou remover filtros.</p>
                  )}
                  <button
                    onClick={clearFilters}
                    className={`border border-gray-200 text-[#3a2512] rounded-xl px-6 py-2.5 text-sm font-bold ${BTN_ELEVATION}`}
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginated.map((biz, idx) => (
                      // BusinessCard já renderiza Patrocinado/Impulsionado em bottom-3 left-3
                      // baseado em boostInfo/_boostBadge — não duplicamos overlay aqui (evita
                      // sobreposição com o rating "Novo" em top-3 left-3).
                      <Fragment key={biz.id}>
                        {showZoneHeader && idx === 0 && (
                          <div className="col-span-full flex items-center gap-2">
                            <Star className="h-4 w-4 text-[#FF9800] fill-[#FF9800]" />
                            <span className="font-black text-sm uppercase tracking-wide text-[#6F4E37]">
                              Destaques desta zona
                            </span>
                          </div>
                        )}
                        {showZoneDivider && idx === featuredCount && (
                          <div className="col-span-full flex items-center gap-3 my-1">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#6F4E37]/25" />
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                              Outros anúncios
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#6F4E37]/25" />
                          </div>
                        )}
                        <BusinessCard business={biz} showDistance={nearbyMode} />
                      </Fragment>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[#3a2512] disabled:opacity-40 disabled:cursor-not-allowed ${BTN_ELEVATION}`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1;
                        if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                          if (p === 2 || p === totalPages - 1) return <span key={p} className="text-gray-400 text-sm">…</span>;
                          return null;
                        }
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-bold ${BTN_ELEVATION} ${
                              p === page
                                ? "bg-[#d97706] text-white shadow-sm"
                                : "border border-gray-200 bg-white text-[#3a2512]"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={`w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[#3a2512] disabled:opacity-40 disabled:cursor-not-allowed ${BTN_ELEVATION}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-center text-xs text-gray-400 mt-3 font-medium">
                    Página {page} de {totalPages} — {sorted.length} negócios
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
