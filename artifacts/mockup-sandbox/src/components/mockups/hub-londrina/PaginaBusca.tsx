import React, { useState } from "react";
import { 
  Search, MapPin, Star, ChevronRight, Menu, Coffee, 
  Scissors, Dumbbell, ShoppingCart, Wrench, Utensils, 
  Heart, Facebook, Instagram, Phone, Mail, GraduationCap, 
  Pill, Dog, ArrowRight, Quote, CheckCircle2, SlidersHorizontal,
  ChevronDown, Filter, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
    desc: "Comida caseira com um toque sofisticado. Ingredientes frescos da região.",
    price: "$$",
    status: "Aberto agora",
    color: "bg-red-100 text-red-700"
  },
  {
    name: "Studio Elegance",
    category: "Salão de Beleza",
    rating: 4.9,
    reviews: 89,
    image: "/__mockup/images/biz-salon.png",
    address: "Centro, Londrina",
    desc: "Especialistas em loiros e tratamentos capilares de alta performance.",
    price: "$$$",
    status: "Aberto agora",
    color: "bg-pink-100 text-pink-700"
  },
  {
    name: "Mercadinho São José",
    category: "Mercado",
    rating: 4.7,
    reviews: 56,
    image: "/__mockup/images/biz-grocery.png",
    address: "Zona Norte, Londrina",
    desc: "Frutas e verduras frescas todos os dias. O melhor preço do bairro.",
    price: "$",
    status: "Aberto agora",
    color: "bg-green-100 text-green-700"
  },
  {
    name: "Café do Ponto",
    category: "Cafeteria",
    rating: 5.0,
    reviews: 210,
    image: "/__mockup/images/biz-coffee.png",
    address: "Jardim Quebec, Londrina",
    desc: "Cafés especiais, grãos selecionados e os melhores doces da cidade.",
    price: "$$",
    status: "Fechado",
    color: "bg-amber-100 text-amber-700"
  },
  {
    name: "Cantina da Nona",
    category: "Restaurante",
    rating: 4.6,
    reviews: 182,
    image: "/__mockup/images/biz-restaurant.png",
    address: "Gleba Palhano, Londrina",
    desc: "Massas artesanais e o autêntico sabor da Itália no coração da cidade.",
    price: "$$",
    status: "Aberto agora",
    color: "bg-red-100 text-red-700"
  },
  {
    name: "Grão & Cia",
    category: "Cafeteria",
    rating: 4.8,
    reviews: 95,
    image: "/__mockup/images/biz-coffee.png",
    address: "Gleba Palhano, Londrina",
    desc: "O lugar perfeito para sua reunião de negócios ou encontro com amigos.",
    price: "$$",
    status: "Aberto agora",
    color: "bg-amber-100 text-amber-700"
  }
];

const categories = [
  { id: "restaurantes", label: "Restaurantes", count: 156, icon: Utensils, color: "text-red-500" },
  { id: "saloes", label: "Salões de Beleza", count: 84, icon: Scissors, color: "text-pink-500" },
  { id: "academias", label: "Academias", count: 42, icon: Dumbbell, color: "text-blue-500" },
  { id: "mercados", label: "Mercados", count: 67, icon: ShoppingCart, color: "text-green-500" },
  { id: "servicos", label: "Serviços", count: 210, icon: Wrench, color: "text-orange-500" },
  { id: "cafeterias", label: "Cafeterias", count: 38, icon: Coffee, color: "text-amber-500" },
];

