import { useEffect, useRef, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, getMetrics, lojistaFetch } from "@/lib/lojista-api";
import { Eye, MessageCircle, Phone, AlertTriangle, Zap, ArrowRight, Clock, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Link } from "wouter";

type PaymentStatus = "idle" | "syncing" | "success" | "failed";

// Captura UMA VEZ na carga do módulo — antes de qualquer re-render do React.
// Evita que `window.history.replaceState` (que limpa a URL) faça o useEffect
// reavaliar deps e disparar cleanup prematuro.
const INITIAL_PAYMENT_INFO = (() => {
  if (typeof window === "undefined") return { isSuccess: false, sessionId: null as string | null };
  const search = window.location.search;
  const params = new URLSearchParams(search);
  return {
    isSuccess: params.get("payment") === "success",
    sessionId: params.get("session_id"),
  };
})();

export default function LojistaDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    INITIAL_PAYMENT_INFO.isSuccess ? "syncing" : "idle"
  );
  const syncStartedRef = useRef(false);

  useEffect(() => {
    Promise.all([getProfile(), getMetrics()])
      .then(([p, m]) => { setProfile(p); setMetrics(m); })
      .finally(() => setLoading(false));
  }, []);

  // Pós-checkout: sincroniza com Stripe imediatamente (não depende do webhook).
  // Roda APENAS UMA VEZ por montagem do componente, com deps vazias e flag de guard.
  useEffect(() => {
    if (!INITIAL_PAYMENT_INFO.isSuccess) return;
    if (syncStartedRef.current) return;
    syncStartedRef.current = true;

    const sessionId = INITIAL_PAYMENT_INFO.sessionId;

    // Limpar query string DEPOIS de capturar os valores
    window.history.replaceState({}, "", "/lojista");

    let cancelled = false;

    async function syncAndVerify() {
      let syncOk = false;
      let syncedPlan: string | null = null;

      // 1) Sincronizar imediatamente via Stripe API (response confiável)
      try {
        const result = await lojistaFetch("/lojista/stripe/sync", {
          method: "POST",
          body: JSON.stringify({ sessionId }),
        });
        if (result?.ok && result?.planType && result.planType !== "free") {
          syncOk = true;
          syncedPlan = result.planType;
        }
      } catch {}

      if (cancelled) return;

      // 2) Recarregar profile sempre (mesmo se sync falhou — webhook pode ter rodado)
      try {
        const p = await getProfile();
        if (cancelled) return;
        setProfile(p);
        if (p?.planType && p.planType !== "free") {
          setPaymentStatus("success");
          return;
        }
      } catch {}

      if (cancelled) return;

      // 3) Fallback: polling caso ainda não tenha refletido
      const MAX_ATTEMPTS = 6;
      const INTERVAL_MS = 2500;
      async function poll(attempt: number) {
        if (cancelled) return;
        try {
          const p = await getProfile();
          if (cancelled) return;
          setProfile(p);
          if (p?.planType && p.planType !== "free") {
            setPaymentStatus("success");
            return;
          }
        } catch {}
        if (attempt < MAX_ATTEMPTS && !cancelled) {
          setTimeout(() => poll(attempt + 1), INTERVAL_MS);
        } else if (!cancelled) {
          // Se o sync confirmou mas profile ainda não atualizou — provavelmente cache; tratar como sucesso parcial.
          // Se nem o sync confirmou — algo realmente falhou, mostrar erro.
          setPaymentStatus(syncOk ? "success" : "failed");
        }
      }
      setTimeout(() => poll(1), 2000);
    }

    syncAndVerify();
    return () => { cancelled = true; };
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

  const currentPlanLabel = planLabels[profile?.planType] || profile?.planType || "Gratuito";

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Dashboard</h1>

      {/* Banner de status do pagamento Stripe */}
      {paymentStatus === "syncing" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-sm">Confirmando seu pagamento...</p>
              <p className="text-emerald-700 text-xs mt-0.5">Aguarde alguns segundos enquanto processamos a confirmação.</p>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === "success" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-sm">Plano {currentPlanLabel} ativado com sucesso! 🎉</p>
              <p className="text-emerald-700 text-xs mt-0.5">Seu negócio já conta com todos os benefícios do novo plano.</p>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm">Pagamento recebido, mas a ativação está demorando</p>
              <p className="text-amber-700 text-xs mt-0.5">
                O Stripe confirmou seu pagamento mas o sistema ainda não refletiu o novo plano. Atualize a página em alguns segundos. Se o problema persistir, entre em contato pelo suporte.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-xs font-bold text-amber-900 underline hover:text-amber-700"
              >
                Atualizar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner período de documentação */}
      {profile?._documentationStatus === "pending" && profile?.isVisible === false && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 text-sm mb-1">
                {profile._documentationDaysLeft > 0
                  ? `Seu negócio será publicado em ${profile._documentationDaysLeft} dia${profile._documentationDaysLeft !== 1 ? "s" : ""}`
                  : "Seu negócio será publicado em breve"}
              </h3>
              <p className="text-blue-700 text-xs">
                Use esse período para completar seu perfil — adicione logo, fotos e descrição. Após esse prazo, seu negócio aparece automaticamente no diretório público.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <span className="text-sm text-gray-500">
                {(() => {
                  const z = profile?.zone || profile?.region;
                  return z ? `Zona ${String(z).charAt(0).toUpperCase()}${String(z).slice(1)}` : "Zona não definida";
                })()}
              </span>
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

      {profile?._boost ? (
        <div className="bg-gradient-to-r from-amber-500 to-[#d97706] rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {profile._boost.boostType === "monthly"
                  ? `Patrocinado — Posição #${profile._boost.position}`
                  : "Boost Avulso Ativo"}
              </h3>
              <p className="text-xs text-white/80">
                {profile._boost.expiresAt
                  ? `Seu negócio está no topo da busca até ${new Date(profile._boost.expiresAt).toLocaleDateString("pt-BR")}`
                  : "Seu negócio está no topo da busca (plano mensal)"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-800">Impulsionamento</h3>
                <p className="text-xs text-gray-500">Apareça em primeiro na busca</p>
              </div>
            </div>
            <Link
              href="/lojista/boost"
              className="flex items-center gap-1.5 text-sm font-bold text-[#d97706] hover:text-[#b45309] whitespace-nowrap transition-colors"
            >
              Ver opções
              <ArrowRight className="w-4 h-4" />
            </Link>
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
