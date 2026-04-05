import React from "react";
import { Search, MapPin, Star, ChevronRight, Menu, Coffee, Scissors, Dumbbell, ShoppingCart, Wrench, Utensils, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function LandingPage() {
  const categories = [
    { name: "Restaurantes", icon: Utensils },
    { name: "Salões de Beleza", icon: Scissors },
    { name: "Academias", icon: Dumbbell },
    { name: "Mercados", icon: ShoppingCart },
    { name: "Serviços", icon: Wrench },
    { name: "Cafeterias", icon: Coffee },
  ];

  const featuredBusinesses = [
    {
      name: "Sabor da Terra",
      category: "Restaurante",
      rating: 4.8,
      reviews: 124,
      image: "/__mockup/images/biz-restaurant.png",
      address: "Gleba Palhano",
    },
    {
      name: "Studio Elegance",
      category: "Salão de Beleza",
      rating: 4.9,
      reviews: 89,
      image: "/__mockup/images/biz-salon.png",
      address: "Centro",
    },
    {
      name: "Mercadinho São José",
      category: "Mercado",
      rating: 4.7,
      reviews: 56,
      image: "/__mockup/images/biz-grocery.png",
      address: "Zona Norte",
    },
    {
      name: "Café do Ponto",
      category: "Cafeteria",
      rating: 5.0,
      reviews: 210,
      image: "/__mockup/images/biz-coffee.png",
      address: "Jardim Quebec",
    },
  ];

  const testimonials = [
    {
      name: "Mariana Costa",
      role: "Moradora da Zona Sul",
      content: "O Hub Londrina mudou a forma como eu descubro novos lugares na cidade. Encontrei uma padaria artesanal incrível do lado de casa que eu nem sabia que existia!",
    },
    {
      name: "Roberto Silva",
      role: "Dono de Oficina",
      content: "Desde que anunciei minha oficina aqui, o movimento aumentou muito. É ótimo ver a comunidade se apoiando e valorizando o negócio local.",
    },
    {
      name: "Juliana Alves",
      role: "Estudante",
      content: "Sempre uso o site para achar onde comer no fim de semana. As avaliações são super reais e me ajudam muito a escolher os melhores lugares.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5DC] font-sans text-[#6F4E37] selection:bg-[#FF9800] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F5F5DC]/90 backdrop-blur-md border-b border-[#6F4E37]/10 transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-[#FF9800]" />
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl leading-none text-[#6F4E37]">HUB LONDRINA</span>
              <span className="text-[10px] tracking-widest font-semibold text-[#4CAF50]">NEGÓCIO LOCAL</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 font-medium">
            <a href="#" className="hover:text-[#FF9800] transition-colors">Início</a>
            <a href="#sobre" className="hover:text-[#FF9800] transition-colors">Sobre</a>
            <a href="#categorias" className="hover:text-[#FF9800] transition-colors">Categorias</a>
            <a href="#contato" className="hover:text-[#FF9800] transition-colors">Contato</a>
          </nav>

          <div className="flex items-center gap-4">
            <Button className="hidden md:flex bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-full px-6 shadow-md hover:shadow-lg transition-all">
              Anuncie Aqui
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden text-[#6F4E37]">
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 lg:pt-32 lg:pb-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/hub-hero-bg.png" 
            alt="Londrina skyline at golden hour" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#6F4E37]/80 to-[#6F4E37]/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
              DESCUBRA OS MELHORES NEGÓCIOS LOCAIS DE LONDRINA
            </h1>
            <p className="text-xl md:text-2xl text-[#F5F5DC] mb-10 font-light drop-shadow-md">
              Encontre produtos e serviços perto de você. Valorize a nossa cidade, apoie quem faz acontecer.
            </p>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white/20 max-w-4xl flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  placeholder="O que você está procurando?" 
                  className="w-full pl-12 pr-4 py-6 bg-white border-0 focus-visible:ring-2 focus-visible:ring-[#FF9800] rounded-2xl text-lg text-gray-800 placeholder:text-gray-400"
                />
              </div>
              <div className="w-full md:w-64">
                <Select>
                  <SelectTrigger className="w-full py-6 bg-white border-0 focus:ring-2 focus:ring-[#FF9800] rounded-2xl text-lg text-gray-800">
                    <SelectValue placeholder="Selecione a Região" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-0 shadow-xl">
                    <SelectItem value="todas">Todas as regiões</SelectItem>
                    <SelectItem value="centro">Centro</SelectItem>
                    <SelectItem value="gleba">Gleba Palhano</SelectItem>
                    <SelectItem value="norte">Zona Norte</SelectItem>
                    <SelectItem value="sul">Zona Sul</SelectItem>
                    <SelectItem value="leste">Zona Leste</SelectItem>
                    <SelectItem value="oeste">Zona Oeste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full md:w-auto bg-[#FF9800] hover:bg-[#e68a00] text-white py-6 px-8 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                Buscar
              </Button>
            </div>
            
            <div className="mt-8 flex items-center gap-4 text-white/90 text-sm font-medium">
              <span>Populares:</span>
              <div className="flex gap-2 flex-wrap">
                <span className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm cursor-pointer hover:bg-[#FF9800]/80 transition-colors">Café</span>
                <span className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm cursor-pointer hover:bg-[#FF9800]/80 transition-colors">Mecânica</span>
                <span className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm cursor-pointer hover:bg-[#FF9800]/80 transition-colors">Pet Shop</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categorias" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4 text-[#6F4E37]">Explore por Categoria</h2>
            <p className="text-lg text-gray-600">Tudo o que você precisa, feito por pessoas da nossa terra.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <a 
                href="#" 
                key={index}
                className="group flex flex-col items-center justify-center p-8 bg-[#F5F5DC]/50 rounded-3xl hover:bg-[#FF9800]/10 border border-transparent hover:border-[#FF9800]/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all mb-4 text-[#6F4E37] group-hover:text-[#FF9800]">
                  <category.icon className="h-8 w-8" />
                </div>
                <span className="font-medium text-center text-[#6F4E37] group-hover:text-[#FF9800] transition-colors">{category.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="py-24 bg-[#F5F5DC]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <h2 className="font-serif text-4xl font-bold mb-4 text-[#6F4E37]">Destaques da Semana</h2>
              <p className="text-lg text-[#6F4E37]/70">Conheça os negócios mais bem avaliados pelos londrinenses.</p>
            </div>
            <Button variant="ghost" className="text-[#FF9800] hover:text-[#e68a00] hover:bg-[#FF9800]/10">
              Ver todos os destaques <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredBusinesses.map((biz, index) => (
              <Card key={index} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group rounded-3xl bg-white cursor-pointer">
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                  <img 
                    src={biz.image} 
                    alt={biz.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold text-[#6F4E37]">
                    <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                    {biz.rating}
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="text-sm font-semibold text-[#4CAF50] mb-2 uppercase tracking-wider">{biz.category}</div>
                  <h3 className="font-serif text-xl font-bold mb-2 group-hover:text-[#FF9800] transition-colors">{biz.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <MapPin className="h-4 w-4" />
                    {biz.address}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">{biz.reviews} avaliações</span>
                    <Heart className="h-5 w-5 text-gray-300 hover:text-red-500 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute -left-40 top-20 w-80 h-80 bg-[#FF9800]/5 rounded-full blur-3xl" />
        <div className="absolute -right-40 bottom-20 w-80 h-80 bg-[#4CAF50]/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl font-bold mb-6 text-[#6F4E37]">Como Funciona</h2>
            <p className="text-lg text-gray-600">Simples, rápido e feito para fortalecer nossa economia local.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-[#F5F5DC] text-[#6F4E37] rounded-2xl flex items-center justify-center text-3xl font-serif font-bold mb-6 relative">
                1
                <div className="absolute -right-3 -bottom-3 w-8 h-8 bg-[#FF9800] rounded-full flex items-center justify-center text-white">
                  <Search className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">Busque</h3>
              <p className="text-gray-600 leading-relaxed">Procure pelo que precisa ou explore as categorias. Tem de tudo, bem perto de você.</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-[#F5F5DC] text-[#6F4E37] rounded-2xl flex items-center justify-center text-3xl font-serif font-bold mb-6 relative">
                2
                <div className="absolute -right-3 -bottom-3 w-8 h-8 bg-[#FF9800] rounded-full flex items-center justify-center text-white">
                  <Star className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">Escolha</h3>
              <p className="text-gray-600 leading-relaxed">Veja fotos, avaliações e informações detalhadas para escolher a melhor opção.</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-[#F5F5DC] text-[#6F4E37] rounded-2xl flex items-center justify-center text-3xl font-serif font-bold mb-6 relative">
                3
                <div className="absolute -right-3 -bottom-3 w-8 h-8 bg-[#FF9800] rounded-full flex items-center justify-center text-white">
                  <Heart className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3">Apoie</h3>
              <p className="text-gray-600 leading-relaxed">Entre em contato, visite o local ou faça seu pedido. Você fortalece a nossa cidade!</p>
            </div>
          </div>
        </div>
      </section>

      {/* For Business Owners / Plans */}
      <section className="py-24 bg-[#6F4E37] text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <h2 className="font-serif text-4xl lg:text-5xl font-bold mb-6 text-[#F5F5DC]">
                Você tem um negócio em Londrina?
              </h2>
              <p className="text-xl text-white/80 mb-8 font-light leading-relaxed">
                Junte-se a centenas de empreendedores que já estão conectando suas marcas aos moradores da cidade. Aumente sua visibilidade e suas vendas.
              </p>
              
              <ul className="space-y-4 mb-10">
                {[
                  "Perfil completo com fotos e informações",
                  "Receba avaliações e construa reputação",
                  "Apareça nas buscas por região",
                  "Suporte local dedicado"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#4CAF50] flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              
              <Button className="bg-[#FF9800] hover:bg-[#e68a00] text-white py-6 px-10 rounded-full text-lg font-bold shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                Criar Perfil Grátis
              </Button>
            </div>
            
            <div className="lg:w-1/2 w-full">
              <div className="bg-white rounded-3xl p-8 text-[#6F4E37] shadow-2xl relative">
                <div className="absolute -top-4 -right-4 bg-[#FF9800] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Mais Popular
                </div>
                <h3 className="font-serif text-2xl font-bold mb-2">Plano Destaque</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">R$49</span>
                  <span className="text-gray-500">/mês</span>
                </div>
                
                <div className="h-px w-full bg-gray-100 mb-6" />
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-gray-600">
                    <Star className="h-5 w-5 text-[#FF9800] fill-[#FF9800]" />
                    Posição privilegiada nas buscas
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <Star className="h-5 w-5 text-[#FF9800] fill-[#FF9800]" />
                    Até 10 fotos no perfil
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <Star className="h-5 w-5 text-[#FF9800] fill-[#FF9800]" />
                    Selo de "Negócio Verificado"
                  </li>
                  <li className="flex items-center gap-3 text-gray-600">
                    <Star className="h-5 w-5 text-[#FF9800] fill-[#FF9800]" />
                    Destaque na página inicial
                  </li>
                </ul>
                
                <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white py-6 rounded-2xl text-lg font-bold transition-all">
                  Assinar Agora
                </Button>
                <p className="text-center text-sm text-gray-400 mt-4">Cancele quando quiser.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#F5F5DC]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-4xl font-bold mb-4 text-[#6F4E37]">O que dizem sobre nós</h2>
            <p className="text-lg text-gray-600">A comunidade de Londrina unida pelo negócio local.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white border-0 shadow-lg rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300">
                <div className="flex gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-[#FF9800] text-[#FF9800]" />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-8 leading-relaxed text-lg">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#6F4E37]/10 rounded-full flex items-center justify-center font-serif font-bold text-[#6F4E37] text-xl">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#6F4E37]">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#6F4E37] text-[#F5F5DC] pt-20 pb-10 border-t border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-8 w-8 text-[#FF9800]" />
                <div className="flex flex-col">
                  <span className="font-serif font-bold text-xl leading-none text-white">HUB LONDRINA</span>
                  <span className="text-[10px] tracking-widest font-semibold text-[#4CAF50]">NEGÓCIO LOCAL</span>
                </div>
              </div>
              <p className="text-white/70 leading-relaxed max-w-md mb-8">
                O maior portal de descobertas de negócios locais de Londrina. Nossa missão é conectar a comunidade aos empreendedores que fazem a nossa cidade acontecer.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Navegação</h4>
              <ul className="space-y-4 text-white/70">
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Início</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Sobre o Projeto</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Explorar Categorias</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Planos para Negócios</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Suporte</h4>
              <ul className="space-y-4 text-white/70">
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Fale Conosco</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Dúvidas Frequentes</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-[#FF9800] transition-colors">Privacidade</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
            <p>© {new Date().getFullYear()} Hub Londrina Negócio Local. Todos os direitos reservados.</p>
            <p>Feito com <Heart className="h-3 w-3 inline text-red-500 mx-1" /> em Londrina, PR</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
