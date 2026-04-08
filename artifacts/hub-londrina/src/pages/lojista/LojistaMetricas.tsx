import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getMetrics } from "@/lib/lojista-api";
import { Eye, MessageCircle, Phone } from "lucide-react";

export default function LojistaMetricas() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetrics().then(setMetrics).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  if (!metrics) return <LojistaLayout><p>Erro ao carregar métricas.</p></LojistaLayout>;

  const cards = [
    { label: "Visualizações do Perfil", value: metrics.totalClicks, icon: Eye, color: "bg-blue-600" },
    { label: "Cliques no WhatsApp", value: metrics.whatsappClicks, icon: MessageCircle, color: "bg-green-600" },
    { label: "Cliques no Telefone", value: metrics.phoneClicks, icon: Phone, color: "bg-purple-600" },
  ];

  const last30 = metrics.last30Days || [];
  const maxClicks = Math.max(...last30.map((d: any) => d.clicks), 1);

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Métricas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Cliques nos últimos 30 dias</h2>
        {last30.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Sem dados no período</p>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {last30.map((d: any, i: number) => {
              const height = Math.max((d.clicks / maxClicks) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {d.date}: {d.clicks} cliques
                  </div>
                  <div
                    className="w-full bg-[#d97706] rounded-t-sm transition-all hover:bg-[#b45309]"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LojistaLayout>
  );
}
