import React, { useState } from "react";
import { 
  Search, MapPin, Star, Menu, SlidersHorizontal, ArrowRight, Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
  "Todos", "Restaurantes", "Salões", "Academias", "Mercados", "Cafeterias", "Serviços"
];

export function BuscaVarianteC() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  
  const heroBiz = businesses[0];
  const gridBiz = businesses.slice(1);

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

      {/* Main Content Area */}
      <main className="pt-28 container mx-auto px-4 relative z-10 max-w-6xl">
        
        {/* Minimalist Search */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex items-center w-full max-w-2xl gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#FF9800] transition-colors" />
              </div>
              <Input 
                type="text"
                placeholder="Buscar em Londrina..."
                className="w-full pl-11 pr-4 py-6 rounded-full border-0 shadow-md focus-visible:ring-2 focus-visible:ring-[#FF9800]/50 text-lg bg-white"
              />
            </div>
            <Button size="icon" variant="outline" className="rounded-full h-14 w-14 bg-white border-0 shadow-md text-[#6F4E37] hover:text-[#FF9800] hover:bg-white flex-shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-10 w-full overflow-x-auto pb-4 no-scrollbar">
          <div className="flex items-center gap-3 min-w-max justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  activeCategory === cat 
                    ? "bg-[#6F4E37] text-white shadow-md" 
                    : "bg-white/60 text-[#6F4E37] hover:bg-white hover:shadow-sm"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[#6F4E37]/70 font-medium">
            <span className="text-[#FF9800] font-bold">48 negócios</span> encontrados
          </p>
        </div>

        {/* Hero Card / Highlight */}
        <div className="relative w-full h-[280px] rounded-3xl overflow-hidden mb-8 group cursor-pointer shadow-xl">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img 
              src={heroBiz.image} 
              alt={heroBiz.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          </div>

          {/* Ribbon */}
          <div className="absolute top-6 left-6 z-20">
            <div className="bg-[#FF9800] text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-sm shadow-lg flex items-center gap-2">
              <Star className="h-3 w-3 fill-white" />
              Destaque da semana
            </div>
          </div>

          {/* Content */}
          <div className="absolute inset-0 p-8 flex flex-col justify-end z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="max-w-2xl">
                <Badge className={`mb-3 px-3 py-1 font-bold text-xs uppercase tracking-wider rounded-full ${heroBiz.color} border-0 shadow-sm w-fit`}>
                  {heroBiz.category}
                </Badge>
                <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">
                  {heroBiz.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm font-medium mb-3">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                    {heroBiz.rating} ({heroBiz.reviews})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 opacity-70" />
                    {heroBiz.address}
                  </span>
                  <span>•</span>
                  <span className="text-[#4CAF50] font-bold bg-[#4CAF50]/20 px-2 py-0.5 rounded">{heroBiz.price}</span>
                </div>
                <p className="text-white/80 line-clamp-1 text-sm md:text-base">
                  {heroBiz.desc}
                </p>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/30 border rounded-full h-11 px-6 font-bold transition-colors">
                  Ver Perfil
                </Button>
                <Button className="bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full h-11 px-6 font-bold shadow-lg flex items-center gap-2 transition-all">
                  <Phone className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridBiz.map((biz, index) => (
            <div key={index} className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-[#FF9800]/10 transition-all duration-300 hover:scale-[1.02] flex flex-col cursor-pointer border border-[#6F4E37]/5">
              <div className="relative h-[160px] overflow-hidden">
                <img 
                  src={biz.image} 
                  alt={biz.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute top-3 left-3 z-10">
                  <Badge className={`px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider rounded-full ${biz.color} border-0 shadow-sm`}>
                    {biz.category}
                  </Badge>
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif text-lg font-bold text-[#6F4E37] group-hover:text-[#FF9800] transition-colors leading-tight line-clamp-1">
                    {biz.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm font-black text-[#6F4E37] bg-[#F5F5DC] px-1.5 py-0.5 rounded">
                    <Star className="h-3 w-3 fill-[#FF9800] text-[#FF9800]" />
                    {biz.rating}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span className="line-clamp-1">{biz.address}</span>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                  <span className={`text-xs font-bold ${biz.status === 'Aberto agora' ? 'text-green-600' : 'text-red-500'}`}>
                    {biz.status}
                  </span>
                  <Button variant="ghost" className="h-8 px-3 rounded-full text-[#FF9800] hover:bg-[#FF9800]/10 font-bold text-xs flex items-center gap-1">
                    Ver <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 flex justify-center pb-8">
          <Button variant="outline" className="rounded-full border-2 border-[#6F4E37]/20 text-[#6F4E37] hover:border-[#FF9800] hover:text-[#FF9800] hover:bg-transparent font-bold px-8 h-12 transition-all">
            Carregar mais 42 negócios
          </Button>
        </div>

      </main>
    </div>
  );
}