export function PaginaBusca() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5DC] font-sans text-[#6F4E37] selection:bg-[#FF9800] selection:text-white pb-20">
      {/* Pattern overlay for subtle texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#6F4E37 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#F5F5DC]/95 backdrop-blur-md border-b border-[#6F4E37]/10 transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
            {/* Logo Custom SVG */}
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
            <a href="#categorias" className="text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Categorias</a>
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

      {/* Refined Search Bar Section */}
      <section className="pt-28 pb-8 relative z-10">
        <div className="absolute inset-0 z-0 h-[280px]">
          <img 
            src="/images/hub-search-bg.png" 
            alt="Background" 
            className="w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F5F5DC]"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Search Input Group */}
            <div className="bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 border border-[#6F4E37]/10">
              <div className="flex-1 relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-gray-400" />
                <Input 
                  defaultValue="Restaurantes"
                  className="w-full pl-12 pr-4 h-14 bg-transparent border-0 focus-visible:ring-0 rounded-xl text-lg text-[#6F4E37] font-medium shadow-none"
                />
              </div>
              
              <div className="hidden md:block w-px h-8 bg-gray-200 self-center"></div>
              
              <div className="w-full md:w-64">
                <Select defaultValue="gleba">
                  <SelectTrigger className="w-full h-14 px-4 bg-transparent border-0 focus:ring-0 rounded-xl text-base text-[#6F4E37] font-medium shadow-none">
                    <MapPin className="h-4 w-4 mr-2 text-[#FF9800]" />
                    <SelectValue placeholder="Região" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="todas">Todas as regiões</SelectItem>
                    <SelectItem value="centro">Centro</SelectItem>
                    <SelectItem value="gleba">Gleba Palhano</SelectItem>
                    <SelectItem value="norte">Zona Norte</SelectItem>
                    <SelectItem value="sul">Zona Sul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button className="w-full md:w-auto h-14 bg-[#FF9800] hover:bg-[#e68a00] text-white px-8 rounded-xl text-base font-bold shadow-md transition-all">
                Buscar
              </Button>
            </div>
            
            {/* Quick Filters Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-6 justify-center md:justify-start">
              <span className="text-sm font-semibold text-[#6F4E37]/70 mr-2">Filtros rápidos:</span>
              <button className="px-4 py-1.5 rounded-full bg-white border border-[#6F4E37]/10 text-sm font-medium text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] transition-colors shadow-sm">
                Aberto agora
              </button>
              <button className="px-4 py-1.5 rounded-full bg-white border border-[#FF9800] text-sm font-medium text-[#FF9800] bg-orange-50 transition-colors shadow-sm">
                Melhor avaliado
              </button>
              <button className="px-4 py-1.5 rounded-full bg-white border border-[#6F4E37]/10 text-sm font-medium text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] transition-colors shadow-sm">
                Com estacionamento
              </button>
              <button className="px-4 py-1.5 rounded-full bg-white border border-[#6F4E37]/10 text-sm font-medium text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] transition-colors shadow-sm">
                Próximo a mim
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Sidebar + Grid */}
      <section className="container mx-auto px-4 mt-8 relative z-10">
        
        {/* Results Header (Mobile Filter Toggle) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#6F4E37]">
            <span className="text-[#FF9800]">48 negócios</span> encontrados em Gleba Palhano
          </h1>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="md:hidden flex-1 rounded-xl border-[#6F4E37]/20 text-[#6F4E37]"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            
            <div className="flex-1 md:flex-none flex items-center bg-white rounded-xl border border-[#6F4E37]/10 shadow-sm px-3 h-10">
              <span className="text-sm text-gray-500 mr-2 whitespace-nowrap">Ordenar:</span>
              <Select defaultValue="relevance">
                <SelectTrigger className="border-0 shadow-none h-8 px-0 focus:ring-0 text-sm font-bold text-[#6F4E37] w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-0 shadow-xl">
                  <SelectItem value="relevance">Relevância</SelectItem>
                  <SelectItem value="rating">Maior Nota</SelectItem>
                  <SelectItem value="reviews">Mais Avaliados</SelectItem>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
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
                <div className="space-y-3">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between group">
                      <div className="flex items-center space-x-3">
                        <Checkbox id={cat.id} className="border-gray-300 data-[state=checked]:bg-[#FF9800] data-[state=checked]:border-[#FF9800]" defaultChecked={cat.id === 'restaurantes'} />
                        <Label 
                          htmlFor={cat.id} 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2 text-gray-600 group-hover:text-[#6F4E37]"
                        >
                          <cat.icon className={`h-4 w-4 ${cat.color}`} />
                          {cat.label}
                        </Label>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h3 className="font-bold text-[#6F4E37] mb-4 flex items-center justify-between">
                  Avaliação Mínima
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </h3>
                <div className="space-y-3">
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <div key={rating} className="flex items-center space-x-3 group">
                      <Checkbox id={`rating-${rating}`} className="border-gray-300 data-[state=checked]:bg-[#FF9800] data-[state=checked]:border-[#FF9800]" />
                      <Label htmlFor={`rating-${rating}`} className="cursor-pointer flex items-center gap-1">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${star <= Math.floor(rating) ? 'fill-[#FF9800] text-[#FF9800]' : 'fill-gray-200 text-gray-200'} ${star === Math.ceil(rating) && rating % 1 !== 0 ? 'fill-[#FF9800] text-[#FF9800] opacity-50' : ''}`} 
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-600 ml-1">{rating}+</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h3 className="font-bold text-[#6F4E37] mb-4 flex items-center justify-between">
                  Faixa de Preço
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </h3>
                <div className="flex items-center gap-2">
                  <button className="flex-1 py-2 rounded-xl border border-[#FF9800] bg-orange-50 text-[#FF9800] font-bold text-sm transition-colors">
                    $
                  </button>
                  <button className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm hover:border-[#6F4E37] hover:text-[#6F4E37] transition-colors">
                    $$
                  </button>
                  <button className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm hover:border-[#6F4E37] hover:text-[#6F4E37] transition-colors">
                    $$$
                  </button>
                  <button className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm hover:border-[#6F4E37] hover:text-[#6F4E37] transition-colors">
                    $$$$
                  </button>
                </div>
              </div>

            </div>

            {mobileFiltersOpen && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setMobileFiltersOpen(false)}>
                  Limpar
                </Button>
                <Button className="flex-1 bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-xl" onClick={() => setMobileFiltersOpen(false)}>
                  Aplicar Filtros
                </Button>
              </div>
            )}
          </aside>

          {/* Results Grid */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {businesses.map((biz, index) => (
                <div key={index} className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                  {/* Card Image area */}
                  <div className="relative h-[200px] overflow-hidden">
                    <div className="absolute top-4 left-4 z-20">
                      <Badge className={`px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-full ${biz.color} border-0`}>
                        {biz.category}
                      </Badge>
                    </div>
                    <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 text-sm font-black text-[#6F4E37] shadow-sm">
                      <Star className="h-3.5 w-3.5 fill-[#FF9800] text-[#FF9800]" />
                      {biz.rating}
                    </div>
                    <img 
                      src={biz.image} 
                      alt={biz.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />
                    
                    {/* Status indicator on image */}
                    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${biz.status === 'Aberto agora' ? 'bg-green-400' : 'bg-red-400'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></span>
                      <span className="text-white text-xs font-bold drop-shadow-md">{biz.status}</span>
                    </div>
                  </div>
                  
                  {/* Card Content area */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-serif text-xl font-bold text-[#6F4E37] group-hover:text-[#FF9800] transition-colors leading-tight">
                        {biz.name}
                      </h3>
                      <span className="text-[#4CAF50] font-bold text-sm bg-[#4CAF50]/10 px-2 py-0.5 rounded-md">{biz.price}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{biz.address}</span>
                      <span className="mx-1">•</span>
                      <span>{biz.reviews} avaliações</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-5 flex-grow line-clamp-2 leading-relaxed">
                      {biz.desc}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                      <Button variant="outline" className="flex-1 rounded-2xl border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#F5F5DC] hover:text-[#FF9800] font-bold h-11">
                        Ver Perfil
                      </Button>
                      <Button className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-2xl font-bold h-11 shadow-md group-hover:shadow-lg transition-all">
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
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
                    <PaginationLink href="#" className="rounded-xl text-[#6F4E37] bg-white border border-gray-100 hover:border-[#FF9800] hover:text-[#FF9800]">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" className="rounded-xl text-[#6F4E37] bg-white border border-gray-100 hover:border-[#FF9800] hover:text-[#FF9800]">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis className="text-[#6F4E37]" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" className="rounded-xl text-[#6F4E37] bg-white border border-gray-100 hover:border-[#FF9800] hover:text-[#FF9800]">8</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" className="rounded-xl text-[#6F4E37] hover:bg-white hover:text-[#FF9800]" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
