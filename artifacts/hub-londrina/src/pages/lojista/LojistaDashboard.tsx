import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, getMetrics } from "@/lib/lojista-api";
import { Eye, MessageCircle, Phone, AlertTriangle, Zap } from "lucide-react";

export default function LojistaDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProfile(), getMetrics()])
      .then(([p, m]) => { setProfile(p); setMetrics(m); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  const planLabels: Record<string, string> = { free: "Gratuito", destaque: "Destaque", premium: "Premium" };
  const planColors: Record<string, string> = { free: "bg-gray-400", destaque: "bg-[#d97706]", premium: "bg-green-600" };

  const warnings: string[] = [];
  if (!profile?.logoUrl) warnings.push("Adicione uma logo ao seu negócio");
  if (!profile?.photos?.length) warnings.push("Adicione pelo menos uma foto");
  if (!profile?.description || profile.description.length < 20) warnings.push("Complete a descrição do seu negócio");
  if (!profile?.phone && !profile?.whatsapp) warnings.push("Adicione um telefone ou WhatsApp");

  const cards = [
    { label: "Visualizações", value: metrics?.totalClicks ?? 0, icon: Eye, color: "bg-blue-600" },
    { label: "Cliques WhatsApp", value: metrics?.whatsappClicks ?? 0, icon: MessageCircle, color: "bg-green-600" },
    { label: "Cliques Telefone", value: metrics?.phoneClicks ?? 0, icon: Phone, color: "bg-purple-600" },
  ];

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Dashboard</h1>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          {profile?.logoUrl && (
            <img src={profile.logoUrl.startsWith("/") ? `/api${profile.logoUrl}` : profile.logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-800">{profile?.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${planColors[profile?.planType] || "bg-gray-400"}`}>
                {planLabels[profile?.planType] || profile?.planType}
              </span>
              <span className="text-sm text-gray-500 capitalize">Zona {profile?.zone}</span>
            </div>
          </div>
        </div>
      </div>

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

      {profile?.boostedUntil && new Date(profile.boostedUntil) > new Date() ? (
        <div className="bg-gradient-to-r from-amber-500 to-[#d97706] rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Impulsionamento Ativo</h3>
              <p className="text-xs text-white/80">
                Seu negócio está no topo da busca até{" "}
                {new Date(profile.boostedUntil).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800">Impulsionamento</h3>
              <p className="text-xs text-gray-500">
                Nenhum impulsionamento ativo. Fale com o administrador para ativar.
              </p>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">Complete seu perfil</h3>
          </div>
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w} className="text-sm text-amber-700">• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </LojistaLayout>
  );
}
