import React from "react";
import { 
  Search, MapPin, Star, ChevronRight, Menu, Coffee, 
  Scissors, Dumbbell, ShoppingCart, Wrench, Utensils, 
  Heart, Facebook, Instagram, Phone, Mail, GraduationCap, 
  Pill, Dog, ArrowRight, Quote, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories = [
  { name: "Restaurantes", icon: Utensils, color: "bg-red-100 text-red-600 border-red-200" },
  { name: "Salões de Beleza", icon: Scissors, color: "bg-pink-100 text-pink-600 border-pink-200" },
  { name: "Academias", icon: Dumbbell, color: "bg-blue-100 text-blue-600 border-blue-200" },
  { name: "Mercados", icon: ShoppingCart, color: "bg-green-100 text-green-600 border-green-200" },
  { name: "Serviços", icon: Wrench, color: "bg-orange-100 text-orange-600 border-orange-200" },
  { name: "Cafeterias", icon: Coffee, color: "bg-amber-100 text-amber-600 border-amber-200" },
  { name: "Educação", icon: GraduationCap, color: "bg-indigo-100 text-indigo-600 border-indigo-200" },
  { name: "Farmácias", icon: Pill, color: "bg-teal-100 text-teal-600 border-teal-200" },
  { name: "Pet Shops", icon: Dog, color: "bg-purple-100 text-purple-600 border-purple-200" },
  { name: "Padarias", icon: Utensils, color: "bg-yellow-100 text-yellow-600 border-yellow-200" } // Reusing icon, add better if available
];

const featuredBusinesses = [
  {
    name: "Sabor da Terra",
    category: "Restaurante",
    rating: 4.8,
    reviews: 124,
    image: "/__mockup/images/biz-restaurant.png",
    address: "Gleba Palhano, Londrina",
    desc: "Comida caseira com um toque sofisticado. Ingredientes frescos da região.",
  },
  {
    name: "Studio Elegance",
    category: "Salão de Beleza",
    rating: 4.9,
    reviews: 89,
    image: "/__mockup/images/biz-salon.png",
    address: "Centro, Londrina",
    desc: "Especialistas em loiros e tratamentos capilares de alta performance.",
  },
  {
    name: "Mercadinho São José",
    category: "Mercado",
    rating: 4.7,
    reviews: 56,
    image: "/__mockup/images/biz-grocery.png",
    address: "Zona Norte, Londrina",
    desc: "Frutas e verduras frescas todos os dias. O melhor preço do bairro.",
  },
  {
    name: "Café do Ponto",
    category: "Cafeteria",
    rating: 5.0,
    reviews: 210,
    image: "/__mockup/images/biz-coffee.png",
    address: "Jardim Quebec, Londrina",
    desc: "Cafés especiais, grãos selecionados e os melhores doces da cidade.",
  },
];

const testimonials = [
  {
    name: "Mariana Costa",
    role: "Moradora da Zona Sul",
    content: "O Hub Londrina mudou a forma como eu descubro novos lugares na cidade. Encontrei uma padaria artesanal incrível do lado de casa que eu nem sabia que existia!",
    color: "bg-pink-100 text-pink-700"
  },
  {
    name: "Roberto Silva",
    role: "Dono de Oficina",
    content: "Desde que anunciei minha oficina aqui, o movimento aumentou muito. É ótimo ver a comunidade se apoiando e valorizando o negócio local.",
    color: "bg-blue-100 text-blue-700"
  },
  {
    name: "Juliana Alves",
    role: "Estudante",
    content: "Sempre uso o site para achar onde comer no fim de semana. As avaliações são super reais e me ajudam muito a escolher os melhores lugares.",
    color: "bg-green-100 text-green-700"
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F5DC] font-sans text-[#6F4E37] selection:bg-[#FF9800] selection:text-white">
      {/* Pattern overlay for subtle texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#6F4E37 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#F5F5DC]/90 backdrop-blur-md border-b border-[#6F4E37]/10 transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <a href="#categorias" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Categorias</a>
            <a href="#destaques" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Destaques</a>
            <a href="#planos" className="hover:text-[#FF9800] transition-colors text-sm uppercase tracking-wider font-bold">Para Empresas</a>
          </nav>

          <div className="flex items-center gap-4">
            <Button className="hidden md:flex bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full px-6 py-5 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              Anuncie Seu Negócio
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden text-[#6F4E37]">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/hub-hero-bg.png" 
            alt="Londrina skyline at golden hour" 
            className="w-full h-full object-cover object-center scale-105 animate-in fade-in zoom-in duration-1000"
          />
          {/* Amber/Brown Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#6F4E37]/90 via-[#6F4E37]/70 to-[#FF9800]/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F5F5DC] via-transparent to-transparent opacity-80" />
        </div>

        <div className="container mx-auto px-4 relative z-10 h-full flex flex-col justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-semibold mb-8 animate-in slide-in-from-bottom-4 duration-700 delay-100">
              <Star className="h-4 w-4 text-[#FF9800] fill-[#FF9800]" /> 
              <span>O maior guia de negócios locais da região</span>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[1.1] drop-shadow-2xl animate-in slide-in-from-bottom-8 duration-700 delay-200">
              Valorize quem faz <br/><span className="text-[#FF9800] italic">Londrina</span> acontecer.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 font-light drop-shadow-md max-w-2xl mx-auto animate-in slide-in-from-bottom-8 duration-700 delay-300">
              Descubra os melhores serviços, restaurantes e lojas perto de você.
            </p>

            <div className="bg-white/10 backdrop-blur-xl p-3 rounded-[2rem] shadow-2xl border border-white/30 max-w-4xl mx-auto flex flex-col md:flex-row gap-3 animate-in slide-in-from-bottom-10 duration-700 delay-400">
              <div className="flex-1 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input 
                  placeholder="O que você está procurando?" 
                  className="w-full pl-16 pr-6 py-8 bg-white border-0 focus-visible:ring-2 focus-visible:ring-[#FF9800] rounded-full text-xl text-gray-800 placeholder:text-gray-400 shadow-inner"
                />
              </div>
              <div className="w-full md:w-72">
                <Select>
                  <SelectTrigger className="w-full py-8 px-6 bg-white border-0 focus:ring-2 focus:ring-[#FF9800] rounded-full text-xl text-gray-800 shadow-inner">
                    <SelectValue placeholder="Qualquer Região" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-2xl p-2">
                    <SelectItem value="todas" className="text-lg py-3 rounded-xl cursor-pointer">Todas as regiões</SelectItem>
                    <SelectItem value="centro" className="text-lg py-3 rounded-xl cursor-pointer">Centro</SelectItem>
                    <SelectItem value="gleba" className="text-lg py-3 rounded-xl cursor-pointer">Gleba Palhano</SelectItem>
                    <SelectItem value="norte" className="text-lg py-3 rounded-xl cursor-pointer">Zona Norte</SelectItem>
                    <SelectItem value="sul" className="text-lg py-3 rounded-xl cursor-pointer">Zona Sul</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full md:w-auto bg-[#FF9800] hover:bg-[#e68a00] text-white py-8 px-12 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transition-all">
                Buscar
              </Button>
            </div>
            
            {/* Stats below search */}
            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 text-white/90 font-medium animate-in fade-in duration-1000 delay-500">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white mb-1">+500</span>
                <span className="text-sm uppercase tracking-wider opacity-80">Negócios Cadastrados</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-white/20"></div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white mb-1">+12 mil</span>
                <span className="text-sm uppercase tracking-wider opacity-80">Usuários Ativos</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-white/20"></div>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-bold text-white mb-1">8</span>
                <span className="text-sm uppercase tracking-wider opacity-80">Regiões Atendidas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categorias" className="py-32 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">O que você precisa?</span>
              <h2 className="font-serif text-4xl md:text-5xl font-black text-[#6F4E37]">Explore por Categoria</h2>
            </div>
            <Button variant="outline" className="rounded-full border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white px-8">
              Ver todas <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category, index) => (
              <a 
                href="#" 
                key={index}
                className="group relative overflow-hidden flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-[#6F4E37]/5"
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${category.color}`}>
                  <category.icon className="h-10 w-10" />
                </div>
                <span className="font-bold text-lg text-center text-[#6F4E37] group-hover:text-[#FF9800] transition-colors">{category.name}</span>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FF9800]/20 rounded-3xl transition-colors"></div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section id="destaques" className="py-32 bg-white relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#6F4E37]/10 to-transparent"></div>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">Aprovados pela comunidade</span>
            <h2 className="font-serif text-4xl md:text-5xl font-black mb-6 text-[#6F4E37]">Destaques da Semana</h2>
            <p className="text-xl text-gray-600 font-light">Conheça os negócios mais bem avaliados pelos londrinenses, escolhidos a dedo para você.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredBusinesses.map((biz, index) => (
              <div key={index} className="group flex flex-col bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative h-[260px] overflow-hidden">
                  <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-black text-[#6F4E37] shadow-lg">
                    <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                    {biz.rating}
                  </div>
                  <img 
                    src={biz.image} 
                    alt={biz.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <h3 className="font-serif text-2xl font-bold text-white drop-shadow-md group-hover:text-[#FF9800] transition-colors">{biz.name}</h3>
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-3 py-1 rounded-full uppercase tracking-wider">{biz.category}</span>
                    <span className="text-xs text-gray-400 font-medium">{biz.reviews} avaliações</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-6 flex-grow">{biz.desc}</p>
                  
                  <div className="flex items-start gap-2 text-sm text-gray-500 mb-6 font-medium">
                    <MapPin className="h-5 w-5 text-[#FF9800] flex-shrink-0" />
                    <span>{biz.address}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                    <Button className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-6 font-bold shadow-md">
                      WhatsApp
                    </Button>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-gray-200 text-[#6F4E37] hover:bg-[#F5F5DC]">
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
             <Button variant="link" className="text-lg font-bold text-[#6F4E37] border-b-2 border-[#FF9800] rounded-none px-0 pb-1 hover:text-[#FF9800]">
               Explorar todos os lugares
             </Button>
          </div>
        </div>
      </section>

      {/* How it works Timeline */}
      <section className="py-32 bg-[#F5F5DC] relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">Passo a Passo</span>
            <h2 className="font-serif text-4xl md:text-5xl font-black mb-6 text-[#6F4E37]">Como Funciona</h2>
          </div>

          <div className="relative max-w-5xl mx-auto">
            {/* Connecting dashed line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 border-t-2 border-dashed border-[#6F4E37]/20 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 relative border-4 border-[#F5F5DC] group-hover:border-[#FF9800] transition-colors duration-300">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#FF9800] text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg">1</div>
                  <Search className="h-10 w-10 text-[#FF9800]" />
                </div>
                <h3 className="text-2xl font-black text-[#6F4E37] mb-4">Busque</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Procure pelo que precisa ou explore as categorias. Tem de tudo, bem perto de você.</p>
              </div>
              
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 relative border-4 border-[#F5F5DC] group-hover:border-[#4CAF50] transition-colors duration-300">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#4CAF50] text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg">2</div>
                  <Star className="h-10 w-10 text-[#4CAF50]" />
                </div>
                <h3 className="text-2xl font-black text-[#6F4E37] mb-4">Escolha</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Veja fotos, avaliações e informações detalhadas para escolher a melhor opção.</p>
              </div>
              
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 relative border-4 border-[#F5F5DC] group-hover:border-red-500 transition-colors duration-300">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg">3</div>
                  <Heart className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-[#6F4E37] mb-4">Apoie</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Entre em contato, visite o local ou faça seu pedido. Você fortalece a nossa cidade!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Business Owners Split Screen */}
      <section id="planos" className="flex flex-col lg:flex-row">
        {/* Left Dark Panel */}
        <div className="lg:w-5/12 bg-[#2D1B12] text-white p-12 lg:p-24 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          <div className="relative z-10">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-4 block">Para Empreendedores</span>
            <h2 className="font-serif text-4xl lg:text-6xl font-black mb-8 leading-tight">
              Apareça para quem <span className="italic text-[#F5F5DC]">importa</span>.
            </h2>
            <p className="text-xl text-white/70 mb-12 font-light leading-relaxed">
              Junte-se a centenas de empresas que já estão conectando suas marcas aos moradores da cidade de forma autêntica.
            </p>
            
            {/* Stat Counters */}
            <div className="grid grid-cols-2 gap-8 mb-12">
              <div>
                <div className="text-4xl font-black text-[#FF9800] mb-2">500+</div>
                <div className="text-sm uppercase tracking-wider text-white/60 font-bold">Negócios</div>
              </div>
              <div>
                <div className="text-4xl font-black text-[#4CAF50] mb-2">12k+</div>
                <div className="text-sm uppercase tracking-wider text-white/60 font-bold">Usuários</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white mb-2">98%</div>
                <div className="text-sm uppercase tracking-wider text-white/60 font-bold">Satisfação</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
              <Quote className="h-8 w-8 text-[#FF9800] mb-4 opacity-50" />
              <p className="italic text-lg text-white/90 mb-4">"O investimento se pagou na primeira semana. A visibilidade que ganhamos foi incrível para nossa hamburgueria."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF9800] rounded-full flex items-center justify-center font-bold text-white">C</div>
                <div>
                  <div className="font-bold">Carlos Mendes</div>
                  <div className="text-xs text-white/50">Burger House Londrina</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Bright Panel (Pricing) */}
        <div className="lg:w-7/12 bg-[#F5F5DC] p-12 lg:p-24 flex items-center justify-center relative">
          <div className="w-full max-w-3xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              
              {/* Basic Plan */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100 flex flex-col h-full">
                <h3 className="font-serif text-2xl font-black text-[#6F4E37] mb-2">Plano Básico</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black text-[#6F4E37]">R$33</span>
                  <span className="text-gray-500 font-medium">/mês</span>
                </div>
                
                <ul className="space-y-5 mb-10 flex-grow">
                  <li className="flex items-start gap-3 text-gray-600">
                    <CheckCircle2 className="h-6 w-6 text-[#4CAF50] flex-shrink-0" />
                    <span>Perfil com informações completas</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <CheckCircle2 className="h-6 w-6 text-[#4CAF50] flex-shrink-0" />
                    <span>Até 3 fotos da empresa</span>
                  </li>
                  <li className="flex items-start gap-3 text-gray-600">
                    <CheckCircle2 className="h-6 w-6 text-[#4CAF50] flex-shrink-0" />
                    <span>Aparece nas buscas por categoria</span>
                  </li>
                </ul>
                
                <Button variant="outline" className="w-full py-7 rounded-2xl text-lg font-bold border-2 border-[#6F4E37] text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white transition-colors">
                  Começar Básico
                </Button>
              </div>

              {/* Pro Plan (Highlighted) */}
              <div className="bg-[#6F4E37] rounded-[2.5rem] p-10 shadow-2xl border-4 border-[#FF9800] flex flex-col h-full relative md:-my-8 z-10 transform md:scale-105">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#FF9800] text-white text-sm font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                  Mais Escolhido
                </div>
                <h3 className="font-serif text-2xl font-black text-white mb-2">Plano Destaque</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black text-white">R$49</span>
                  <span className="text-white/60 font-medium">/mês</span>
                </div>
                
                <ul className="space-y-5 mb-10 flex-grow">
                  <li className="flex items-start gap-3 text-white/90">
                    <Star className="h-6 w-6 text-[#FF9800] fill-[#FF9800] flex-shrink-0" />
                    <span>Tudo do plano básico</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/90">
                    <Star className="h-6 w-6 text-[#FF9800] fill-[#FF9800] flex-shrink-0" />
                    <span>Posição privilegiada nas buscas</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/90">
                    <Star className="h-6 w-6 text-[#FF9800] fill-[#FF9800] flex-shrink-0" />
                    <span>Galeria com até 15 fotos</span>
                  </li>
                  <li className="flex items-start gap-3 text-white/90">
                    <Star className="h-6 w-6 text-[#FF9800] fill-[#FF9800] flex-shrink-0" />
                    <span>Selo de Negócio Verificado</span>
                  </li>
                </ul>
                
                <Button className="w-full py-7 rounded-2xl text-lg font-black bg-[#FF9800] hover:bg-[#e68a00] text-white shadow-xl hover:shadow-2xl transition-all">
                  Assinar Destaque
                </Button>
                <p className="text-center text-sm text-white/50 mt-4 font-medium">Sem fidelidade. Cancele quando quiser.</p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF9800]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#4CAF50]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">Comunidade</span>
            <h2 className="font-serif text-4xl md:text-5xl font-black mb-6 text-[#6F4E37]">O que dizem sobre nós</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-[#F5F5DC]/50 rounded-[2.5rem] p-10 relative group hover:bg-[#F5F5DC] transition-colors border-l-8 border-[#FF9800] shadow-sm hover:shadow-xl">
                <Quote className="absolute top-8 right-8 h-20 w-20 text-[#6F4E37]/5 -z-0 group-hover:text-[#6F4E37]/10 transition-colors" />
                <div className="relative z-10">
                  <div className="flex gap-1.5 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 fill-[#FF9800] text-[#FF9800]" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-10 leading-relaxed text-lg font-serif">"{testimonial.content}"</p>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-inner ${testimonial.color}`}>
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-[#6F4E37] text-lg">{testimonial.name}</h4>
                      <p className="text-sm text-gray-500 font-medium">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2D1B12] text-white">
        {/* Newsletter Row */}
        <div className="border-b border-white/10">
          <div className="container mx-auto px-4 py-16 lg:py-20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-[#6F4E37]/30 p-10 rounded-[2.5rem] border border-white/5">
              <div className="max-w-xl text-center lg:text-left">
                <h3 className="font-serif text-3xl font-black mb-3">Receba novidades da cidade</h3>
                <p className="text-white/70 text-lg font-light">Fique por dentro de novas empresas, promoções e eventos locais.</p>
              </div>
              <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                <Input 
                  placeholder="Seu melhor e-mail" 
                  className="w-full sm:w-80 px-6 py-6 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-full focus-visible:ring-[#FF9800] text-lg"
                />
                <Button className="bg-[#FF9800] hover:bg-[#e68a00] text-white px-8 py-6 rounded-full font-bold text-lg shadow-lg">
                  Inscrever-se
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="container mx-auto px-4 pt-20 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative flex items-center justify-center w-10 h-10">
                  <svg viewBox="0 0 100 100" className="w-10 h-10 drop-shadow-md">
                    <path d="M50 10 C30 10, 20 30, 20 50 C20 70, 50 90, 50 90 C50 90, 80 70, 80 50 C80 30, 70 10, 50 10 Z" fill="#FF9800" />
                    <path d="M50 25 C40 25, 35 35, 35 45 C35 55, 50 65, 50 65 C50 65, 65 55, 65 45 C65 35, 60 25, 50 25 Z" fill="#F5F5DC" />
                    <path d="M45 35 Q50 45, 45 55" stroke="#2D1B12" strokeWidth="2" fill="none" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-serif font-black text-xl tracking-tight leading-none text-white">HUB LONDRINA</span>
                  <span className="text-[10px] tracking-[0.2em] font-bold text-[#4CAF50] mt-0.5">NEGÓCIO LOCAL</span>
                </div>
              </div>
              <p className="text-white/60 leading-relaxed mb-8 font-light pr-8">
                Valorizando a economia de Londrina, conectando quem busca qualidade com quem faz com dedicação.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF9800] hover:border-[#FF9800] transition-colors">
                  <Instagram className="h-5 w-5 text-white" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF9800] hover:border-[#FF9800] transition-colors">
                  <Facebook className="h-5 w-5 text-white" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#4CAF50] hover:border-[#4CAF50] transition-colors">
                  <Phone className="h-5 w-5 text-white" />
                </a>
              </div>
            </div>
            
            <div className="md:col-span-2 md:col-start-6">
              <h4 className="font-black text-white mb-6 uppercase tracking-wider text-sm">Explorar</h4>
              <ul className="space-y-4 text-white/60 font-medium">
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Categorias</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Destaques</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Recém Chegados</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Regiões</a></li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="font-black text-white mb-6 uppercase tracking-wider text-sm">Empresas</h4>
              <ul className="space-y-4 text-white/60 font-medium">
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Planos e Preços</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Como Funciona</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Dicas de Sucesso</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Login para Parceiros</a></li>
              </ul>
            </div>
            
            <div className="md:col-span-2 md:col-start-11">
              <h4 className="font-black text-white mb-6 uppercase tracking-wider text-sm">Suporte</h4>
              <ul className="space-y-4 text-white/60 font-medium">
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Fale Conosco</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40 font-medium">
            <p>© {new Date().getFullYear()} Hub Londrina. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1.5">
              Feito com <Heart className="h-4 w-4 text-red-500 fill-red-500" /> em Londrina, PR
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
