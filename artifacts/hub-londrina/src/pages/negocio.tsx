import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  MapPin, Star, Share2, Heart, CheckCircle2, Phone,
  MessageCircle, Clock, Globe, Navigation, ArrowLeft, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import { useGetBusinessById, useListBusinesses } from "@workspace/api-client-react";

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "fill-[#FF9800] text-[#FF9800]" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function getRatingDistribution(reviews: Array<{ rating: number }>) {
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    dist[r.rating] = (dist[r.rating] ?? 0) + 1;
  }
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    pct: Math.round(((dist[stars] ?? 0) / total) * 100),
  }));
}

export default function Negocio() {
  const [, params] = useRoute("/negocio/:id");
  const [, navigate] = useLocation();
  const [isFavorite, setIsFavorite] = useState(false);
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: business, isLoading, isError } = useGetBusinessById(id);
  const { data: similarData } = useListBusinesses({
    category: business?.categorySlug,
  });

  const reviews = business?.reviews ?? [];
  const ratingDist = getRatingDistribution(reviews);
  const similar = (similarData?.data ?? []).filter((b) => b.id !== id).slice(0, 3);

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diff < 1) return "Hoje";
    if (diff < 7) return `Há ${diff} dia${diff > 1 ? "s" : ""}`;
    if (diff < 30) return `Há ${Math.floor(diff / 7)} semana${Math.floor(diff / 7) > 1 ? "s" : ""}`;
    return `Há ${Math.floor(diff / 30)} mês${Math.floor(diff / 30) > 1 ? "es" : ""}`;
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="pt-20">
          <div className="h-[380px] bg-gray-200 animate-pulse" />
          <div className="container mx-auto px-4 py-12">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-64 mb-4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-48" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !business) {
    return (
      <Layout>
        <div className="pt-40 text-center container mx-auto px-4">
          <h1 className="font-serif text-3xl font-bold text-[#6F4E37] mb-4">Negócio não encontrado</h1>
          <p className="text-gray-500 mb-8">Este negócio não existe ou foi removido.</p>
          <Button onClick={() => navigate("/busca")} className="bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-xl">
            Voltar para a busca
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-24">
        {/* Hero Section */}
        <section className="relative mt-20 h-[380px] w-full bg-[#2D1B12] overflow-hidden">
          {business.photoUrl ? (
            <img
              src={business.photoUrl}
              alt={business.name}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#6F4E37] to-[#FF9800] opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a100a] via-[#2D1B12]/60 to-transparent" />

          <div className="container mx-auto px-4 h-full relative z-10 flex flex-col justify-end pb-12">
            <button
              onClick={() => navigate("/busca")}
              className="absolute top-8 left-4 md:left-0 flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {business.category && (
                  <span className="bg-[#4CAF50] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    {business.category.name}
                  </span>
                )}
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-bold border border-white/10">
                  <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                  <span>{business.rating}</span>
                  <span className="font-normal opacity-80">({business.reviewsCount} avaliações)</span>
                </div>
                {business.verified && (
                  <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-bold border border-white/10">
                    <CheckCircle2 className="h-4 w-4 text-[#4CAF50]" />
                    Verificado
                  </span>
                )}
              </div>

              <h1 className="font-serif text-5xl md:text-6xl font-black text-white drop-shadow-lg mb-2">
                {business.name}
              </h1>
              <p className="text-white/80 text-lg font-light flex items-center gap-2 drop-shadow-md">
                <MapPin className="h-5 w-5 text-[#FF9800]" />
                {business.region}, Londrina - PR
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions Bar */}
        <div className="bg-white border-b border-[#6F4E37]/10 sticky top-20 z-40 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex w-full md:w-auto items-center gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {business.whatsapp && (
                <a
                  href={`https://wa.me/55${business.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex-1 md:flex-none"
                >
                  <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-2xl px-6 py-6 font-bold shadow-md flex items-center gap-2 min-w-max text-lg">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp
                  </Button>
                </a>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex-shrink-0">
                  <Button variant="outline" className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-2xl px-5 py-6 font-semibold shadow-sm flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Ligar
                  </Button>
                </a>
              )}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address + ", Londrina, PR")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button variant="outline" className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-2xl px-5 py-6 font-semibold shadow-sm flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Rotas
                </Button>
              </a>
            </div>

            <div className="flex w-full md:w-auto items-center justify-end gap-3 border-t md:border-t-0 border-[#6F4E37]/10 pt-3 md:pt-0">
              <Button
                variant="outline"
                className={`border-[#6F4E37]/20 rounded-2xl px-4 py-6 font-semibold shadow-sm flex items-center gap-2 transition-colors ${isFavorite ? "bg-red-50 text-red-500 border-red-200" : "text-[#6F4E37] hover:bg-[#F5F5DC]"}`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                Salvar
              </Button>
              <Button
                variant="outline"
                className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-2xl px-4 py-6 font-semibold shadow-sm flex items-center gap-2"
                onClick={() => navigator.share?.({ title: business.name, url: window.location.href })}
              >
                <Share2 className="h-5 w-5" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <Tabs defaultValue="sobre" className="w-full">
                <TabsList className="bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-[#6F4E37]/10 w-full justify-start h-auto flex-wrap mb-8 shadow-sm">
                  <TabsTrigger value="sobre" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-[#FF9800] data-[state=active]:shadow-md transition-all">
                    Sobre
                  </TabsTrigger>
                  {business.photoUrl && (
                    <TabsTrigger value="fotos" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-[#FF9800] data-[state=active]:shadow-md transition-all">
                      Fotos
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="avaliacoes" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-[#FF9800] data-[state=active]:shadow-md transition-all">
                    Avaliações ({reviews.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sobre" className="focus-visible:outline-none">
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                    <h2 className="font-serif text-3xl font-black text-[#6F4E37] mb-6">Sobre o Negócio</h2>
                    <p className="text-gray-600 leading-relaxed text-lg mb-8">{business.description}</p>

                    {business.planType !== "free" && (
                      <>
                        <h3 className="font-serif text-2xl font-bold text-[#6F4E37] mb-6 border-t border-gray-100 pt-8">Plano</h3>
                        <div className="inline-flex items-center gap-2 bg-[#FF9800]/10 text-[#FF9800] px-4 py-2 rounded-full font-bold">
                          <Check className="h-4 w-4" />
                          {business.planType === "destaque" ? "Plano Destaque" : "Plano Premium"}
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                {business.photoUrl && (
                  <TabsContent value="fotos" className="focus-visible:outline-none">
                    <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                      <h2 className="font-serif text-3xl font-black text-[#6F4E37] mb-6">Galeria</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group">
                          <img
                            src={business.photoUrl}
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="avaliacoes" className="focus-visible:outline-none">
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="font-serif text-3xl font-black text-[#6F4E37]">Avaliações</h2>
                    </div>

                    {reviews.length > 0 && (
                      <div className="flex flex-col md:flex-row items-center gap-8 mb-10 p-6 bg-[#F5F5DC]/40 rounded-2xl border border-[#6F4E37]/10">
                        <div className="flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-6xl font-black text-[#6F4E37]">{business.rating}</span>
                          <div className="flex gap-1 my-2">
                            <StarRating rating={business.rating} />
                          </div>
                          <span className="text-sm text-gray-500 font-medium">{reviews.length} avaliações</span>
                        </div>

                        <div className="flex-1 w-full space-y-2">
                          {ratingDist.map((row) => (
                            <div key={row.stars} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                              <span className="w-4 text-right">{row.stars}</span>
                              <Star className="h-4 w-4 text-gray-400 fill-gray-400" />
                              <Progress value={row.pct} className="h-2 flex-1 bg-gray-100 [&>div]:bg-[#FF9800]" />
                              <span className="w-8 text-right text-gray-400">{row.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviews.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">Ainda não há avaliações para este negócio.</p>
                    ) : (
                      <div className="space-y-6">
                        {reviews.map((review) => {
                          const initials = review.author.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                          const colors = ["bg-pink-100 text-pink-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700"];
                          const color = colors[review.id % colors.length];
                          return (
                            <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-12 w-12 border border-white shadow-sm">
                                    <AvatarFallback className={`font-bold ${color}`}>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-[#6F4E37]">{review.author}</div>
                                    <div className="text-xs text-gray-400">{formatDate(review.createdAt)}</div>
                                  </div>
                                </div>
                                <StarRating rating={review.rating} />
                              </div>
                              <p className="text-gray-600 leading-relaxed">{review.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <h3 className="font-serif text-xl font-black text-[#6F4E37] mb-6">Informações</h3>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#FF9800]/10 flex items-center justify-center flex-shrink-0 text-[#FF9800]">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#6F4E37] text-sm mb-1">Endereço</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{business.address}<br />{business.region}<br />Londrina - PR</p>
                    </div>
                  </div>

                  {business.hours && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0 text-[#4CAF50]">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#6F4E37] text-sm mb-1">Horário de Funcionamento</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{business.hours}</p>
                      </div>
                    </div>
                  )}

                  {business.phone && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col justify-center h-10">
                        <a href={`tel:${business.phone}`} className="font-medium text-[#6F4E37] text-sm hover:text-[#FF9800] transition-colors">
                          {business.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {business.whatsapp && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col justify-center h-10">
                        <a
                          href={`https://wa.me/55${business.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#6F4E37] text-sm hover:text-[#FF9800] transition-colors"
                        >
                          WhatsApp: {business.whatsapp}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ads CTA */}
              <div className="bg-gradient-to-br from-[#2D1B12] to-[#4A2F1D] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9800]/20 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <h3 className="font-serif text-2xl font-black mb-3">É dono deste negócio?</h3>
                  <p className="text-white/80 text-sm mb-6 leading-relaxed">
                    Reivindique esta página para atualizar informações e atrair mais clientes.
                  </p>
                  <Button
                    onClick={() => navigate("/anuncie")}
                    className="w-full bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-xl py-6 font-bold shadow-lg"
                  >
                    Reivindicar Página
                  </Button>
                </div>
              </div>

              {/* Similar Businesses */}
              {similar.length > 0 && (
                <div>
                  <h3 className="font-serif text-xl font-black text-[#6F4E37] mb-4 flex items-center justify-between">
                    Similares na Região
                    <button
                      onClick={() => navigate(`/busca?categoria=${business.categorySlug}`)}
                      className="text-xs text-[#FF9800] font-bold hover:underline"
                    >
                      Ver todos
                    </button>
                  </h3>

                  <div className="space-y-3">
                    {similar.map((biz) => (
                      <div
                        key={biz.id}
                        onClick={() => navigate(`/negocio/${biz.id}`)}
                        className="bg-white rounded-2xl p-3 flex gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                          {biz.photoUrl ? (
                            <img
                              src={biz.photoUrl}
                              alt={biz.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#FF9800]" />
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <h4 className="font-bold text-[#6F4E37] text-sm group-hover:text-[#FF9800] transition-colors">{biz.name}</h4>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {biz.region}
                          </p>
                          <div className="flex items-center gap-1 text-xs font-bold text-[#6F4E37]">
                            <Star className="h-3 w-3 text-[#FF9800] fill-[#FF9800]" />
                            {biz.rating}
                            <span className="text-gray-400 font-normal">({biz.reviewsCount})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
