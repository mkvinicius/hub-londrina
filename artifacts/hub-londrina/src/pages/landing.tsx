import { useState } from "react";
import { useLocation } from "wouter";
import {
  Search, MapPin, Star, ArrowRight, Quote,
  CheckCircle2, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { useListCategories, useListBusinesses } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";

const testimonials = [
  {
    name: "Mariana Costa",
    role: "Moradora da Zona Sul",
    content: "O Hub Londrina mudou a forma como eu descubro novos lugares na cidade. Encontrei uma padaria artesanal incrível do lado de casa!",
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
    content: "Sempre uso o site para achar onde comer no fim de semana. As avaliações são super reais e me ajudam a escolher os melhores lugares.",
    color: "bg-green-100 text-green-700"
  },
];

export default function Landing() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [, navigate] = useLocation();

  const { data: categoriesData } = useListCategories();
  const { data: featuredData } = useListBusinesses({ sort: "rating" });

  const categories = categoriesData?.data ?? [];
  const featuredBusinesses = (featuredData?.data ?? []).slice(0, 4);

  function handleSearch() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (region && region !== "todas") params.set("regiao", region);
    navigate(`/busca?${params.toString()}`);
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80"
            alt="Londrina vista da cidade"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#6F4E37]/90 via-[#6F4E37]/70 to-[#FF9800]/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F5F5DC] via-transparent to-transparent opacity-80" />
        </div>

        <div className="container mx-auto px-4 relative z-10 h-full flex flex-col justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-semibold mb-8">
              <Star className="h-4 w-4 text-[#FF9800] fill-[#FF9800]" />
              <span>O maior guia de negócios locais da região</span>
            </div>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[1.1] drop-shadow-2xl">
              Valorize quem faz <br /><span className="text-[#FF9800] italic">Londrina</span> acontecer.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 font-light drop-shadow-md max-w-2xl mx-auto">
              Descubra os melhores serviços, restaurantes e lojas perto de você.
            </p>

            <div className="bg-white/10 backdrop-blur-xl p-3 rounded-[2rem] shadow-2xl border border-white/30 max-w-4xl mx-auto flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400" />
                <Input
                  placeholder="O que você está procurando?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-16 pr-6 py-8 bg-white border-0 focus-visible:ring-2 focus-visible:ring-[#FF9800] rounded-full text-xl text-gray-800 placeholder:text-gray-400 shadow-inner"
                />
              </div>
              <div className="w-full md:w-72">
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="w-full py-8 px-6 bg-white border-0 focus:ring-2 focus:ring-[#FF9800] rounded-full text-xl text-gray-800 shadow-inner">
                    <SelectValue placeholder="Qualquer Região" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-2xl p-2">
                    <SelectItem value="todas" className="text-lg py-3 rounded-xl cursor-pointer">Todas as regiões</SelectItem>
                    <SelectItem value="Centro" className="text-lg py-3 rounded-xl cursor-pointer">Centro</SelectItem>
                    <SelectItem value="Gleba Palhano" className="text-lg py-3 rounded-xl cursor-pointer">Gleba Palhano</SelectItem>
                    <SelectItem value="Zona Norte" className="text-lg py-3 rounded-xl cursor-pointer">Zona Norte</SelectItem>
                    <SelectItem value="Zona Sul" className="text-lg py-3 rounded-xl cursor-pointer">Zona Sul</SelectItem>
                    <SelectItem value="Jardim Quebec" className="text-lg py-3 rounded-xl cursor-pointer">Jardim Quebec</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSearch}
                className="w-full md:w-auto bg-[#FF9800] hover:bg-[#e68a00] text-white py-8 px-12 rounded-full text-xl font-bold shadow-xl hover:shadow-2xl transition-all"
              >
                Buscar
              </Button>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 text-white/90 font-medium">
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
                <span className="text-3xl font-bold text-white mb-1">5</span>
                <span className="text-sm uppercase tracking-wider opacity-80">Regiões Atendidas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categorias" className="py-32 relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">O que você precisa?</span>
              <h2 className="font-serif text-4xl md:text-5xl font-black text-[#6F4E37]">Explore por Categoria</h2>
            </div>
            <Button
              variant="outline"
              className="rounded-full border-[#6F4E37]/20 text-[#6F4E37] hover:bg-[#6F4E37] hover:text-white px-8"
              onClick={() => navigate("/categorias")}
            >
              Ver todas <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.slice(0, 10).map((category) => {
              const Icon = getCategoryIcon(category.icon);
              const colorClasses = getCategoryColorClasses(category.color);
              return (
                <button
                  key={category.id}
                  onClick={() => navigate(`/busca?categoria=${category.slug}`)}
                  className="group relative overflow-hidden flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-[#6F4E37]/5"
                >
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${colorClasses}`}>
                    <Icon className="h-10 w-10" />
                  </div>
                  <span className="font-bold text-lg text-center text-[#6F4E37] group-hover:text-[#FF9800] transition-colors">{category.name}</span>
                  {category.businessCount !== undefined && (
                    <span className="text-xs text-gray-400 mt-1">{category.businessCount} negócios</span>
                  )}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FF9800]/20 rounded-3xl transition-colors"></div>
                </button>
              );
            })}
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
            <p className="text-xl text-gray-600 font-light">Conheça os negócios mais bem avaliados pelos londrinenses.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredBusinesses.map((biz) => (
              <div
                key={biz.id}
                className="group flex flex-col bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                onClick={() => navigate(`/negocio/${biz.id}`)}
              >
                <div className="relative h-[260px] overflow-hidden">
                  <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-black text-[#6F4E37] shadow-lg">
                    <Star className="h-4 w-4 fill-[#FF9800] text-[#FF9800]" />
                    {biz.rating}
                  </div>
                  {biz.photoUrl ? (
                    <img
                      src={biz.photoUrl}
                      alt={biz.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#FF9800]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <h3 className="font-serif text-2xl font-bold text-white drop-shadow-md group-hover:text-[#FF9800] transition-colors">{biz.name}</h3>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-3 py-1 rounded-full uppercase tracking-wider">{biz.categorySlug}</span>
                    <span className="text-xs text-gray-400 font-medium">{biz.reviewsCount} aval.</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-2">{biz.description}</p>

                  <div className="flex items-start gap-2 text-sm text-gray-500 mb-6 font-medium">
                    <MapPin className="h-5 w-5 text-[#FF9800] flex-shrink-0" />
                    <span>{biz.region}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
                    {biz.whatsapp ? (
                      <a
                        href={`https://wa.me/55${biz.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1"
                      >
                        <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-6 font-bold shadow-md">
                          WhatsApp
                        </Button>
                      </a>
                    ) : (
                      <Button className="flex-1 bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-6 font-bold shadow-md">
                        Ver Perfil
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-gray-200 text-[#6F4E37] hover:bg-[#F5F5DC]">
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Button
              variant="link"
              className="text-lg font-bold text-[#6F4E37] border-b-2 border-[#FF9800] rounded-none px-0 pb-1 hover:text-[#FF9800]"
              onClick={() => navigate("/busca")}
            >
              Explorar todos os lugares
            </Button>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 bg-[#F5F5DC] relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">Passo a Passo</span>
            <h2 className="font-serif text-4xl md:text-5xl font-black mb-6 text-[#6F4E37]">Como Funciona</h2>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-1 border-t-2 border-dashed border-[#6F4E37]/20 z-0"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 relative border-4 border-[#F5F5DC] group-hover:border-[#FF9800] transition-colors duration-300">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#FF9800] text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg">1</div>
                  <Search className="h-10 w-10 text-[#FF9800]" />
                </div>
                <h3 className="text-2xl font-black text-[#6F4E37] mb-4">Busque</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Procure pelo que precisa ou explore as categorias. Tem de tudo, bem perto de você.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 relative border-4 border-[#F5F5DC] group-hover:border-[#4CAF50] transition-colors duration-300">
                  <div className="absolute -top-3 -left-3 w-10 h-10 bg-[#4CAF50] text-white rounded-full flex items-center justify-center font-black text-xl shadow-lg">2</div>
                  <Star className="h-10 w-10 text-[#4CAF50]" />
                </div>
                <h3 className="text-2xl font-black text-[#6F4E37] mb-4">Escolha</h3>
                <p className="text-gray-600 text-lg leading-relaxed">Veja fotos, avaliações e informações detalhadas para escolher a melhor opção.</p>
              </div>

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
        <div className="lg:w-5/12 bg-[#2D1B12] text-white p-12 lg:p-24 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          <div className="relative z-10">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-4 block">Para Empreendedores</span>
            <h2 className="font-serif text-4xl lg:text-6xl font-black mb-8 leading-tight">
              Apareça para quem <span className="italic text-[#F5F5DC]">importa</span>.
            </h2>
            <p className="text-xl text-white/70 mb-12 font-light leading-relaxed">
              Junte-se a centenas de empresas que já estão conectando suas marcas aos moradores de Londrina de forma autêntica.
            </p>

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

        <div className="lg:w-7/12 bg-[#F5F5DC] p-12 lg:p-24 flex items-center justify-center relative">
          <div className="w-full max-w-3xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100 flex flex-col h-full">
                <h3 className="font-serif text-2xl font-black text-[#6F4E37] mb-2">Plano Destaque</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black text-[#6F4E37]">R$49</span>
                  <span className="text-gray-500 font-medium">/mês</span>
                </div>
                <ul className="space-y-5 mb-10 flex-grow">
                  {["Perfil completo e verificado", "Até 10 fotos na galeria", "Prioridade nas buscas", "Recebe avaliações"].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-gray-600">
                      <CheckCircle2 className="h-6 w-6 text-[#4CAF50] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-2xl py-6 font-bold text-lg shadow-md"
                  onClick={() => navigate("/anuncie")}
                >
                  Ver Planos
                </Button>
              </div>

              <div className="bg-[#6F4E37] rounded-[2.5rem] p-8 shadow-xl text-white flex flex-col h-full">
                <h3 className="font-serif text-2xl font-black text-white mb-2">Plano Premium</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black text-white">R$89</span>
                  <span className="text-white/70 font-medium">/mês</span>
                </div>
                <ul className="space-y-5 mb-10 flex-grow">
                  {["Tudo do Destaque", "Fotos ilimitadas", "Banner na página inicial", "Suporte prioritário"].map((f) => (
                    <li key={f} className="flex items-start gap-3 text-white/90">
                      <CheckCircle2 className="h-6 w-6 text-[#4CAF50] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-2xl py-6 font-bold text-lg"
                  onClick={() => navigate("/anuncie")}
                >
                  Falar com Consultor
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-[#F5F5DC]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">O que dizem sobre nós</span>
            <h2 className="font-serif text-4xl md:text-5xl font-black mb-6 text-[#6F4E37]">A voz da comunidade</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <Quote className="h-8 w-8 text-[#FF9800] mb-4 opacity-40" />
                <p className="text-gray-600 italic mb-6 leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${t.color}`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#6F4E37]">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
