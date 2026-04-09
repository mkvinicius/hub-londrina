import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LojistaLayout } from "./LojistaLayout";
import {
  getProfile, getStripeConfig, getSubscription,
  createCheckoutSession, createPortalSession,
} from "@/lib/lojista-api";
import { Check, X, Lock, Zap, Crown, Star, AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

interface Profile { planType: string; name: string }
interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripePriceId: string | null;
}
interface StripeConfig {
  prices: {
    base_monthly: string;
    base_annual: string;
    premium_monthly: string;
    premium_annual: string;
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function LojistaPlano() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [location] = useLocation();

  const isSuccess = location.includes("success=1");
  const isCancelled = location.includes("cancelled=1");

  useEffect(() => {
    Promise.all([
      getProfile(),
      getSubscription().catch(() => null),
      getStripeConfig().catch(() => null),
    ]).then(([p, s, c]) => {
      setProfile(p);
      setSub(s);
      setConfig(c);
    }).finally(() => setLoading(false));
  }, []);

  const currentPlan = profile?.planType || "free";
  const planOrder = ["free", "destaque", "premium"];
  const currentIndex = planOrder.indexOf(currentPlan);

  const prices = config?.prices;

  const PLANS = [
    {
      key: "free",
      label: "Gratuito",
      monthlyPrice: "R$0",
      annualPrice: "R$0",
      annualNote: "",
      color: "border-gray-200",
      badge: "bg-gray-100 text-gray-600",
      icon: Lock,
      priceIdMonthly: null,
      priceIdAnnual: null,
      features: [
        { label: "Perfil na plataforma", ok: true },
        { label: "Botão WhatsApp", ok: true },
        { label: "Endereço no mapa", ok: true },
        { label: "1 foto na galeria", ok: true },
        { label: "Logo e banner", ok: false },
        { label: "Instagram / Website", ok: false },
        { label: "Métricas de cliques", ok: false },
        { label: "Vitrine de produtos", ok: false },
        { label: "Prioridade na busca", ok: false },
      ],
    },
    {
      key: "destaque",
      label: "Base",
      monthlyPrice: "R$59,90",
      annualPrice: "R$49,90",
      annualNote: "R$598,80/ano",
      color: "border-[#d97706]",
      badge: "bg-amber-100 text-amber-700",
      icon: Zap,
      priceIdMonthly: prices?.base_monthly ?? null,
      priceIdAnnual: prices?.base_annual ?? null,
      features: [
        { label: "Tudo do Gratuito", ok: true },
        { label: "Até 10 fotos", ok: true },
        { label: "Logo e banner", ok: true },
        { label: "Selo Destaque", ok: true },
        { label: "Instagram / Website", ok: true },
        { label: "Métricas básicas", ok: true },
        { label: "Prioridade na busca", ok: true },
        { label: "Suporte por email", ok: true },
        { label: "Vitrine de produtos", ok: false },
      ],
    },
    {
      key: "premium",
      label: "Premium",
      monthlyPrice: "R$89,90",
      annualPrice: "R$79,90",
      annualNote: "R$958,80/ano",
      color: "border-emerald-500",
      badge: "bg-emerald-100 text-emerald-700",
      icon: Crown,
      priceIdMonthly: prices?.premium_monthly ?? null,
      priceIdAnnual: prices?.premium_annual ?? null,
      features: [
        { label: "Tudo do Base", ok: true },
        { label: "Vitrine de produtos", ok: true },
        { label: "Vídeo de apresentação", ok: true },
        { label: "Destaque na home", ok: true },
        { label: "Métricas avançadas", ok: true },
        { label: "Impulsionamento disponível", ok: true },
        { label: "Suporte WhatsApp VIP", ok: true },
        { label: "Selo Premium", ok: true },
        { label: "Topo garantido na busca", ok: true },
      ],
    },
  ];

  async function handleCheckout(plan: typeof PLANS[0]) {
    const priceId = cycle === "annual" ? plan.priceIdAnnual : plan.priceIdMonthly;
    if (!priceId) return;
    setCheckingOut(plan.key);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || "Erro ao iniciar pagamento");
      setCheckingOut(null);
    }
  }

  async function handlePortal() {
    setOpeningPortal(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || "Erro ao abrir portal");
      setOpeningPortal(false);
    }
  }

  if (loading) {
    return (
      <LojistaLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
      </LojistaLayout>
    );
  }

  const isSubscribed = sub && (sub.status === "active" || sub.status === "trialing");
  const isPastDue = sub?.status === "past_due";

  return (
    <LojistaLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Plano & Assinatura</h1>
        <p className="text-sm text-gray-500 mt-1">
          Você está no plano{" "}
          <span className="font-bold text-[#d97706] capitalize">{currentPlan === "destaque" ? "Base" : currentPlan}</span>
          {currentPlan === "free" && " — faça upgrade para desbloquear mais recursos"}
        </p>
      </div>

      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">Pagamento confirmado!</p>
            <p className="text-sm text-emerald-700">Seu plano foi ativado. Pode levar alguns segundos para atualizar.</p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">Pagamento cancelado. Seu plano atual segue ativo.</p>
        </div>
      )}

      {isPastDue && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-800">Pagamento pendente</p>
            <p className="text-sm text-red-700">Há um problema com seu pagamento. Clique em "Gerenciar assinatura" para resolver.</p>
          </div>
        </div>
      )}

      {isSubscribed && sub && (
        <div className="bg-gradient-to-r from-[#d97706] to-amber-600 rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-lg capitalize">
                  Plano {sub.plan === "destaque" ? "Base" : sub.plan} ativo
                </div>
                {sub.currentPeriodEnd && (
                  <div className="text-white/80 text-sm">
                    {sub.cancelAtPeriodEnd
                      ? `Cancela em ${formatDate(sub.currentPeriodEnd)}`
                      : `Renova em ${formatDate(sub.currentPeriodEnd)}`}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handlePortal}
              disabled={openingPortal}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4" />
              {openingPortal ? "Abrindo..." : "Gerenciar assinatura"}
            </button>
          </div>
        </div>
      )}

      {!isSubscribed && currentPlan === "free" && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className={`text-sm font-bold ${cycle === "monthly" ? "text-gray-800" : "text-gray-400"}`}>Mensal</span>
          <button
            onClick={() => setCycle(c => c === "monthly" ? "annual" : "monthly")}
            className={`relative w-12 h-6 rounded-full transition-colors ${cycle === "annual" ? "bg-[#d97706]" : "bg-gray-300"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${cycle === "annual" ? "translate-x-7" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm font-bold ${cycle === "annual" ? "text-gray-800" : "text-gray-400"}`}>
            Anual
            <span className="ml-1.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">−17%</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrent = plan.key === currentPlan;
          const isUpgrade = i > currentIndex;
          const displayPrice = cycle === "annual" && plan.annualPrice ? plan.annualPrice : plan.monthlyPrice;

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

              {plan.key === "destaque" && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    MAIS POPULAR
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

              <div className="mb-1">
                <span className="text-3xl font-black text-gray-800">{displayPrice}</span>
                <span className="text-gray-400 text-sm">/mês</span>
              </div>
              {cycle === "annual" && plan.annualNote && (
                <p className="text-xs text-gray-400 mb-4">{plan.annualNote} cobrado anualmente</p>
              )}
              {(!plan.annualNote || cycle === "monthly") && <div className="mb-4" />}

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

              {isUpgrade && !isSubscribed && (
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={checkingOut === plan.key || !config}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                    plan.key === "premium"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-[#d97706] hover:bg-[#b45309] text-white"
                  }`}
                >
                  {checkingOut === plan.key
                    ? "Redirecionando..."
                    : `Assinar plano ${plan.label}`}
                </button>
              )}

              {isUpgrade && isSubscribed && sub?.plan !== plan.key && (
                <button
                  onClick={handlePortal}
                  disabled={openingPortal}
                  className="w-full py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Alterar para {plan.label}
                </button>
              )}

              {isCurrent && (
                <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-gray-100 text-gray-500">
                  Plano atual
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
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Regra de degradação
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Se o pagamento não for renovado, o plano volta automaticamente para <strong>Gratuito</strong>.
          Seu perfil continua ativo na plataforma — você não some do Hub Londrina — mas perde os
          recursos pagos (logo, banner, posição na busca, métricas, etc.) até a renovação.
        </p>
      </div>
    </LojistaLayout>
  );
}
