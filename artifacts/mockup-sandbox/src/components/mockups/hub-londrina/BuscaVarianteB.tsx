import React, { useState } from "react";
import { 
  Search, MapPin, Star, Menu, 
  ChevronDown, Wifi, Car, CreditCard, 
  MessageCircle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const businesses = [
  {
    name: "Sabor da Terra",
    category: "Restaurante",
    rating: 4.8,
    reviews: 124,
    image: "/__mockup/images/biz-restaurant.png",
    address: "Gleba Palhano, Londrina",
    desc: "Comida caseira com um toque sofisticado. Ingredientes frescos da região selecionados diariamente para a melhor experiência gastronômica.",
    price: "$$",
    status: "Aberto agora",
    color: "bg-red-100 text-red-700 border-red-500",
    badgeColor: "bg-red-500",
    tags: ["Estacionamento", "Aceita cartão", "Ar condicionado"]
  },
  {
    name: "Studio Elegance",
    category: "Salão de Beleza",
    rating: 4.9,
    reviews: 89,
    image: "/__mockup/images/biz-salon.png",
    address: "Centro, Londrina",
    desc: "Especialistas em loiros e tratamentos capilares de alta performance. Ambiente climatizado e profissionais com certificação internacional.",
    price: "$$$",
    status: "Aberto agora",
    color: "bg-pink-100 text-pink-700 border-pink-500",
    badgeColor: "bg-pink-500",
    tags: ["Wi-Fi", "Aceita cartão", "Agendamento online"]
  },
  {
    name: "Mercadinho São José",
    category: "Mercado",
    rating: 4.7,
    reviews: 56,
    image: "/__mockup/images/biz-grocery.png",
    address: "Zona Norte, Londrina",
    desc: "Frutas e verduras frescas todos os dias. O melhor preço do bairro com atendimento acolhedor que você só encontra aqui.",
    price: "$",
    status: "Aberto agora",
    color: "bg-green-100 text-green-700 border-green-500",
    badgeColor: "bg-green-500",
    tags: ["Estacionamento", "Entrega", "Padaria própria"]
  },
  {
    name: "Café do Ponto",
    category: "Cafeteria",
    rating: 5.0,
    reviews: 210,
    image: "/__mockup/images/biz-coffee.png",
    address: "Jardim Quebec, Londrina",
    desc: "Cafés especiais, grãos selecionados e os melhores doces da cidade. Ambiente perfeito para trabalhar ou encontrar amigos.",
    price: "$$",
    status: "Fechado",
    color: "bg-amber-100 text-amber-700 border-amber-500",
    badgeColor: "bg-amber-500",
    tags: ["Wi-Fi", "Pet friendly", "Opções veganas"]
  },
  {
    name: "Cantina da Nona",
    category: "Restaurante",
    rating: 4.6,
    reviews: 182,
    image: "/__mockup/images/biz-restaurant.png",
    address: "Gleba Palhano, Londrina",
    desc: "Massas artesanais e o autêntico sabor da Itália no coração da cidade. Carta de vinhos com mais de 50 rótulos selecionados.",
    price: "$$",
    status: "Aberto agora",
    color: "bg-red-100 text-red-700 border-red-500",
    badgeColor: "bg-red-500",
    tags: ["Adega", "Estacionamento", "Música ao vivo"]
  },
  {
    name: "Grão & Cia",
    category: "Cafeteria",
    rating: 4.8,
    reviews: 95,
    image: "/__mockup/images/biz-coffee.png",
    address: "Gleba Palhano, Londrina",
    desc: "O lugar perfeito para sua reunião de negócios ou encontro com amigos. Experimente nossos blends exclusivos torrados na casa.",
    price: "$$",
    status: "Aberto agora",
    color: "bg-amber-100 text-amber-700 border-amber-500",
    badgeColor: "bg-amber-500",
    tags: ["Wi-Fi", "Acessibilidade", "Mesas ao ar livre"]
  }
];

export function BuscaVarianteB() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5DC] font-sans text-[#6F4E37] selection:bg-[#FF9800] selection:text-white pb-20">
      {/* Header Fixo */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#F5F5DC]/95 backdrop-blur-md border-b border-[#6F4E37]/10 h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
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
            <a href="#categorias" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Categorias</a>
            <a href="#destaques" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Destaques</a>
            <a href="#planos" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Para Empresas</a>
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

      {/* Hero Busca Compacto */}
      <section className="pt-20 bg-[#6F4E37] relative z-20">
        <div className="h-[130px] flex items-center justify-center relative overflow-hidden">
          {/* Subtle texture/pattern on dark background */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#F5F5DC 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-2">
              <div className="flex-1 bg-white rounded-xl shadow-lg flex items-center h-14 overflow-hidden border border-white/20 focus-within:ring-2 focus-within:ring-[#FF9800]/50 transition-all">
                <div className="pl-4 text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
                <Input 
                  defaultValue="Restaurantes"
                  className="border-0 focus-visible:ring-0 shadow-none h-full text-lg text-[#6F4E37] font-medium"
                />
                
                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                
                <div className="hidden md:flex items-center w-64 h-full border-l border-gray-200">
                  <div className="pl-4 text-[#FF9800]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <Input 
                    defaultValue="Gleba Palhano"
                    className="border-0 focus-visible:ring-0 shadow-none h-full text-base text-[#6F4E37]"
                  />
                </div>
              </div>
              
              <Button className="h-14 bg-[#FF9800] hover:bg-[#e68a00] text-white px-8 rounded-xl text-lg font-bold shadow-lg md:w-auto w-full flex-shrink-0">
                Buscar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Barra de Filtros Sticky */}
      <div className="sticky top-20 z-40 bg-white border-b border-[#6F4E37]/10 shadow-sm py-3">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
            {[
              { id: 'cat', label: 'Categoria' },
              { id: 'aval', label: 'Avaliação' },
              { id: 'preco', label: 'Preço' },
              { id: 'regiao', label: 'Região' },
            ].map(filter => (
              <button 
                key={filter.id}
                onClick={() => setActiveFilter(activeFilter === filter.id ? null : filter.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                  activeFilter === filter.id 
                    ? 'border-[#FF9800] bg-orange-50 text-[#FF9800]' 
                    : 'border-[#6F4E37]/20 text-[#6F4E37] hover:border-[#6F4E37]/40 bg-white'
                }`}
              >
                {filter.label}
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
            ))}
            
            <button 
              onClick={() => setOpenNow(!openNow)}
              className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                openNow
                  ? 'border-[#4CAF50] bg-green-50 text-[#4CAF50]'
                  : 'border-[#6F4E37]/20 text-[#6F4E37] hover:border-[#6F4E37]/40 bg-white'
              }`}
            >
              Aberto agora
            </button>

            <div className="ml-auto hidden md:flex">
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-full border-0 text-sm font-bold text-[#6F4E37] hover:bg-gray-50 transition-colors">
                Ordenar: Relevância
                <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Área de Resultados - Full Width */}
      <section className="container mx-auto px-4 mt-8 max-w-5xl">
        <div className="mb-6 flex justify-between items-end">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#6F4E37]">
            <span className="text-[#FF9800]">48 resultados</span> para Restaurantes em Gleba Palhano
          </h1>
          <div className="md:hidden">
             <button className="flex items-center gap-1 text-sm font-bold text-[#6F4E37]">
                Ordenar <ChevronDown className="h-4 w-4" />
              </button>
          </div>
        </div>

        <div className="space-y-6">
          {businesses.map((biz, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-2xl shadow-md hover:shadow-xl hover:translate-x-1 transition-all duration-300 flex flex-col md:flex-row border-l-4 ${biz.color.split(' ').find(c => c.startsWith('border-'))} overflow-hidden`}
            >
              {/* Foto do Card */}
              <div className="md:w-[260px] h-[200px] md:h-auto relative flex-shrink-0">
                <img 
                  src={biz.image} 
                  alt={biz.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />
              </div>
              
              {/* Conteúdo do Card */}
              <div className="p-5 md:p-6 flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${biz.badgeColor} text-white border-0 hover:${biz.badgeColor}`}>
                        {biz.category}
                      </Badge>
                      {biz.price && (
                        <span className="text-gray-500 font-bold text-xs bg-gray-100 px-2 py-0.5 rounded">{biz.price}</span>
                      )}
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-[#6F4E37] leading-tight">
                      {biz.name}
                    </h2>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 self-start">
                    <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                    <span className="font-black text-[#6F4E37] text-lg leading-none">{biz.rating}</span>
                    <span className="text-xs text-gray-500 font-medium ml-1">({biz.reviews})</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3 font-medium">
                  <MapPin className="h-4 w-4 text-[#FF9800]" />
                  <span>{biz.address}</span>
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mb-4">
                  {biz.desc}
                </p>
                
                {/* Tags de Atributos */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {biz.tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-bold tracking-wide">
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${biz.status === 'Aberto agora' ? 'bg-green-500 shadow-[0_0_8px_rgba(76,175,80,0.5)]' : 'bg-red-500'}`}></div>
                    <span className={`text-sm font-bold ${biz.status === 'Aberto agora' ? 'text-green-700' : 'text-red-700'}`}>
                      {biz.status}
                    </span>
                    {biz.status === 'Aberto agora' && (
                      <span className="text-xs text-gray-400 font-medium ml-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1 inline" /> até 23:00
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none rounded-xl border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] hover:text-[#FF9800] font-bold h-10 px-6">
                      Ver Perfil
                    </Button>
                    <Button className="flex-1 sm:flex-none bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl font-bold h-10 px-6 shadow-md">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Paginação */}
        <div className="mt-12">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" className="rounded-xl text-[#6F4E37] hover:bg-white hover:text-[#FF9800]" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive className="rounded-xl bg-[#FF9800] text-white border-0 hover:bg-[#e68a00] hover:text-white">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" className="rounded-xl text-[#6F4E37] bg-white border border-gray-200 hover:border-[#FF9800] hover:text-[#FF9800]">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" className="rounded-xl text-[#6F4E37] bg-white border border-gray-200 hover:border-[#FF9800] hover:text-[#FF9800]">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis className="text-[#6F4E37]" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" className="rounded-xl text-[#6F4E37] bg-white border border-gray-200 hover:border-[#FF9800] hover:text-[#FF9800]">8</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" className="rounded-xl text-[#6F4E37] hover:bg-white hover:text-[#FF9800]" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </section>
    </div>
  );
}
