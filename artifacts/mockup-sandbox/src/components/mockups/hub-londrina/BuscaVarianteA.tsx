import React, { useState } from "react";
import { 
  Search, MapPin, Star, Menu, Plus, Minus,
  Filter, ChevronDown, CheckCircle2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ScrollArea } from "@/components/ui/scroll-area";

const businesses = [
  {
    id: 1,
    name: "Sabor da Terra",
    category: "Restaurante",
    rating: 4.8,
    reviews: 124,
    image: "/__mockup/images/biz-restaurant.png",
    address: "Gleba Palhano, Londrina",
    desc: "Comida caseira com toque sofisticado",
    price: "$$",
    status: "Aberto agora",
    color: "bg-red-100 text-red-700",
    mapPosition: { x: 30, y: 40 }
  },
  {
    id: 2,
    name: "Studio Elegance",
    category: "Salão de Beleza",
    rating: 4.9,
    reviews: 89,
    image: "/__mockup/images/biz-salon.png",
    address: "Centro, Londrina",
    desc: "Especialistas em loiros",
    price: "$$$",
    status: "Aberto agora",
    color: "bg-pink-100 text-pink-700",
    mapPosition: { x: 60, y: 25 }
  },
  {
    id: 3,
    name: "Mercadinho São José",
    category: "Mercado",
    rating: 4.7,
    reviews: 56,
    image: "/__mockup/images/biz-grocery.png",
    address: "Zona Norte, Londrina",
    desc: "Frutas frescas todos os dias",
    price: "$",
    status: "Aberto agora",
    color: "bg-green-100 text-green-700",
    mapPosition: { x: 70, y: 65 }
  },
  {
    id: 4,
    name: "Café do Ponto",
    category: "Cafeteria",
    rating: 5.0,
    reviews: 210,
    image: "/__mockup/images/biz-coffee.png",
    address: "Jardim Quebec, Londrina",
    desc: "Cafés especiais e os melhores doces",
    price: "$$",
    status: "Fechado",
    color: "bg-amber-100 text-amber-700",
    mapPosition: { x: 25, y: 70 }
  },
  {
    id: 5,
    name: "Cantina da Nona",
    category: "Restaurante",
    rating: 4.6,
    reviews: 182,
    image: "/__mockup/images/biz-restaurant.png",
    address: "Gleba Palhano, Londrina",
    desc: "Massas artesanais estilo italiano",
    price: "$$",
    status: "Aberto agora",
    color: "bg-red-100 text-red-700",
    mapPosition: { x: 40, y: 50 }
  },
  {
    id: 6,
    name: "Grão & Cia",
    category: "Cafeteria",
    rating: 4.8,
    reviews: 95,
    image: "/__mockup/images/biz-coffee.png",
    address: "Gleba Palhano, Londrina",
    desc: "Lugar perfeito para reuniões",
    price: "$$",
    status: "Aberto agora",
    color: "bg-amber-100 text-amber-700",
    mapPosition: { x: 45, y: 35 }
  }
];

