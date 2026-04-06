import { useLocation } from "wouter";
import {
  CheckCircle2, TrendingUp, Users, Smartphone, MessageSquare,
  HeadphonesIcon, Award, Check, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

const beneficios = [
  {
    icon: TrendingUp,
    title: "Visibilidade local",
    desc: "Apareça para pessoas que moram ou trabalham perto do seu negócio e estão prontas para comprar.",
    bg: "bg-[#FF9800]/10",
    color: "text-[#FF9800]",
  },
  {
    icon: Users,
    title: "Clientes qualificados",
    desc: "Alcance consumidores que buscam exatamente os serviços e produtos que você oferece.",
    bg: "bg-[#4CAF50]/10",
    color: "text-[#4CAF50]",
  },
  {
    icon: Smartphone,
    title: "Perfil personalizado",
    desc: "Uma página completa com suas fotos, horários, categorias e informações de contato.",
    bg: "bg-blue-100",
    color: "text-blue-600",
  },
  {
    icon: MessageSquare,
    title: "Integração WhatsApp",
    desc: "Receba contatos e pedidos diretamente no seu WhatsApp com apenas um clique do cliente.",
    bg: "bg-green-100",
    color: "text-green-600",
  },
  {
    icon: Award,
    title: "Avaliações reais",
    desc: "Construa reputação e credibilidade com depoimentos autênticos dos seus clientes.",
    bg: "bg-yellow-100",
    color: "text-yellow-600",
  },
  {
    icon: HeadphonesIcon,
    title: "Suporte dedicado",
    desc: "Nossa equipe local está sempre pronta para ajudar você a tirar o máximo da plataforma.",
    bg: "bg-purple-100",
    color: "text-purple-600",
  },
];

const steps = [
  { title: "Crie sua conta", desc: "Cadastro gratuito em menos de 2 minutos." },
  { title: "Preencha seu perfil", desc: "Adicione fotos, horários e detalhes do negócio." },
  { title: "Aguarde verificação", desc: "Nossa equipe aprova seu perfil rapidamente." },
  { title: "Seja encontrado", desc: "Pronto! Comece a receber novos clientes." },
];

const depoimentos = [
  {
    name: "Julio Fonseca",
    biz: "Sabor da Terra",
    text: "Desde que começamos a anunciar, o movimento no almoço aumentou 30%. Vale cada centavo.",
    color: "bg-red-100 text-red-600",
  },
  {
    name: "Amanda Silva",
    biz: "Studio Elegance",
    text: "As clientes dizem que nos acharam no Hub Londrina. A plataforma é linda e fácil de usar.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    name: "Marcos T.",
    biz: "Mercadinho São José",
    text: "Até quem mora perto não sabia de todas as nossas ofertas. O Hub conectou a gente com o bairro.",
    color: "bg-green-100 text-green-600",
  },
];

export default function Anuncie() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="pt-20 bg-gradient-to-br from-[#6F4E37] to-[#4a3628] overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight drop-shadow-lg">
                Coloque seu negócio no mapa de{" "}
                <span className="text-[#FF9800] italic">Londrina</span>.
              </h1>
              <p className="text-xl md:text-2xl text-white/80 mb-10 font-light max-w-2xl mx-auto lg:mx-0">
                Milhares de londrinenses buscam o que você oferece. Seja encontrado.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12">
                <Button className="w-full sm:w-auto bg-[#FF9800] hover:bg-[#e68a00] text-white text-lg py-7 px-10 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all">
                  Começar Grátis
                </Button>
                <a href="#como-funciona">
                  <Button variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:text-white text-lg py-7 px-10 rounded-full font-bold backdrop-blur-sm">
                    Ver como funciona
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 text-white/90">
                <div className="flex flex-col items-center lg:items-start">
                  <span className="text-3xl font-black text-white mb-1">500+</span>
                  <span className="text-xs uppercase tracking-wider opacity-80 font-bold">Negócios</span>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="flex flex-col items-center lg:items-start">
                  <span className="text-3xl font-black text-white mb-1">12.000+</span>
                  <span className="text-xs uppercase tracking-wider opacity-80 font-bold">Usuários/mês</span>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="flex flex-col items-center lg:items-start">
                  <span className="text-3xl font-black text-white mb-1">98%</span>
                  <span className="text-xs uppercase tracking-wider opacity-80 font-bold">Satisfação</span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white/10 transform rotate-2 hover:rotate-0 transition-transform duration-700">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
                  alt="Empreendedora local em Londrina"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-3xl shadow-xl flex items-center gap-4 transform -rotate-3">
                <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-[#4CAF50] fill-[#4CAF50]" />
                </div>
                <div>
                  <div className="font-bold text-[#6F4E37]">Avaliação 5.0</div>
                  <div className="text-sm text-gray-500">Mais visibilidade</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="py-24 bg-[#F5F5DC] dark:bg-gray-900 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-black text-[#6F4E37] dark:text-amber-400 mb-6">
              Por que anunciar no Hub Londrina?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              A plataforma focada 100% em conectar o comércio local com moradores da cidade.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {beneficios.map((b, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-[#6F4E37]/5 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 ${b.bg} rounded-2xl flex items-center justify-center mb-6`}>
                  <b.icon className={`h-7 w-7 ${b.color}`} />
                </div>
                <h3 className="font-bold text-xl text-[#6F4E37] dark:text-gray-100 mb-3">{b.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-black text-[#6F4E37] dark:text-gray-100 mb-6">Como funciona</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Um processo simples e rápido para colocar seu negócio online.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800 z-0"></div>
            {steps.map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full border-4 border-[#F5F5DC] dark:border-gray-700 shadow-lg flex items-center justify-center text-3xl font-black text-[#FF9800] mb-6">
                  {i + 1}
                </div>
                <h3 className="font-bold text-xl text-[#6F4E37] dark:text-gray-100 mb-2">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-32 bg-[#F5F5DC] dark:bg-gray-900 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="font-serif text-4xl md:text-5xl font-black text-[#6F4E37] dark:text-gray-100 mb-6">
              Escolha o plano certo para você
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Sem taxas escondidas. Cancele quando quiser.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {/* Gratuito */}
            <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-10 shadow-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-serif text-2xl font-black text-[#6F4E37] dark:text-gray-100 mb-2">Gratuito</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-[#6F4E37] dark:text-gray-100">R$0</span>
                <span className="text-gray-500 dark:text-gray-400 font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 min-h-[200px]">
                {["Perfil básico do negócio", "1 foto na galeria", "Link para WhatsApp", "Aparece nas buscas locais"].map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                    <Check className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl py-6 font-bold text-lg">
                Começar Grátis
              </Button>
            </div>

            {/* Destaque */}
            <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl border-2 border-[#FF9800] relative lg:scale-105 z-10">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#FF9800] text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                Mais Popular
              </div>
              <h3 className="font-serif text-2xl font-black text-[#6F4E37] mb-2">Destaque</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-[#6F4E37]">R$49</span>
                <span className="text-gray-500 font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 min-h-[200px]">
                {[
                  "Perfil completo e verificado",
                  "Até 10 fotos na galeria",
                  "Link para WhatsApp e Redes",
                  "Prioridade nas buscas",
                  "Recebe avaliações",
                  "Estatísticas de visitas",
                  "Selo de destaque",
                  "Suporte por email",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700 font-medium">
                    <CheckCircle2 className="h-5 w-5 text-[#FF9800] flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-2xl py-6 font-bold text-lg shadow-lg">
                Assinar Plano Destaque
              </Button>
            </div>

            {/* Premium */}
            <div className="bg-[#6F4E37] rounded-[2rem] p-10 shadow-xl border border-[#6F4E37]">
              <h3 className="font-serif text-2xl font-black text-white mb-2">Premium</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black text-white">R$89</span>
                <span className="text-white/70 font-medium">/mês</span>
              </div>
              <ul className="space-y-4 mb-10 min-h-[200px]">
                {[
                  "Tudo do plano Destaque",
                  "Fotos ilimitadas",
                  "Vídeo de apresentação",
                  "Banner na página inicial",
                  "Destaque absoluto nas buscas",
                  "Postagem no blog do Hub",
                  "Suporte prioritário WhatsApp",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/90">
                    <CheckCircle2 className="h-5 w-5 text-[#4CAF50] flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-2xl py-6 font-bold text-lg border-0">
                Falar com Consultor
              </Button>
            </div>
          </div>

          <div className="text-center mt-10">
            <p className="text-gray-500 font-medium">
              Planos anuais com desconto de 20% — R$399/ano e R$699/ano
            </p>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="depoimentos" className="py-24 bg-white dark:bg-gray-900 transition-colors">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif text-4xl font-black text-[#6F4E37] dark:text-gray-100 mb-6">Quem usa, recomenda</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {depoimentos.map((dep, i) => (
              <div key={i} className="bg-[#F5F5DC]/50 dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700">
                <div className="flex gap-1 mb-4 text-[#FF9800]">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic mb-6">"{dep.text}"</p>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${dep.color}`}>
                    {dep.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-[#6F4E37] dark:text-gray-100">{dep.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{dep.biz}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-[#FF9800] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-serif text-4xl md:text-5xl font-black text-white mb-8">
            Pronto para crescer?<br className="hidden md:block" />
            Cadastre seu negócio agora.
          </h2>
          <Button className="bg-white hover:bg-gray-100 text-[#FF9800] text-lg py-8 px-12 rounded-full font-black shadow-xl hover:shadow-2xl transition-all">
            Criar Conta Grátis
          </Button>
        </div>
      </section>
    </Layout>
  );
}
