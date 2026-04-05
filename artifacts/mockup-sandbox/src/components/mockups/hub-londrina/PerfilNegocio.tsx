import React, { useState } from "react";
import { 
  MapPin, Star, Share2, Heart, CheckCircle2, Phone, 
  MessageCircle, Clock, Mail, Globe, Navigation,
  ArrowRight, Menu, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export function PerfilNegocio() {
  const [isFavorite, setIsFavorite] = useState(false);

  const reviews = [
    { id: 1, name: "Carolina Mendes", rating: 5, date: "Há 2 dias", text: "O melhor cappuccino da cidade! O ambiente é super aconchegante e o atendimento impecável.", avatar: "CM", color: "bg-pink-100 text-pink-700" },
    { id: 2, name: "João Pedro", rating: 5, date: "Há 1 semana", text: "Ótimo lugar para trabalhar. A internet é rápida e os grãos especiais fazem toda a diferença.", avatar: "JP", color: "bg-blue-100 text-blue-700" },
    { id: 3, name: "Amanda Silva", rating: 4, date: "Há 2 semanas", text: "Doces maravilhosos, especialmente a torta de limão. Só costuma ficar um pouco cheio aos finais de semana.", avatar: "AS", color: "bg-green-100 text-green-700" },
    { id: 4, name: "Lucas Costa", rating: 5, date: "Há 1 mês", text: "Sempre venho tomar meu café da manhã aqui. Os baristas são muito simpáticos e explicam tudo sobre os cafés.", avatar: "LC", color: "bg-orange-100 text-orange-700" }
  ];

  return (
    <div className="min-h-screen bg-[#F5F5DC] font-sans text-[#6F4E37] selection:bg-[#FF9800] selection:text-white pb-24">
      {/* Pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#6F4E37 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#F5F5DC]/90 backdrop-blur-md border-b border-[#6F4E37]/10 transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative flex items-center justify-center w-10 h-10">
              <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-md">
                <path d="M50 10 C30 10, 20 30, 20 50 C20 70, 50 90, 50 90 C50 90, 80 70, 80 50 C80 30, 70 10, 50 10 Z" fill="#FF9800" />
                <path d="M50 25 C40 25, 35 35, 35 45 C35 55, 50 65, 50 65 C50 65, 65 55, 65 45 C65 35, 60 25, 50 25 Z" fill="#6F4E37" />
                <path d="M45 35 Q50 45, 45 55" stroke="#F5F5DC" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-2xl tracking-tight leading-none text-[#6F4E37]">HUB LONDRINA</span>
              <span className="text-[10px] tracking-[0.2em] font-bold text-[#4CAF50] mt-0.5">NEGÓCIO LOCAL</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 font-medium">
            <a href="#" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Início</a>
            <a href="#" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Categorias</a>
            <a href="#" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Destaques</a>
          </nav>

          <div className="flex items-center gap-4">
            <Button className="hidden md:flex bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full px-6 py-5 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Anuncie Aqui
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden text-[#6F4E37]">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mt-20 h-[380px] w-full bg-[#2D1B12] overflow-hidden">
        <img 
          src="/__mockup/images/biz-coffee.png" 
          alt="Café do Ponto" 
          className="absolute inset-0 w-full h-full object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a100a] via-[#2D1B12]/60 to-transparent" />
        
        <div className="container mx-auto px-4 h-full relative z-10 flex flex-col justify-end pb-12">
          <div className="absolute top-8 right-4 md:right-0">
            <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-[#6F4E37] rounded-full font-bold">
              Anunciar Negócio Similar
            </Button>
          </div>

          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-[#4CAF50] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                Cafeteria
              </span>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-bold border border-white/10">
                <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                <span>5.0</span>
                <span className="font-normal opacity-80">(210 avaliações)</span>
              </div>
              <span className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-sm font-bold border border-white/10">
                <CheckCircle2 className="h-4 w-4 text-[#4CAF50]" />
                Verificado
              </span>
            </div>
            
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-lg mb-2">
              Café do Ponto
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-light flex items-center gap-2 drop-shadow-md">
              <MapPin className="h-5 w-5 text-[#FF9800]" />
              Jardim Quebec, Londrina - PR
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <div className="bg-white border-b border-[#6F4E37]/10 sticky top-20 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex w-full md:w-auto items-center gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <Button className="bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-2xl px-6 py-6 font-bold shadow-md flex items-center gap-2 min-w-max flex-1 md:flex-none text-lg">
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </Button>
            <Button variant="outline" className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-2xl px-5 py-6 font-semibold shadow-sm flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Ligar
            </Button>
            <Button variant="outline" className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-2xl px-5 py-6 font-semibold shadow-sm flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Rotas
            </Button>
          </div>
          
          <div className="flex w-full md:w-auto items-center justify-end gap-3 border-t md:border-t-0 border-[#6F4E37]/10 pt-3 md:pt-0">
            <Button 
              variant="outline" 
              className={`border-[#6F4E37]/20 rounded-2xl px-4 py-6 font-semibold shadow-sm flex items-center gap-2 transition-colors ${isFavorite ? 'bg-red-50 text-red-500 border-red-200' : 'text-[#6F4E37] hover:bg-[#F5F5DC]'}`}
              onClick={() => setIsFavorite(!isFavorite)}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              Salvar
            </Button>
            <Button variant="outline" className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-2xl px-4 py-6 font-semibold shadow-sm flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="sobre" className="w-full">
              <TabsList className="bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-[#6F4E37]/10 w-full justify-start h-auto flex-wrap mb-8 shadow-sm">
                <TabsTrigger value="sobre" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-[#FF9800] data-[state=active]:shadow-md transition-all">Sobre</TabsTrigger>
                <TabsTrigger value="fotos" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-[#FF9800] data-[state=active]:shadow-md transition-all">Fotos</TabsTrigger>
                <TabsTrigger value="avaliacoes" className="rounded-xl px-6 py-3 font-bold text-base data-[state=active]:bg-white data-[state=active]:text-[#FF9800] data-[state=active]:shadow-md transition-all">Avaliações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sobre" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                  <h2 className="font-serif text-3xl font-black text-[#6F4E37] mb-6">Nossa História</h2>
                  <div className="prose max-w-none text-gray-600 leading-relaxed mb-10 text-lg">
                    <p className="mb-4">
                      O Café do Ponto nasceu da paixão por grãos selecionados e momentos bem vividos. Localizado no coração do Jardim Quebec, oferecemos um refúgio acolhedor para quem busca uma pausa no dia a dia corrido de Londrina.
                    </p>
                    <p>
                      Trabalhamos exclusivamente com cafés especiais de torrefações locais e nacionais, preparados por baristas apaixonados. Nossa confeitaria é 100% artesanal, feita diariamente com ingredientes frescos e amor.
                    </p>
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-[#6F4E37] mb-6 border-t border-gray-100 pt-8">Especialidades</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {[
                      "Cafés Especiais & Filtrados", 
                      "Confeitaria Artesanal", 
                      "Brunch o dia todo", 
                      "Wi-Fi Rápido", 
                      "Pet Friendly na Varanda", 
                      "Grãos para levar"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-gray-700 bg-[#F5F5DC]/50 p-4 rounded-2xl border border-[#6F4E37]/5">
                        <Check className="h-5 w-5 text-[#4CAF50]" />
                        <span className="font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fotos" className="focus-visible:outline-none">
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                  <h2 className="font-serif text-3xl font-black text-[#6F4E37] mb-6">Galeria</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group">
                      <img src="/__mockup/images/biz-coffee-detail.png" alt="Café detalhe" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group">
                      <img src="/__mockup/images/biz-coffee.png" alt="Café interior" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group">
                      <img src="/__mockup/images/biz-coffee.png" alt="Café fachada" className="w-full h-full object-cover brightness-110 sepia-[.2] group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group">
                      <img src="/__mockup/images/biz-coffee-detail.png" alt="Café detalhe 2" className="w-full h-full object-cover brightness-90 saturate-150 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group">
                      <img src="/__mockup/images/biz-coffee.png" alt="Café balcão" className="w-full h-full object-cover saturate-50 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="aspect-square rounded-2xl overflow-hidden cursor-pointer group relative">
                      <img src="/__mockup/images/biz-coffee.png" alt="Mais fotos" className="w-full h-full object-cover blur-[2px]" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">+12 fotos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="avaliacoes" className="focus-visible:outline-none">
                <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="font-serif text-3xl font-black text-[#6F4E37]">Avaliações</h2>
                    <Button className="bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-2xl font-bold shadow-md">
                      Avaliar
                    </Button>
                  </div>
                  
                  {/* Reviews Summary */}
                  <div className="flex flex-col md:flex-row items-center gap-8 mb-10 p-6 bg-[#F5F5DC]/40 rounded-2xl border border-[#6F4E37]/10">
                    <div className="flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-6xl font-black text-[#6F4E37]">5.0</span>
                      <div className="flex gap-1 my-2">
                        {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-[#FF9800] text-[#FF9800]" />)}
                      </div>
                      <span className="text-sm text-gray-500 font-medium">210 avaliações</span>
                    </div>
                    
                    <div className="flex-1 w-full space-y-2">
                      {[
                        { stars: 5, pct: 90 },
                        { stars: 4, pct: 8 },
                        { stars: 3, pct: 2 },
                        { stars: 2, pct: 0 },
                        { stars: 1, pct: 0 }
                      ].map(row => (
                        <div key={row.stars} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                          <span className="w-4 text-right">{row.stars}</span>
                          <Star className="h-4 w-4 text-gray-400 fill-gray-400" />
                          <Progress value={row.pct} className="h-2 flex-1 bg-gray-100 [&>div]:bg-[#FF9800]" />
                          <span className="w-8 text-right text-gray-400">{row.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review List */}
                  <div className="space-y-6">
                    {reviews.map(review => (
                      <div key={review.id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border border-white shadow-sm">
                              <AvatarFallback className={`font-bold ${review.color}`}>{review.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-[#6F4E37]">{review.name}</div>
                              <div className="text-xs text-gray-400">{review.date}</div>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-[#FF9800] text-[#FF9800]' : 'fill-gray-200 text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 leading-relaxed">{review.text}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 text-center">
                     <Button variant="outline" className="border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] rounded-xl font-semibold">
                       Carregar mais avaliações
                     </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar (1/3) */}
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
                    <p className="text-gray-600 text-sm leading-relaxed">Rua Humaitá, 123 - Loja 2<br/>Jardim Quebec<br/>Londrina - PR, 86060-000</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0 text-[#4CAF50]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="w-full">
                    <h4 className="font-bold text-[#6F4E37] text-sm mb-2">Horário de Funcionamento</h4>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Segunda a Sexta</span>
                        <span className="font-medium text-[#6F4E37]">07:00 - 19:00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sábado</span>
                        <span className="font-medium text-[#6F4E37]">08:00 - 17:00</span>
                      </div>
                      <div className="flex justify-between text-red-500">
                        <span>Domingo</span>
                        <span className="font-medium">Fechado</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col justify-center h-10">
                    <a href="#" className="font-medium text-[#6F4E37] text-sm hover:text-[#FF9800] transition-colors">@cafedoponto.ldn</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-[#EFE8D8] rounded-3xl h-48 relative overflow-hidden shadow-inner border border-[#6F4E37]/10 flex items-center justify-center group cursor-pointer">
               <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/basic-v2/256/0/0/0.png')] opacity-30 mix-blend-multiply bg-cover bg-center"></div>
               <div className="w-12 h-12 bg-[#FF9800] rounded-full flex items-center justify-center text-white shadow-lg relative z-10 group-hover:scale-110 transition-transform">
                 <MapPin className="h-6 w-6" />
               </div>
               <div className="absolute bottom-3 right-3 z-10">
                 <Button size="sm" variant="secondary" className="bg-white/90 backdrop-blur-sm text-[#6F4E37] hover:bg-white rounded-xl shadow-sm text-xs font-bold">
                   Ver no Mapa
                 </Button>
               </div>
            </div>

            {/* Ads CTA */}
            <div className="bg-gradient-to-br from-[#2D1B12] to-[#4A2F1D] rounded-3xl p-8 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9800]/20 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <h3 className="font-serif text-2xl font-black mb-3">É dono deste negócio?</h3>
                <p className="text-white/80 text-sm mb-6 leading-relaxed">
                  Reivindique esta página para responder a avaliações, atualizar informações e atrair mais clientes.
                </p>
                <Button className="w-full bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-xl py-6 font-bold shadow-lg">
                  Reivindicar Página
                </Button>
              </div>
            </div>

            {/* Similar Businesses */}
            <div>
              <h3 className="font-serif text-xl font-black text-[#6F4E37] mb-4 mt-8 flex items-center justify-between">
                Similares na Região
                <Button variant="link" className="text-xs text-[#FF9800] p-0 h-auto font-bold">Ver todos</Button>
              </h3>
              
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-3 flex gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img src="/__mockup/images/biz-restaurant.png" alt="Sabor da Terra" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="font-bold text-[#6F4E37] text-sm group-hover:text-[#FF9800] transition-colors">Sabor da Terra</h4>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Gleba Palhano</p>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#6F4E37]">
                      <Star className="h-3 w-3 text-[#FF9800] fill-[#FF9800]" /> 4.8 <span className="text-gray-400 font-normal">(124)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3 flex gap-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                     <img src="/__mockup/images/biz-salon.png" alt="Studio Elegance" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="font-bold text-[#6F4E37] text-sm group-hover:text-[#FF9800] transition-colors">Studio Elegance</h4>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Centro</p>
                    <div className="flex items-center gap-1 text-xs font-bold text-[#6F4E37]">
                      <Star className="h-3 w-3 text-[#FF9800] fill-[#FF9800]" /> 4.9 <span className="text-gray-400 font-normal">(89)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
