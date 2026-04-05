import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Search, MapPin, SlidersHorizontal,
  ChevronDown, X, ChevronLeft, ChevronRight
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

  const { data: searchData, isLoading } = useSearch({
    q: query || undefined,
    region: region || undefined,
    category: categoria || undefined,
  });

  const { data: categoriesData } = useListCategories();
  const categories = categoriesData?.data ?? [];

  const results: Business[] = searchData?.data ?? [];
  const sorted = [...results].sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "reviews") return b.reviewsCount - a.reviewsCount;
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filters change
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
    navigate("/busca");
  }

  const activeFiltersCount = [
    region && region !== "todas",
    categoria,
  ].filter(Boolean).length;

  return (
    <Layout>
      <div className="min-h-screen pb-20 bg-gray-50">
        {/* Search Bar */}
        <div className="bg-white border-b border-gray-100 py-4 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row bg-gray-50 rounded-xl border border-gray-200 overflow-hidden gap-0">
              <div className="flex-1 relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400" />
                <Input
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Buscar negócios, serviços..."
                  className="w-full pl-12 pr-4 h-12 bg-transparent border-0 focus-visible:ring-0 text-base text-[#3a2512] font-medium shadow-none"
                />
              </div>
              <div className="hidden sm:block w-px h-8 bg-gray-200 self-center"></div>
              <div className="w-full sm:w-52">
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="w-full h-12 px-4 bg-transparent border-0 focus:ring-0 text-sm text-[#3a2512] font-medium shadow-none">
                    <MapPin className="h-4 w-4 mr-2 text-[#d97706]" />
                    <SelectValue placeholder="Qualquer região" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="todas">Todas as regiões</SelectItem>
                    <SelectItem value="Centro">Centro</SelectItem>
                    <SelectItem value="Gleba Palhano">Gleba Palhano</SelectItem>
                    <SelectItem value="Zona Norte">Zona Norte</SelectItem>
                    <SelectItem value="Zona Sul">Zona Sul</SelectItem>
                    <SelectItem value="Jardim Quebec">Jardim Quebec</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={handleSearch}
                className="w-full sm:w-auto bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-8 h-12 text-sm transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h1 className="font-bold text-xl text-[#3a2512]">
              {isLoading ? (
                <span className="text-gray-400">Buscando...</span>
              ) : (
                <>
                  <span className="text-[#d97706] font-black">{sorted.length}</span>{" "}
                  {sorted.length === 1 ? "negócio encontrado" : "negócios encontrados"}
                  {region && region !== "todas" && ` em ${region}`}
                  {query && ` para "${query}"`}
                </>
              )}
            </h1>

            <div className="flex items-center gap-3">
              <button
                className="md:hidden flex items-center gap-2 text-sm font-bold text-[#3a2512] border border-gray-200 rounded-xl px-4 py-2.5 bg-white"
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

          <div className="flex gap-6 items-start">
            {/* Sidebar Filters */}
            <aside className={`
              w-[240px] flex-shrink-0 bg-white rounded-2xl p-5 shadow-sm border border-gray-100
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
                {/* Category */}
                <div>
                  <h3 className="font-bold text-sm text-[#3a2512] mb-3 flex items-center justify-between">
                    Categoria <ChevronDown className="h-4 w-4 text-gray-400" />
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setCategoria("")}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !categoria ? "bg-[#d97706]/10 text-[#d97706] font-bold" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Todas
                    </button>
                    {categories.map((cat: Category) => {
                      const Icon = getCategoryIcon(cat.icon);
                      const colorClasses = getCategoryColorClasses(cat.color);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoria(cat.slug === categoria ? "" : cat.slug)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                            categoria === cat.slug ? "bg-[#d97706]/10 text-[#d97706] font-bold" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${colorClasses.split(" ")[1]}`} />
                            {cat.name}
                          </span>
                          {cat.businessCount !== undefined && (
                            <span className="text-xs text-gray-400">{cat.businessCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Region */}
                <div>
                  <h3 className="font-bold text-sm text-[#3a2512] mb-3 flex items-center justify-between">
                    Região <ChevronDown className="h-4 w-4 text-gray-400" />
                  </h3>
                  <div className="space-y-1">
                    {["todas", "Centro", "Gleba Palhano", "Zona Norte", "Zona Sul", "Jardim Quebec"].map((reg) => (
                      <button
                        key={reg}
                        onClick={() => setRegion(reg === "todas" ? "" : reg)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          (reg === "todas" && !region) || region === reg
                            ? "bg-[#d97706]/10 text-[#d97706] font-bold"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {reg === "todas" ? "Todas" : reg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(activeFiltersCount > 0 || query) && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    className="w-full border border-gray-200 text-[#3a2512] rounded-xl py-2 text-sm font-bold hover:bg-gray-50 transition-colors"
                    onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}
                  >
                    Limpar filtros
                  </button>
                </div>
              )}

              {mobileFiltersOpen && (
                <div className="mt-4">
                  <button
                    className="w-full bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl py-3 text-sm font-bold transition-colors"
                    onClick={() => { handleSearch(); setMobileFiltersOpen(false); }}
                  >
                    Aplicar Filtros
                  </button>
                </div>
              )}
            </aside>

            {/* Results */}
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
                    className="border border-gray-200 text-[#3a2512] rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginated.map((biz) => (
                      <BusinessCard key={biz.id} business={biz} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[#3a2512] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                            className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${
                              p === page
                                ? "bg-[#d97706] text-white shadow-sm"
                                : "border border-gray-200 bg-white text-[#3a2512] hover:bg-gray-50"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-[#3a2512] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
