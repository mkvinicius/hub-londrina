import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Search, MapPin, SlidersHorizontal,
  ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Navigation, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { useSearch, useListCategories } from "@workspace/api-client-react";
import type { Business, Category } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";
import { BusinessCard } from "@/components/BusinessCard";

const PAGE_SIZE = 8;
const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

const BTN_ELEVATION = "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm";

export default function Busca() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [region, setRegion] = useState(searchParams.get("regiao") ?? "");
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

  const { data: searchData, isLoading } = useSearch({
    q: query || undefined,
    region: region || undefined,
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
      () => {
        setNearbyError("Permita o acesso à localização para usar este recurso.");
        setNearbyLoading(false);
      }
    );
  }

  const { data: categoriesData } = useListCategories();
  const categories = categoriesData?.data ?? [];

  const [dynamicRegions, setDynamicRegions] = useState<string[]>([]);
  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || "";
    fetch(`${BASE}/api/regions`)
      .then(r => r.json())
      .then(d => setDynamicRegions(d.data || []))
      .catch(() => {});
  }, []);

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

  useEffect(() => { setPage(1); }, [query, region, categoria, sort]);

  function handleSearch() {
    setQuery(localQuery);
    const params = new URLSearchParams();
    if (localQuery) params.set("q", localQuery);
    if (region && region !== "todas") params.set("regiao", region);
    if (categoria) params.set("categoria", categoria);
    navigate(`/busca?${params.toString()}`);
  }

  function clearFilters() {
    setQuery("");
    setLocalQuery("");
    setRegion("");
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

  return (
    <Layout>
      <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-5 px-4 transition-colors">
          <div className="max-w-3xl mx-auto">
            <div
              className="flex flex-col sm:flex-row overflow-visible relative rounded-2xl p-1.5 gap-1.5"
              style={{
                background: "rgba(255,255,255,0.97)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex flex-1 items-center px-4 py-3 gap-3 rounded-xl bg-gray-50/80">
                <Search className="h-5 w-5 text-[#d97706] flex-shrink-0" />
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Restaurante, salão, mecânica..."
                  className="flex-1 text-base text-gray-700 dark:text-gray-100 placeholder:text-gray-400 outline-none bg-transparent font-medium"
                />
              </div>

              <div className="relative flex-shrink-0">
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 dark:text-gray-100 whitespace-nowrap w-full sm:w-auto rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors h-full border-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="Selecione a Região" />
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl" style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)" }}>
                    <SelectItem value="todas">Todas as regiões</SelectItem>
                    {dynamicRegions.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h1 className="font-bold text-xl text-[#3a2512] dark:text-gray-100">
              {isLoading ? (
                <span className="text-gray-400">Buscando...</span>
              ) : (
                <>
                  <span className="text-[#d97706] font-black">{sorted.length}</span>{" "}
                  {sorted.length === 1 ? "negócio encontrado" : "negócios encontrados"}
                  {selectedRegionLabel && ` em ${selectedRegionLabel}`}
                  {query && ` para "${query}"`}
                </>
              )}
            </h1>

            <div className="flex items-center gap-3">
              <button
                onClick={handleNearby}
                disabled={nearbyLoading}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border ${BTN_ELEVATION} ${nearbyMode ? "bg-[#4CAF50] text-white border-[#4CAF50] shadow-md" : "bg-white dark:bg-gray-800 text-[#3a2512] dark:text-gray-100 border-gray-200 dark:border-gray-700 hover:border-[#4CAF50] hover:text-[#4CAF50]"}`}
              >
                {nearbyLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                {nearbyMode ? "Ver todos" : "Perto de mim"}
              </button>
              <button
                className={`md:hidden flex items-center gap-2 text-sm font-bold text-[#3a2512] dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 ${BTN_ELEVATION}`}
                onClick={() => setMobileFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrar
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 bg-[#d97706] text-white rounded-full text-xs flex items-center justify-center font-black">{activeFiltersCount}</span>
                )}
              </button>

              <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 h-10 gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">Ordenar:</span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="border-0 shadow-none h-8 px-0 focus:ring-0 text-sm font-bold text-[#3a2512] dark:text-gray-100 w-[110px]">
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

          {nearbyMode && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
              <Navigation className="h-4 w-4 flex-shrink-0" />
              Mostrando negócios em até 5 km de você, ordenados por distância.
            </div>
          )}

          <div className="flex gap-6 items-start">
            <aside className={`
              w-[240px] flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors
              ${mobileFiltersOpen
                ? "fixed inset-0 z-[60] overflow-auto rounded-none w-full shadow-none"
                : "hidden md:block sticky top-24"}
            `}>
              {mobileFiltersOpen ? (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-black text-xl text-[#3a2512] dark:text-gray-100">Filtros</h2>
                  <button onClick={() => setMobileFiltersOpen(false)}>
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <SlidersHorizontal className="h-4 w-4 text-[#d97706]" />
                  <h2 className="font-black text-base text-[#3a2512] dark:text-gray-100">Filtros</h2>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <button
                    type="button"
                    onClick={() => setCatOpen(!catOpen)}
                    className="w-full font-bold text-sm text-[#3a2512] dark:text-gray-200 mb-3 flex items-center justify-between cursor-pointer hover:text-[#d97706] transition-colors"
                  >
                    Categoria
                    {catOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>
                  {catOpen && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setCategoria("")}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${BTN_ELEVATION} ${
                          !categoria ? "bg-[#d97706] text-white font-bold shadow-md -translate-y-0.5" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                              isSelected ? "bg-[#d97706] text-white font-bold shadow-md -translate-y-0.5" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                    className="w-full font-bold text-sm text-[#3a2512] dark:text-gray-200 mb-3 flex items-center justify-between cursor-pointer hover:text-[#d97706] transition-colors"
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
                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                  <p className="text-gray-500 mb-6 text-sm">Tente buscar com outros termos ou remover filtros.</p>
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
                    {paginated.map((biz) => (
                      <BusinessCard key={biz.id} business={biz} showDistance={nearbyMode} />
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
