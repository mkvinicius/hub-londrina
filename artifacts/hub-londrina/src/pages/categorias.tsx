import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useListCategories } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses, getCategoryPhoto } from "@/lib/icons";

export default function Categorias() {
  const [, navigate] = useLocation();
  const { data, isLoading } = useListCategories();
  const categories = data?.data ?? [];

  return (
    <Layout>
      <section className="pt-10 pb-20 bg-white dark:bg-gray-900 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#d97706] font-bold text-sm uppercase tracking-wider mb-2 block">Todas as categorias</span>
            <h1 className="font-black text-4xl md:text-5xl text-[#3a2512] dark:text-gray-100 mb-4">
              O que você está procurando?
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-base">
              Explore os melhores negócios de Londrina organizados por categoria.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                const colorClasses = getCategoryColorClasses(category.color);
                const photo = getCategoryPhoto(category);
                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/busca?categoria=${category.slug}`)}
                    className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl dark:hover:shadow-gray-900/50 transition-all duration-300 text-left flex flex-col"
                    data-testid={`card-category-${category.slug}`}
                  >
                    {/* Foto (topo) */}
                    <div className="relative overflow-hidden flex-shrink-0 h-32">
                      <img
                        src={photo}
                        alt={category.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    {/* Círculo com ícone colorido sobreposto na divisa */}
                    <div className="relative">
                      <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-10">
                        <div className={`w-14 h-14 rounded-full ${colorClasses} shadow-md flex items-center justify-center border-[3px] border-white dark:border-gray-800`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="px-4 pt-9 pb-5 flex flex-col text-center flex-grow">
                      <h3 className="font-black text-lg text-[#1a1a1a] dark:text-gray-100 group-hover:text-[#d97706] transition-colors leading-tight tracking-tight line-clamp-1">
                        {category.name}
                      </h3>
                      {category.businessCount !== undefined && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 font-medium">
                          {category.businessCount} {category.businessCount === 1 ? "negócio" : "negócios"}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="bg-[#4a2c0e] rounded-2xl p-10 md:p-14 text-center">
            <h2 className="font-black text-3xl text-white mb-3">
              Seu negócio ainda não está aqui?
            </h2>
            <p className="text-white/70 text-base mb-8 max-w-lg mx-auto">
              Cadastre-se gratuitamente e comece a ser encontrado por milhares de londrinenses.
            </p>
            <button
              onClick={() => navigate("/anuncie")}
              className="bg-[#d97706] hover:bg-[#b45309] text-white py-3.5 px-10 rounded-full text-base font-bold shadow-lg transition-colors"
            >
              Anunciar Meu Negócio
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
