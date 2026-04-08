import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { getStats } from "@/lib/admin-api";
import { Store, MousePointerClick, MessageCircle, TrendingUp } from "lucide-react";

interface Stats {
  totalBusinesses: number;
  byPlan: { free: number; destaque: number; premium: number };
  totalClicks: number;
  totalWhatsappClicks: number;
  recentSignups: number;
  byZone: Record<string, number>;
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
        <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
      </AdminLayout>
    );
  }

  if (!stats) return <AdminLayout><p>Erro ao carregar dados.</p></AdminLayout>;

  const cards = [
    { label: "Total de Negócios", value: stats.totalBusinesses, icon: Store, color: "bg-[#d97706]" },
    { label: "Cliques no Perfil", value: stats.totalClicks, icon: MousePointerClick, color: "bg-blue-600" },
    { label: "Cliques no WhatsApp", value: stats.totalWhatsappClicks, icon: MessageCircle, color: "bg-green-600" },
    { label: "Cadastros (30 dias)", value: stats.recentSignups, icon: TrendingUp, color: "bg-purple-600" },
  ];

  const maxZone = Math.max(...Object.values(stats.byZone), 1);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{card.label}</span>
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-800">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Por Plano</h3>
          <div className="space-y-3">
            {[
              { label: "Gratuito", value: stats.byPlan.free, color: "bg-gray-400" },
              { label: "Destaque", value: stats.byPlan.destaque, color: "bg-[#d97706]" },
              { label: "Premium", value: stats.byPlan.premium, color: "bg-green-600" },
            ].map((plan) => (
              <div key={plan.label} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 w-24">{plan.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full ${plan.color} rounded-full flex items-center justify-end pr-2 transition-all`}
                    style={{ width: `${Math.max((plan.value / Math.max(stats.totalBusinesses, 1)) * 100, 8)}%` }}
                  >
                    <span className="text-xs font-bold text-white">{plan.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Por Zona</h3>
          <div className="space-y-3">
            {Object.entries(stats.byZone).map(([zone, count]) => (
              <div key={zone} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 w-24 capitalize">{zone}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full bg-[#6F4E37] rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max((count / maxZone) * 100, 8)}%` }}
                  >
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
