import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  MapPin, Star, Share2, Heart, CheckCircle2, Phone,
  MessageCircle, Clock, Navigation, ArrowLeft, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import {
  useGetBusinessById, useListBusinesses,
  type Review, type Business
} from "@workspace/api-client-react";
import { BusinessCard } from "@/components/BusinessCard";

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "fill-[#d97706] text-[#d97706]" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function getRatingDistribution(reviews: Review[]) {
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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff < 1) return "Hoje";
  if (diff < 7) return `Há ${diff} dia${diff > 1 ? "s" : ""}`;
  if (diff < 30) return `Há ${Math.floor(diff / 7)} semana${Math.floor(diff / 7) > 1 ? "s" : ""}`;
  return `Há ${Math.floor(diff / 30)} ${Math.floor(diff / 30) > 1 ? "meses" : "mês"}`;
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

  const reviews: Review[] = business?.reviews ?? [];
  const ratingDist = getRatingDistribution(reviews);
  const similar: Business[] = (similarData?.data ?? []).filter((b: Business) => b.id !== id).slice(0, 2);

  if (isLoading) {
    return (
      <Layout>
        <div className="pt-16">
          <div className="h-[320px] bg-gray-200 animate-pulse" />
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-56 mb-4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !business) {
    return (
      <Layout>
        <div className="pt-40 text-center container mx-auto px-4">
          <h1 className="font-black text-3xl text-[#3a2512] mb-4">Negócio não encontrado</h1>
          <p className="text-gray-500 mb-8">Este negócio não existe ou foi removido.</p>
          <Button onClick={() => navigate("/busca")} className="bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl">
            Voltar para a busca
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
        {/* Hero Section */}
        <div className="relative h-[320px] bg-[#3a2512] overflow-hidden">
          {business.photoUrl ? (
            <img
              src={business.photoUrl}
              alt={business.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#6F4E37] to-[#d97706] opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0f07] via-transparent to-transparent" />

          <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-8">
            <button
              onClick={() => navigate("/busca")}
              className="absolute top-6 left-4 md:left-8 flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {business.category && (
                <span className="bg-[#4CAF50] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {business.category.name}
                </span>
              )}
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-bold">
                <Star className="h-3.5 w-3.5 fill-[#d97706] text-[#d97706]" />
                {business.rating}
                <span className="font-normal opacity-70 text-xs">({business.reviewsCount})</span>
              </div>
              {business.verified && (
                <span className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#4CAF50]" />
                  Verificado
                </span>
              )}
            </div>
            <h1 className="font-black text-3xl md:text-4xl text-white mb-1 leading-tight drop-shadow">
              {business.name}
            </h1>
            <p className="text-white/70 text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#d97706]" />
              {business.region}, Londrina - PR
            </p>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-16 z-40 transition-colors">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
              {business.whatsapp && (
                <a
                  href={`https://wa.me/55${business.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button className="bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl px-5 h-10 font-bold flex items-center gap-2 shadow-none text-sm">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex-shrink-0">
                  <Button variant="outline" className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-4 h-10 font-semibold flex items-center gap-2 shadow-none text-sm">
                    <Phone className="h-4 w-4" />
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
                <Button variant="outline" className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-4 h-10 font-semibold flex items-center gap-2 shadow-none text-sm">
                  <Navigation className="h-4 w-4" />
                  Rotas
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className={`border-gray-200 rounded-xl px-4 h-10 font-semibold text-sm flex items-center gap-2 shadow-none ${isFavorite ? "bg-red-50 text-red-500 border-red-200" : "text-[#3a2512] hover:bg-gray-50"}`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                Salvar
              </Button>
              <Button
                variant="outline"
                className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-4 h-10 font-semibold text-sm flex items-center gap-2 shadow-none"
                onClick={() => navigator.share?.({ title: business.name, url: window.location.href })}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — Tabs */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="sobre" className="w-full">
                <TabsList className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-1 rounded-xl w-full justify-start h-auto flex-wrap shadow-sm mb-6">
                  <TabsTrigger value="sobre" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Sobre
                  </TabsTrigger>
                  {business.photoUrl && (
                    <TabsTrigger value="fotos" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                      Fotos
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="vitrine" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Vitrine
                  </TabsTrigger>
                  <TabsTrigger value="avaliacoes" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Avaliações ({reviews.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="sobre" className="focus-visible:outline-none">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100 mb-4">Sobre o Negócio</h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">{business.description}</p>
                  </div>
                </TabsContent>

                {business.photoUrl && (
                  <TabsContent value="fotos" className="focus-visible:outline-none">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                      <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100 mb-4">Galeria de Fotos</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="aspect-square rounded-xl overflow-hidden">
                          <img
                            src={business.photoUrl}
                            alt={business.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="vitrine" className="focus-visible:outline-none">
                  {(() => {
                    const vitrineMap: Record<string, { name: string; price: string; photo: string }[]> = {
                      restaurantes: [
                        { name: "Prato do Dia", price: "R$ 32,00", photo: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=650&fit=crop" },
                        { name: "Frango na Brasa", price: "R$ 45,00", photo: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400&h=650&fit=crop" },
                        { name: "Feijoada Completa", price: "R$ 55,00", photo: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=650&fit=crop" },
                        { name: "Sobremesa do Chef", price: "R$ 18,00", photo: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=650&fit=crop" },
                      ],
                      saloes: [
                        { name: "Corte + Barba", price: "R$ 60,00", photo: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=650&fit=crop" },
                        { name: "Escova Progressiva", price: "R$ 180,00", photo: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=650&fit=crop" },
                        { name: "Manicure + Pedicure", price: "R$ 75,00", photo: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=650&fit=crop" },
                        { name: "Coloração Completa", price: "R$ 220,00", photo: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=650&fit=crop" },
                      ],
                      cafeterias: [
                        { name: "Café + Pão na Chapa", price: "R$ 14,00", photo: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=650&fit=crop" },
                        { name: "Cappuccino Especial", price: "R$ 12,00", photo: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=650&fit=crop" },
                        { name: "Bolo do Dia", price: "R$ 10,00", photo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=650&fit=crop" },
                        { name: "Combo Brunch", price: "R$ 38,00", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=650&fit=crop" },
                      ],
                      padarias: [
                        { name: "Pão Artesanal", price: "R$ 18,00", photo: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=650&fit=crop" },
                        { name: "Kit Café da Manhã", price: "R$ 35,00", photo: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=650&fit=crop" },
                        { name: "Bolo de Cenoura", price: "R$ 22,00", photo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=650&fit=crop" },
                        { name: "Croissant Recheado", price: "R$ 8,00", photo: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=650&fit=crop" },
                      ],
                    };
                    const defaultItems = [
                      { name: "Serviço Básico", price: "R$ 50,00", photo: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=650&fit=crop" },
                      { name: "Pacote Completo", price: "R$ 120,00", photo: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=650&fit=crop" },
                      { name: "Atendimento VIP", price: "R$ 200,00", photo: "https://images.unsplash.com/photo-1556155092-490a1ba16284?w=400&h=650&fit=crop" },
                      { name: "Consulta Grátis", price: "Gratuito", photo: "https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&h=650&fit=crop" },
                    ];
                    const items = vitrineMap[business.categorySlug] ?? defaultItems;
                    const waBase = business.whatsapp ? `https://wa.me/55${business.whatsapp.replace(/\D/g, "")}` : "#";
                    return (
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-5">
                          <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100">Vitrine de Produtos</h2>
                          <span className="text-xs text-gray-400 font-medium">Peça pelo WhatsApp</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {items.map((item, i) => (
                            <div key={i} className="relative rounded-xl overflow-hidden group cursor-pointer" style={{ height: "240px", boxShadow: "0 4px 16px rgba(0,0,0,0.14)" }}>
                              <img src={item.photo} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.0) 100%)" }} />
                              <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
                                <p className="text-white font-black text-sm leading-tight">{item.name}</p>
                                <p className="text-white font-bold text-base leading-tight">{item.price}</p>
                                <a
                                  href={`${waBase}?text=${encodeURIComponent(`Olá! Quero pedir: ${item.name} (${item.price})`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 bg-[#25D366] hover:bg-[#1dbd59] text-white font-bold text-[11px] rounded-full py-1.5 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Pedir no WhatsApp
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="avaliacoes" className="focus-visible:outline-none">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100 mb-6">Avaliações</h2>

                    {reviews.length > 0 && (
                      <div className="flex flex-col md:flex-row items-center gap-6 mb-8 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <span className="text-5xl font-black text-[#3a2512] dark:text-gray-100">{business.rating}</span>
                          <div className="my-2"><StarRating rating={business.rating} /></div>
                          <span className="text-xs text-gray-500 font-medium">{reviews.length} avaliações</span>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                          {ratingDist.map((row) => (
                            <div key={row.stars} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                              <span className="w-3 text-right text-xs">{row.stars}</span>
                              <Star className="h-3.5 w-3.5 text-gray-300 fill-gray-300" />
                              <Progress value={row.pct} className="h-1.5 flex-1 bg-gray-200 [&>div]:bg-[#d97706]" />
                              <span className="w-7 text-right text-xs text-gray-400">{row.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviews.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Ainda não há avaliações para este negócio.</p>
                    ) : (
                      <div className="space-y-5">
                        {reviews.map((review: Review) => {
                          const initials = review.author.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                          const colors = ["bg-pink-100 text-pink-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700"];
                          const color = colors[review.id % colors.length];
                          return (
                            <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-5 last:pb-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-gray-100 dark:border-gray-700">
                                    <AvatarFallback className={`font-bold text-sm ${color}`}>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-[#3a2512] dark:text-gray-100 text-sm">{review.author}</div>
                                    <div className="text-xs text-gray-400">{formatDate(review.createdAt)}</div>
                                  </div>
                                </div>
                                <StarRating rating={review.rating} />
                              </div>
                              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{review.text}</p>
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
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-black text-lg text-[#3a2512] dark:text-gray-100 mb-4">Informações</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#d97706]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4.5 w-4.5 text-[#d97706]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#3a2512] dark:text-gray-200 text-xs uppercase tracking-wider mb-1">Endereço</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{business.address}, {business.region}<br />Londrina - PR</p>
                    </div>
                  </div>

                  {business.hours && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4.5 w-4.5 text-[#4CAF50]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#3a2512] dark:text-gray-200 text-xs uppercase tracking-wider mb-1">Horário</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{business.hours}</p>
                      </div>
                    </div>
                  )}

                  {business.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Phone className="h-4.5 w-4.5 text-blue-600" />
                      </div>
                      <a href={`tel:${business.phone}`} className="text-sm font-medium text-[#3a2512] dark:text-gray-200 hover:text-[#d97706] transition-colors">
                        {business.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                <div
                  className="relative h-44 bg-gradient-to-br from-[#e8f5e9] to-[#dcedc8] flex flex-col items-center justify-center gap-3 cursor-pointer group"
                  onClick={() =>
                    window.open(
                      `https://maps.google.com/?q=${encodeURIComponent(business.address + ", " + business.region + ", Londrina, PR")}`,
                      "_blank"
                    )
                  }
                >
                  {/* Decorative grid */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "linear-gradient(#7cb342 1px, transparent 1px), linear-gradient(90deg, #7cb342 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#d97706] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <MapPin className="h-6 w-6 text-white fill-white" />
                    </div>
                    <span className="text-sm font-bold text-[#3a2512] text-center px-4 leading-tight">
                      {business.address}
                    </span>
                    <span className="text-xs text-[#3a2512]/60 font-medium">{business.region}, Londrina - PR</span>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-100">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(business.address + ", " + business.region + ", Londrina, PR")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm font-bold text-[#d97706] hover:text-[#b45309] transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    Ver no Google Maps
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* CTA for business owners */}
              <div className="bg-[#4a2c0e] rounded-2xl p-5 text-white">
                <h3 className="font-black text-base mb-2">É o dono deste negócio?</h3>
                <p className="text-white/70 text-xs mb-4 leading-relaxed">
                  Reivindique para atualizar informações e atrair mais clientes.
                </p>
                <button
                  onClick={() => navigate("/anuncie")}
                  className="w-full bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl py-2.5 text-sm font-bold transition-colors"
                >
                  Reivindicar Página
                </button>
              </div>

              {/* Similar Businesses */}
              {similar.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base text-[#3a2512]">Similares na Região</h3>
                    <button
                      onClick={() => navigate(`/busca?categoria=${business.categorySlug}`)}
                      className="text-xs text-[#d97706] font-bold hover:text-[#b45309] transition-colors"
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="space-y-3">
                    {similar.map((biz: Business) => (
                      <BusinessCard key={biz.id} business={biz} size="sm" />
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
