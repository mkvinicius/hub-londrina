import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile } from "@/lib/lojista-api";
import { Check, X, Lock, Zap, Crown, Star } from "lucide-react";

interface Profile {
  planType: string;
  name: string;
}

const PLANS = [
  {
    key: "free",
    label: "Gratuito",
    price: "R$0",
    period: "/mês",
    color: "border-gray-200",
    badge: "bg-gray-100 text-gray-600",
    icon: Lock,
    cta: null,
    features: [
      { label: "Perfil na plataforma", ok: true },
      { label: "Botão WhatsApp", ok: true },
      { label: "Endereço no mapa", ok: true },
      { label: "1 foto na galeria", ok: true },
      { label: "Logo e banner", ok: false },
      { label: "Selos verificado", ok: false },
      { label: "Avaliações de clientes", ok: false },
      { label: "Instagram / Website", ok: false },
      { label: "Métricas de cliques", ok: false },
      { label: "Vitrine de produtos", ok: false },
      { label: "Relatório PDF", ok: false },
      { label: "Prioridade na busca", ok: false },
    ],
  },
  {
    key: "destaque",
    label: "Destaque",
    price: "R$49",
    period: "/mês",
    color: "border-[#d97706]",
    badge: "bg-amber-100 text-amber-700",
    icon: Zap,
    cta: "Fazer upgrade para Destaque",
    features: [
      { label: "Tudo do Gratuito", ok: true },
      { label: "Até 10 fotos", ok: true },
      { label: "Logo e banner", ok: true },
      { label: "Selo Destaque", ok: true },
      { label: "Avaliações de clientes", ok: true },
      { label: "Instagram / Website", ok: true },
      { label: "Métricas básicas (7/30/90d)", ok: true },
      { label: "Prioridade na busca", ok: true },
      { label: "Suporte por email", ok: true },
      { label: "Vitrine de produtos", ok: false },
      { label: "Relatório PDF", ok: false },
      { label: "Topo garantido na busca", ok: false },
    ],
  },
  {
    key: "premium",
    label: "Premium",
    price: "R$89",
    period: "/mês",
    color: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: Crown,
    cta: "Fazer upgrade para Premium",
    features: [
      { label: "Tudo do Destaque", ok: true },
      { label: "Fotos ilimitadas", ok: true },
      { label: "Vitrine de produtos", ok: true },
      { label: "Vídeo de apresentação", ok: true },
      { label: "Destaque na home", ok: true },
      { label: "Métricas avançadas", ok: true },
      { label: "Comparativo com categoria", ok: true },
      { label: "Relatório mensal PDF", ok: true },
      { label: "Topo garantido na busca", ok: true },
      { label: "Impulsionamento disponível", ok: true },
      { label: "Suporte WhatsApp VIP", ok: true },
      { label: "Selo Premium", ok: true },
    ],
  },
];

export default function LojistaPlano() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then(setProfile).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <LojistaLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
      </LojistaLayout>
    );
  }

  const currentPlan = profile?.planType || "free";
  const planOrder = ["free", "destaque", "premium"];
  const currentIndex = planOrder.indexOf(currentPlan);

  return (
    <LojistaLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Plano & Assinatura</h1>
        <p className="text-sm text-gray-500 mt-1">
          Você está no plano{" "}
          <span className="font-bold text-[#d97706] capitalize">{currentPlan}</span>
          {currentPlan === "free" && " — faça upgrade para desbloquear mais recursos"}
        </p>
      </div>

      {currentPlan !== "free" && (
        <div className="bg-gradient-to-r from-[#d97706] to-amber-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg capitalize">Plano {currentPlan} ativo</div>
              <div className="text-white/80 text-sm">Integração de pagamento em breve</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrent = plan.key === currentPlan;
          const isUpgrade = i > currentIndex;

          return (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl border-2 p-6 shadow-sm relative ${plan.color} ${isCurrent ? "shadow-md" : ""}`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#d97706] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    Plano atual
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 mt-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.badge}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.badge}`}>
                  {plan.label}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-black text-gray-800">{plan.price}</span>
                <span className="text-gray-400 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f.label} className="flex items-center gap-2 text-sm">
                    {f.ok ? (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={f.ok ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              {isUpgrade && plan.cta && (
                <button
                  onClick={() => alert("Integração de pagamento em breve! Em caso de interesse, entre em contato pelo WhatsApp.")}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    plan.key === "premium"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-[#d97706] hover:bg-[#b45309] text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              )}
              {isCurrent && (
                <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-gray-100 text-gray-500">
                  Plano ativo
                </div>
              )}
              {!isUpgrade && !isCurrent && (
                <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-gray-50 text-gray-400">
                  Plano inferior
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4">⚡ Regra de degradação</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Se o pagamento não for renovado, o plano volta automaticamente para <strong>Gratuito</strong>.
          Seu perfil continua ativo na plataforma — você não some do Hub Londrina — mas perde os
          recursos pagos (logo, banner, posição na busca, métricas, etc.) até a renovação.
        </p>
      </div>
    </LojistaLayout>
  );
}
