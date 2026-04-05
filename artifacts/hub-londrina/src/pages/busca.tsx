import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Search, MapPin, Star, Filter, SlidersHorizontal,
  ChevronDown, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useSearch, useListCategories } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";

export default function Busca() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [region, setRegion] = useState(searchParams.get("regiao") ?? "");
  const [categoria, setCategoria] = useState(searchParams.get("categoria") ?? "");
  const [sort, setSort] = useState("relevance");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(query);

  const { data: searchData, isLoading } = useSearch({
    q: query || undefined,
    region: region || undefined,
    category: categoria || undefined,
  });

  const { data: categoriesData } = useListCategories();
  const categories = categoriesData?.data ?? [];

  const results = searchData?.data ?? [];
  const sorted = [...results].sort((a, b) => {
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "reviews") return b.reviewsCount - a.reviewsCount;
    return 0;
  });

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
      <div className="min-h-screen pb-20">
        {/* Search Bar Section */}
        <section className="pt-28 pb-8 relative z-10 bg-gradient-to-b from-[#6F4E37]/10 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 border border-[#6F4E37]/10">
                <div className="flex-1 relative flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-gray-400" />
                  <Input
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Buscar negócios, serviços..."
                    className="w-full pl-12 pr-4 h-14 bg-transparent border-0 focus-visible:ring-0 rounded-xl text-lg text-[#6F4E37] font-medium shadow-none"
                  />
                </div>

                <div className="hidden md:block w-px h-8 bg-gray-200 self-center"></div>

                <div className="w-full md:w-64">
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="w-full h-14 px-4 bg-transparent border-0 focus:ring-0 rounded-xl text-base text-[#6F4E37] font-medium shadow-none">
                      <MapPin className="h-4 w-4 mr-2 text-[#FF9800]" />
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

                <Button
                  onClick={handleSearch}
                  className="w-full md:w-auto h-14 bg-[#FF9800] hover:bg-[#e68a00] text-white px-8 rounded-xl text-base font-bold shadow-md transition-all"
                >
                  Buscar
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 mt-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#6F4E37]">
              {isLoading ? (
                <span className="text-gray-400">Buscando...</span>
              ) : (
                <>
                  <span className="text-[#FF9800]">{sorted.length} {sorted.length === 1 ? "negócio" : "negócios"}</span>
                  {" "}encontrado{sorted.length !== 1 ? "s" : ""}
                  {region && region !== "todas" && ` em ${region}`}
                  {query && ` para "${query}"`}
                </>
              )}
            </h1>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="md:hidden flex-1 rounded-xl border-[#6F4E37]/20 text-[#6F4E37]"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 bg-[#FF9800] text-white border-0 h-5 px-1.5 text-xs">{activeFiltersCount}</Badge>
                )}
              </Button>

              <div className="flex-1 md:flex-none flex items-center bg-white rounded-xl border border-[#6F4E37]/10 shadow-sm px-3 h-10">
                <span className="text-sm text-gray-500 mr-2 whitespace-nowrap">Ordenar:</span>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="border-0 shadow-none h-8 px-0 focus:ring-0 text-sm font-bold text-[#6F4E37] w-[120px]">
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

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Sidebar Filters */}
            <aside className={`
              w-full md:w-[260px] flex-shrink-0 bg-white rounded-3xl p-6 shadow-lg border border-[#6F4E37]/5
              ${mobileFiltersOpen ? 'fixed inset-0 z-[60] overflow-auto rounded-none' : 'hidden md:block sticky top-28'}
            `}>
              {mobileFiltersOpen && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <h2 className="font-serif text-xl font-bold text-[#6F4E37]">Filtros</h2>
                  <Button variant="ghost" size="icon" onClick={() => setMobileFiltersOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              )}

              {!mobileFiltersOpen && (
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                  <SlidersHorizontal className="h-5 w-5 text-[#FF9800]" />
                  <h2 className="font-serif text-xl font-bold text-[#6F4E37]">Filtrar por</h2>
                </div>
              )}

              <div className="space-y-8">
                {/* Category Filter */}
                <div>
                  <h3 className="font-bold text-[#6F4E37] mb-4 flex items-center justify-between">
                    Categoria
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setCategoria("")}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        !categoria ? "bg-[#FF9800]/10 text-[#FF9800] font-bold" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Todas as categorias
                    </button>
                    {categories.map((cat) => {
                      const Icon = getCategoryIcon(cat.icon);
                      const colorClasses = getCategoryColorClasses(cat.color);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoria(cat.slug === categoria ? "" : cat.slug)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between group ${
                            categoria === cat.slug ? "bg-[#FF9800]/10 text-[#FF9800] font-bold" : "text-gray-600 hover:bg-gray-50"
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

                {/* Region Filter */}
                <div>
                  <h3 className="font-bold text-[#6F4E37] mb-4 flex items-center justify-between">
                    Região
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </h3>
                  <div className="space-y-2">
                    {["todas", "Centro", "Gleba Palhano", "Zona Norte", "Zona Sul", "Jardim Quebec"].map((reg) => (
                      <button
                        key={reg}
                        onClick={() => setRegion(reg === "todas" ? "" : reg)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                          (reg === "todas" && !region) || region === reg
                            ? "bg-[#FF9800]/10 text-[#FF9800] font-bold"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {reg === "todas" ? "Todas as regiões" : reg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(activeFiltersCount > 0 || query) && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl border-[#6F4E37]/20 text-[#6F4E37]"
                    onClick={() => { clearFilters(); setMobileFiltersOpen(false); }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}

              {mobileFiltersOpen && (
                <div className="mt-4">
                  <Button
                    className="w-full bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-xl"
                    onClick={() => { handleSearch(); setMobileFiltersOpen(false); }}
                  >
                    Aplicar Filtros
                  </Button>
                </div>
              )}
            </aside>

            {/* Results Grid */}
            <div className="flex-1 w-full">
              {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-80 bg-white rounded-3xl animate-pulse" />
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-serif text-2xl font-bold text-[#6F4E37] mb-2">Nenhum resultado</h3>
                  <p className="text-gray-500 mb-6">Tente buscar com outros termos ou remover filtros.</p>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="border-[#6F4E37]/20 text-[#6F4E37] rounded-xl"
                  >
                    Limpar filtros
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sorted.map((biz) => (
                    <div
                      key={biz.id}
                      onClick={() => navigate(`/negocio/${biz.id}`)}
                      className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                    >
                      <div className="relative h-[200px] overflow-hidden">
                        <div className="absolute top-4 left-4 z-20">
                          <Badge className="px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-full bg-[#6F4E37]/10 text-[#6F4E37] border-0">
                            {biz.categorySlug}
                          </Badge>
                        </div>
                        <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 text-sm font-black text-[#6F4E37] shadow-sm">
                          <Star className="h-3.5 w-3.5 fill-[#FF9800] text-[#FF9800]" />
                          {biz.rating}
                        </div>
                        {biz.photoUrl ? (
                          <img
                            src={biz.photoUrl}
                            alt={biz.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#FF9800]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />
                        {biz.verified && (
                          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 shadow"></span>
                            <span className="text-white text-xs font-bold drop-shadow-md">Verificado</span>
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-serif text-xl font-bold text-[#6F4E37] group-hover:text-[#FF9800] transition-colors leading-tight">
                            {biz.name}
                          </h3>
                          <span className="text-xs text-gray-400 font-medium ml-2 flex-shrink-0">{biz.reviewsCount} aval.</span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-2">{biz.description}</p>

                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                          <MapPin className="h-4 w-4 text-[#FF9800] flex-shrink-0" />
                          <span>{biz.region}, Londrina</span>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                          {biz.whatsapp ? (
                            <a
                              href={`https://wa.me/55${biz.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1"
                            >
                              <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-5 font-bold shadow-sm">
                                WhatsApp
                              </Button>
                            </a>
                          ) : (
                            <Button className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-5 font-bold shadow-sm">
                              Ver Perfil
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="flex-1 border-gray-200 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-xl py-5 font-semibold"
                          >
                            Detalhes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