export function BuscaVarianteA() {
  const [activeBiz, setActiveBiz] = useState<number | null>(1);

  return (
    <div className="h-[100dvh] flex flex-col bg-[#F5F5DC] font-sans text-[#6F4E37] overflow-hidden selection:bg-[#FF9800] selection:text-white">
      
      {/* Header Fixo */}
      <header className="flex-shrink-0 bg-[#F5F5DC]/95 backdrop-blur-md border-b border-[#6F4E37]/10 h-20 z-50 relative">
        <div className="px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative flex items-center justify-center w-10 h-10">
              <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-md">
                <path d="M50 10 C30 10, 20 30, 20 50 C20 70, 50 90, 50 90 C50 90, 80 70, 80 50 C80 30, 70 10, 50 10 Z" fill="#FF9800" />
                <path d="M50 25 C40 25, 35 35, 35 45 C35 55, 50 65, 50 65 C50 65, 65 55, 65 45 C65 35, 60 25, 50 25 Z" fill="#6F4E37" />
                <path d="M45 35 Q50 45, 45 55" stroke="#F5F5DC" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-xl md:text-2xl tracking-tight leading-none text-[#6F4E37]">HUB LONDRINA</span>
              <span className="text-[9px] md:text-[10px] tracking-[0.2em] font-bold text-[#4CAF50] mt-0.5">NEGÓCIO LOCAL</span>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8 font-medium">
            <a href="#" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Início</a>
            <a href="#categorias" className="text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Categorias</a>
            <a href="#destaques" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Destaques</a>
            <a href="#planos" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Para Empresas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Button className="hidden md:flex bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full px-6 font-bold shadow-md transition-all">
              Anuncie Aqui
            </Button>
            <Button variant="ghost" size="icon" className="lg:hidden text-[#6F4E37]">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Busca Compacta */}
      <div className="flex-shrink-0 bg-white border-b border-[#6F4E37]/10 z-40 relative">
        <div className="flex flex-col sm:flex-row h-auto sm:h-16">
          <div className="flex-1 flex items-center px-4 border-b sm:border-b-0 sm:border-r border-[#6F4E37]/10">
            <Search className="h-5 w-5 text-gray-400 flex-shrink-0 mr-3" />
            <Input 
              defaultValue="Restaurantes"
              className="w-full h-12 bg-transparent border-0 focus-visible:ring-0 px-0 text-base text-[#6F4E37] font-medium shadow-none placeholder:text-gray-400"
              placeholder="O que você procura?"
            />
          </div>
          <div className="flex-1 sm:max-w-[280px] flex items-center px-4 border-b sm:border-b-0 sm:border-r border-[#6F4E37]/10">
            <MapPin className="h-5 w-5 text-[#FF9800] flex-shrink-0 mr-3" />
            <Select defaultValue="gleba">
              <SelectTrigger className="w-full h-12 border-0 bg-transparent px-0 focus:ring-0 text-base text-[#6F4E37] font-medium shadow-none">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as regiões</SelectItem>
                <SelectItem value="centro">Centro</SelectItem>
                <SelectItem value="gleba">Gleba Palhano</SelectItem>
                <SelectItem value="norte">Zona Norte</SelectItem>
                <SelectItem value="sul">Zona Sul</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="p-2 sm:p-0 flex items-center justify-center sm:w-32 bg-[#F5F5DC] sm:bg-transparent">
            <Button className="w-full sm:w-full h-12 sm:h-full sm:rounded-none bg-[#FF9800] hover:bg-[#e68a00] text-white font-bold text-base transition-colors">
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Painel Esquerdo (Lista) */}
        <div className="w-full md:w-[50%] lg:w-[45%] h-[40vh] md:h-full flex flex-col bg-white z-10 shadow-[4px_0_24px_rgba(0,0,0,0.05)] border-r border-[#6F4E37]/10">
          
          {/* List Header & Filters */}
          <div className="p-4 md:p-6 border-b border-[#6F4E37]/5 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-serif text-lg md:text-xl font-bold text-[#6F4E37]">
                <span className="text-[#FF9800]">48 negócios</span> em Gleba Palhano
              </h1>
              <Select defaultValue="relevance">
                <SelectTrigger className="w-auto border-0 shadow-none h-8 px-2 focus:ring-0 text-sm font-bold text-[#6F4E37]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="relevance">Relevância</SelectItem>
                  <SelectItem value="rating">Maior Nota</SelectItem>
                  <SelectItem value="reviews">Mais Avaliados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              <button className="flex-shrink-0 px-4 py-1.5 rounded-full bg-white border border-[#6F4E37]/10 text-sm font-medium text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] transition-colors shadow-sm">
                Aberto agora
              </button>
              <button className="flex-shrink-0 px-4 py-1.5 rounded-full bg-white border border-[#FF9800] text-sm font-medium text-[#FF9800] bg-orange-50 transition-colors shadow-sm">
                Melhor avaliado
              </button>
              <button className="flex-shrink-0 px-4 py-1.5 rounded-full bg-white border border-[#6F4E37]/10 text-sm font-medium text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] transition-colors shadow-sm">
                $$
              </button>
              <button className="flex-shrink-0 px-4 py-1.5 rounded-full bg-white border border-[#6F4E37]/10 text-sm font-medium text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] transition-colors shadow-sm">
                Próximo
              </button>
            </div>
          </div>
          
          {/* List Content */}
          <ScrollArea className="flex-1 w-full">
            <div className="p-4 md:p-6 flex flex-col gap-3">
              {businesses.map((biz) => {
                const isActive = activeBiz === biz.id;
                
                return (
                  <div 
                    key={biz.id}
                    className={`
                      flex group cursor-pointer rounded-xl overflow-hidden transition-all duration-200
                      ${isActive 
                        ? 'border-l-4 border-l-[#FF9800] bg-orange-50/50 shadow-md scale-[1.01]' 
                        : 'border border-gray-100 bg-white hover:border-[#FF9800]/30 hover:shadow-md'
                      }
                    `}
                    onClick={() => setActiveBiz(biz.id)}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-28 md:w-[120px] flex-shrink-0 p-2">
                      <div className="w-full aspect-square rounded-lg overflow-hidden relative">
                        <img 
                          src={biz.image} 
                          alt={biz.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/10"></div>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="py-3 pr-4 pl-2 flex flex-col flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <Badge className={`px-1.5 py-0 text-[10px] uppercase font-bold rounded-md ${biz.color} border-0`}>
                          {biz.category}
                        </Badge>
                        <span className="text-[#4CAF50] font-bold text-xs bg-[#4CAF50]/10 px-1.5 rounded">{biz.price}</span>
                      </div>
                      
                      <h3 className="font-serif text-base font-bold text-[#6F4E37] leading-tight truncate group-hover:text-[#FF9800] transition-colors">
                        {biz.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 mt-1 mb-1.5">
                        <div className="flex items-center gap-0.5 bg-[#FF9800]/10 px-1.5 py-0.5 rounded text-xs font-bold text-[#FF9800]">
                          <Star className="h-3 w-3 fill-current" />
                          {biz.rating}
                        </div>
                        <span className="text-[11px] text-gray-500 truncate">
                          ({biz.reviews}) • {biz.address.split(',')[0]}
                        </span>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-xs text-gray-600 line-clamp-1 pr-2">
                          {biz.desc}
                        </span>
                        <Button size="sm" variant={isActive ? "default" : "outline"} className={`h-7 px-3 text-xs rounded-lg flex-shrink-0 ${isActive ? 'bg-[#FF9800] hover:bg-[#e68a00] text-white' : 'text-[#6F4E37] border-[#6F4E37]/20 hover:bg-[#FF9800] hover:text-white hover:border-[#FF9800]'}`}>
                          Ver
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Pagination Compacta */}
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <Pagination className="mx-0">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious href="#" className="h-8 w-8 p-0 rounded-lg text-[#6F4E37]" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive className="h-8 w-8 rounded-lg bg-[#FF9800] text-white border-0">1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" className="h-8 w-8 rounded-lg text-[#6F4E37] border-0">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" className="h-8 w-8 rounded-lg text-[#6F4E37] border-0">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" className="h-8 w-8 p-0 rounded-lg text-[#6F4E37]" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </ScrollArea>
        </div>

        {/* Painel Direito (Mapa) */}
        <div className="w-full md:w-[50%] lg:w-[55%] h-[60vh] md:h-full relative overflow-hidden bg-[#F5F5DC]">
          
          {/* Background do Mapa */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E8D5B7] to-[#F5F5DC]"></div>
          
          {/* Padrão de grid sutil */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#6F4E37 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
          
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <span className="font-serif text-3xl md:text-5xl font-black text-[#6F4E37] tracking-widest uppercase rotate-[-15deg]">
              Mapa Interativo
            </span>
          </div>

          {/* Badge Localização */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
            <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-[#6F4E37]/10 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#FF9800]" />
              <span className="font-bold text-sm text-[#6F4E37]">Gleba Palhano, Londrina - PR</span>
            </div>
          </div>

          {/* Controles de Zoom */}
          <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
            <button className="bg-white hover:bg-gray-50 h-10 w-10 rounded-xl shadow-md border border-[#6F4E37]/10 flex items-center justify-center text-[#6F4E37] transition-colors">
              <Plus className="h-5 w-5" />
            </button>
            <button className="bg-white hover:bg-gray-50 h-10 w-10 rounded-xl shadow-md border border-[#6F4E37]/10 flex items-center justify-center text-[#6F4E37] transition-colors">
              <Minus className="h-5 w-5" />
            </button>
          </div>

          {/* Pins do Mapa */}
          {businesses.map((biz) => {
            const isActive = activeBiz === biz.id;
            
            return (
              <div 
                key={biz.id}
                className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer group z-10 transition-all duration-300"
                style={{ 
                  left: `${biz.mapPosition.x}%`, 
                  top: `${biz.mapPosition.y}%`,
                  zIndex: isActive ? 50 : 10
                }}
                onClick={() => setActiveBiz(biz.id)}
              >
                {/* Pin Icon Container */}
                <div className={`
                  relative flex flex-col items-center transition-transform duration-300
                  ${isActive ? 'scale-125' : 'scale-100 group-hover:scale-110'}
                `}>
                  {/* Pin Background Glow for active state */}
                  {isActive && (
                    <div className="absolute inset-0 bg-[#FF9800] blur-xl rounded-full opacity-40 animate-pulse"></div>
                  )}
                  
                  {/* Pin SVG */}
                  <div className={`
                    relative w-10 h-12 flex items-start justify-center drop-shadow-md
                    ${isActive ? 'text-[#FF9800]' : 'text-[#6F4E37]'}
                  `}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 4.5 12 4.5 15.5 6.07 15.5 8 13.93 11.5 12 11.5z" />
                    </svg>
                    
                    {/* Inner dot */}
                    <div className="absolute top-[8px] w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  
                  {/* Label (Always show for active, show on hover for others) */}
                  <div className={`
                    absolute top-full mt-1 px-2.5 py-1 bg-white rounded-lg shadow-lg border border-[#6F4E37]/10
                    whitespace-nowrap transition-all duration-200 pointer-events-none origin-top
                    ${isActive ? 'opacity-100 scale-100 z-20' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 z-10'}
                  `}>
                    <p className="font-bold text-xs text-[#6F4E37] leading-none">{biz.name}</p>
                    {isActive && (
                      <p className="text-[10px] text-gray-500 mt-0.5">{biz.category} • <span className="text-[#FF9800] font-bold">★ {biz.rating}</span></p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}
