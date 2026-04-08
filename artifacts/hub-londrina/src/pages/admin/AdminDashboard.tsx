import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { getStats } from "@/lib/admin-api";
import {
  Store, MousePointerClick, MessageCircle, TrendingUp,
  Users, Package, DollarSign, Eye, EyeOff, MapPin,
  Crown, Star, BarChart3, Clock
} from "lucide-react";

interface Stats {
  totalBusinesses: number;
  totalLojistas: number;
  totalProducts: number;
  totalClicks: number;
  totalWhatsappClicks: number;
  recentSignups: number;
  visibleCount: number;
  hiddenCount: number;
  estimatedRevenue: number;
  byPlan: { free: number; destaque: number; premium: number };
  byRegion: { name: string; count: number }[];
  byCategory: { name: string; slug: string; count: number }[];
  topBusinesses: { id: number; name: string; region: string; planType: string; clicks: number; whatsappClicks: number; rating: number; categorySlug: string }[];
  recentBusinesses: { id: number; name: string; region: string; planType: string; createdAt: string; isVisible: boolean; ownerEmail: string }[];
  clicksByDay: { day: string; type: string; count: number }[];
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    destaque: "bg-amber-100 text-amber-700",
    premium: "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = { free: "Gratuito", destaque: "Destaque", premium: "Premium" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${styles[plan] || styles.free}`}>
      {labels[plan] || plan}
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#d97706] border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">Carregando painel...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) return <AdminLayout><p className="text-red-500">Erro ao carregar dados.</p></AdminLayout>;

  const kpiCards = [
    { label: "Negócios", value: stats.totalBusinesses, icon: Store, color: "from-amber-500 to-orange-600", sub: `${stats.visibleCount} ativos` },
    { label: "Receita Estimada", value: `R$ ${stats.estimatedRevenue}`, icon: DollarSign, color: "from-emerald-500 to-green-600", sub: "/mês" },
    { label: "Cliques Totais", value: stats.totalClicks + stats.totalWhatsappClicks, icon: MousePointerClick, color: "from-blue-500 to-indigo-600", sub: `${stats.totalWhatsappClicks} WhatsApp` },
    { label: "Lojistas Ativos", value: stats.totalLojistas, icon: Users, color: "from-purple-500 to-violet-600", sub: `${stats.totalProducts} produtos` },
    { label: "Cadastros 30d", value: stats.recentSignups, icon: TrendingUp, color: "from-pink-500 to-rose-600", sub: "últimos 30 dias" },
    { label: "Categorias", value: stats.byCategory.length, icon: Package, color: "from-teal-500 to-cyan-600", sub: `${stats.byRegion.length} regiões` },
  ];

  const maxRegion = Math.max(...stats.byRegion.map(r => r.count), 1);
  const maxCategory = Math.max(...stats.byCategory.map(c => c.count), 1);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Painel Administrativo</h1>
          <p className="text-sm text-gray-500 mt-1">Visão 360° do Hub Londrina</p>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-black text-gray-800 leading-none">{card.value}</div>
              <div className="text-[11px] font-medium text-gray-500 mt-1">{card.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-gray-800 text-sm">Distribuição por Plano</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Gratuito", value: stats.byPlan.free, color: "bg-gray-400", price: "R$ 0" },
              { label: "Destaque", value: stats.byPlan.destaque, color: "bg-amber-500", price: "R$ 49" },
              { label: "Premium", value: stats.byPlan.premium, color: "bg-emerald-500", price: "R$ 89" },
            ].map((plan) => (
              <div key={plan.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{plan.label}</span>
                  <span className="text-xs text-gray-400">{plan.value} ({Math.round((plan.value / Math.max(stats.totalBusinesses, 1)) * 100)}%)</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full ${plan.color} rounded-full transition-all`}
                    style={{ width: `${Math.max((plan.value / Math.max(stats.totalBusinesses, 1)) * 100, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Conversão paga</span>
            <span className="text-sm font-bold text-emerald-600">
              {Math.round(((stats.byPlan.destaque + stats.byPlan.premium) / Math.max(stats.totalBusinesses, 1)) * 100)}%
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[#6F4E37]" />
            <h3 className="font-bold text-gray-800 text-sm">Por Região</h3>
          </div>
          <div className="space-y-2.5">
            {stats.byRegion.slice(0, 6).map((r) => (
              <div key={r.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{r.name}</span>
                  <span className="text-xs text-gray-400">{r.count}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-[#6F4E37] rounded-full transition-all"
                    style={{ width: `${Math.max((r.count / maxRegion) * 100, 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-gray-800 text-sm">Por Categoria</h3>
          </div>
          <div className="space-y-2.5">
            {stats.byCategory.slice(0, 6).map((c) => (
              <div key={c.slug}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.count}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.max((c.count / maxCategory) * 100, 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-gray-800 text-sm">Top 10 Negócios (por cliques)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">#</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Negócio</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Região</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase">Plano</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase">Cliques</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-400 uppercase">WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {stats.topBusinesses.map((b, i) => (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="py-2 font-medium text-gray-700 max-w-[180px] truncate">{b.name}</td>
                    <td className="py-2 text-gray-500 text-xs">{b.region}</td>
                    <td className="py-2"><PlanBadge plan={b.planType} /></td>
                    <td className="py-2 text-right font-bold text-gray-700">{b.clicks}</td>
                    <td className="py-2 text-right font-bold text-green-600">{b.whatsappClicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-gray-800 text-sm">Últimos Cadastros</h3>
          </div>
          <div className="space-y-3">
            {stats.recentBusinesses.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${b.isVisible ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                  {b.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 truncate">{b.name}</span>
                    <PlanBadge plan={b.planType} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400">{b.region}</span>
                    {b.ownerEmail && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400 truncate">{b.ownerEmail}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0">
                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-gray-800 text-sm">Resumo de Visibilidade</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <div className="text-2xl font-black text-emerald-600">{stats.visibleCount}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Ativos / Visíveis</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl font-black text-gray-500">{stats.hiddenCount}</div>
            <div className="text-xs text-gray-500 font-medium mt-1">Ocultos</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-xl">
            <div className="text-2xl font-black text-amber-600">{stats.byPlan.destaque + stats.byPlan.premium}</div>
            <div className="text-xs text-amber-600 font-medium mt-1">Planos Pagos</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <div className="text-2xl font-black text-blue-600">{stats.totalProducts}</div>
            <div className="text-xs text-blue-600 font-medium mt-1">Produtos Cadastrados</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
