import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useListCategories } from "@workspace/api-client-react";
import { getCategoryIcon, getCategoryColorClasses } from "@/lib/icons";
import { imgSrc } from "@/lib/utils";
import type { Category } from "@workspace/api-client-react";

const CATEGORY_PHOTOS: Record<string, string> = {
  restaurantes: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=70",
  saloes: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=70",
  academias: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=70",
  mercados: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=70",
  cafeterias: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=70",
  servicos: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=70",
  educacao: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=70",
  farmacias: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=70",
  petshops: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=70",
  confeitarias: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=70",
};

function getCategoryPhoto(category: Category): string {
  if (category.photoUrl) return imgSrc(category.photoUrl);
  const key = Object.keys(CATEGORY_PHOTOS).find(
    (k) => category.slug.includes(k) || k.includes(category.slug)
  );
  return key ? CATEGORY_PHOTOS[key] : `https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=600&q=70`;
}

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
