import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, getMetrics, getLojistaToken } from "@/lib/lojista-api";
import { Eye, MessageCircle, Phone, FileDown, Loader2 } from "lucide-react";
import { LockedFeature } from "@/components/LockedFeature";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function LojistaMetricas() {
  const [metrics, setMetrics] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  useEffect(() => {
    async function load() {
      try {
        const p = await getProfile();
        setProfile(p);
        if (p.planType !== "free") {
          const m = await getMetrics();
          setMetrics(m);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const token = getLojistaToken();
      const res = await fetch(`${API_BASE}/api/lojista/report/pdf?month=${selectedMonth}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao gerar relatório");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hub-londrina-relatorio-${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setPdfError(e.message || "Erro ao baixar relatório");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  if (profile?.planType === "free") {
    return (
      <LojistaLayout>
        <h1 className="text-2xl font-black text-gray-800 mb-6">Métricas</h1>
        <LockedFeature planRequired="destaque" currentPlan="free" message="Métricas disponíveis no plano Destaque ou superior">
          <div />
        </LockedFeature>
      </LojistaLayout>
    );
  }

  if (error || !metrics) {
    return <LojistaLayout><p className="text-red-500">Erro ao carregar métricas.</p></LojistaLayout>;
  }

  const isPremium = profile?.planType === "premium";

  const cards = [
    { label: "Visualizações do Perfil", value: metrics.totalClicks, icon: Eye, color: "bg-blue-600" },
    { label: "Cliques no WhatsApp", value: metrics.whatsappClicks, icon: MessageCircle, color: "bg-green-600" },
    { label: "Cliques no Telefone", value: metrics.phoneClicks, icon: Phone, color: "bg-purple-600" },
  ];

  const last30 = metrics.last30Days || [];
  const maxClicks = Math.max(...last30.map((d: any) => d.clicks), 1);

  return (
    <LojistaLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-black text-gray-800">Métricas</h1>

        {isPremium && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              max={getCurrentMonth()}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#d97706]/30"
            />
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex items-center justify-center gap-2 bg-[#d97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              {pdfLoading ? "Gerando PDF..." : "Baixar Relatório PDF"}
            </button>
          </div>
        )}
      </div>

      {pdfError && (
        <div className="mb-4 rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {pdfError}
        </div>
      )}

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

      <LockedFeature planRequired="premium" currentPlan={profile?.planType || "destaque"} inline message="Gráfico de cliques disponível no plano Premium">
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
      </LockedFeature>
    </LojistaLayout>
  );
}
