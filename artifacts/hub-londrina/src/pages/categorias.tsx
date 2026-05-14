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
                <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
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
                    className="group relative overflow-hidden rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500 text-left aspect-[4/3]"
                  >
                    {/* Background photo */}
                    <img
                      src={photo}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-between p-5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClasses} shadow-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-xl text-white leading-tight mb-1 drop-shadow-sm">
                          {category.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          {category.businessCount !== undefined && (
                            <span className="text-sm text-white/70 font-medium">
                              {category.businessCount} {category.businessCount === 1 ? "negócio" : "negócios"}
                            </span>
                          )}
                          <span className="text-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm font-bold">
                            Ver todos <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
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
