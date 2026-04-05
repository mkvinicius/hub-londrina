import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useListCategories } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";

export default function Categorias() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useListCategories();

  const categories = data?.data ?? [];

  return (
    <Layout>
      <section className="pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-[#FF9800] font-bold tracking-wider uppercase text-sm mb-2 block">Todas as categorias</span>
            <h1 className="font-serif text-4xl md:text-5xl font-black text-[#6F4E37] mb-6">
              O que você está procurando?
            </h1>
            <p className="text-lg text-gray-600">
              Explore os melhores negócios de Londrina organizados por categoria.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                const colorClasses = getCategoryColorClasses(category.color);
                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/busca?categoria=${category.slug}`)}
                    className="group relative overflow-hidden flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-[#6F4E37]/5 text-left"
                  >
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${colorClasses}`}>
                      <Icon className="h-10 w-10" />
                    </div>
                    <span className="font-bold text-lg text-center text-[#6F4E37] group-hover:text-[#FF9800] transition-colors">
                      {category.name}
                    </span>
                    {category.businessCount !== undefined && (
                      <span className="text-sm text-gray-400 mt-2 font-medium">
                        {category.businessCount} {category.businessCount === 1 ? "negócio" : "negócios"}
                      </span>
                    )}
                    <div className="mt-4 flex items-center gap-1 text-[#FF9800] opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">
                      Ver todos <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FF9800]/20 rounded-3xl transition-colors"></div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 bg-white relative z-10">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-[#6F4E37] to-[#4a3628] rounded-[2rem] p-12 md:p-16 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10">
              <h2 className="font-serif text-3xl md:text-4xl font-black text-white mb-4">
                Seu negócio ainda não está aqui?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Cadastre-se gratuitamente e comece a ser encontrado por milhares de londrinenses.
              </p>
              <button
                onClick={() => navigate("/anuncie")}
                className="bg-[#FF9800] hover:bg-[#e68a00] text-white py-4 px-10 rounded-full text-lg font-bold shadow-xl hover:shadow-2xl transition-all"
              >
                Anunciar Meu Negócio
              </button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
