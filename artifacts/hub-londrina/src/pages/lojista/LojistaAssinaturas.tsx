import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getSubscriptions, createPortalSession } from "@/lib/lojista-api";
import { Link } from "wouter";
import {
  CreditCard, Zap, Layout, CheckCircle2, Clock, AlertCircle,
  XCircle, ArrowRight, RefreshCw, ExternalLink
} from "lucide-react";

interface PlanData {
  key: string;
  label: string;
  price: string;
  features: string[];
  status: string;
  renewsAt: string | null;
  daysUntilRenewal: number | null;
  cancelAtPeriodEnd: boolean;
}

interface BoostData {
  status: string;
  zone?: string;
  expiresAt: string | null;
  daysLeft: number | null;
  price: string;
  label: string;
}

interface BannerData {
  status: string;
  endsAt: string | null;
  daysLeft: number | null;
  rejectionReason?: string | null;
  price: string;
  label: string;
}

interface SubscriptionsData {
  plan: PlanData;
  zoneBoost: BoostData | null;
  homeBoost: BoostData | null;
  homeBanner: BannerData | null;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active: { label: "Ativo", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    trialing: { label: "Trial", cls: "bg-blue-100 text-blue-700", icon: <Clock className="w-3.5 h-3.5" /> },
    waitlist: { label: "Na fila", cls: "bg-amber-100 text-amber-700", icon: <Clock className="w-3.5 h-3.5" /> },
    pending_review: { label: "Em análise", cls: "bg-yellow-100 text-yellow-700", icon: <Clock className="w-3.5 h-3.5" /> },
    past_due: { label: "Pagamento pendente", cls: "bg-red-100 text-red-700", icon: <AlertCircle className="w-3.5 h-3.5" /> },
    canceled: { label: "Cancelado", cls: "bg-gray-100 text-gray-500", icon: <XCircle className="w-3.5 h-3.5" /> },
    rejected: { label: "Rejeitado", cls: "bg-red-100 text-red-700", icon: <XCircle className="w-3.5 h-3.5" /> },
    free: { label: "Gratuito", cls: "bg-gray-100 text-gray-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  };
  const info = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${info.cls}`}>
      {info.icon}
      {info.label}
    </span>
  );
}

function DaysBar({ days, max = 30 }: { days: number | null; max?: number }) {
  if (days === null) return null;
  const pct = Math.min(100, Math.max(0, (days / max) * 100));
  const color = days <= 1 ? "bg-red-500" : days <= 7 ? "bg-amber-400" : "bg-green-500";
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Tempo restante</span>
        <span className={`text-xs font-bold ${days <= 1 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-green-700"}`}>
          {days === 0 ? "Vence hoje" : `${days} dia${days === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function LojistaAssinaturas() {
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    getSubscriptions()
      .then((d: SubscriptionsData) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <LojistaLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
      </LojistaLayout>
    );
  }

  if (!data) {
    return (
      <LojistaLayout>
        <div className="text-center text-gray-500 mt-20">Não foi possível carregar as assinaturas.</div>
      </LojistaLayout>
    );
  }

  const plan = data.plan;
  const planColors: Record<string, string> = {
    free: "border-gray-200",
    destaque: "border-[#d97706]",
    premium: "border-green-500",
  };
  const planBg: Record<string, string> = {
    free: "from-gray-50 to-white",
    destaque: "from-amber-50 to-white",
    premium: "from-green-50 to-white",
  };

  return (
    <LojistaLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black text-gray-800 mb-1">Minhas Assinaturas</h1>
        <p className="text-sm text-gray-500 mb-8">Acompanhe tudo que está ativo e quanto tempo falta para renovar.</p>

        {/* ── Plano ────────────────────────────────────────── */}
        <section className="mb-6">
          <div className={`bg-gradient-to-br ${planBg[plan.key] ?? "from-gray-50 to-white"} rounded-2xl border-2 ${planColors[plan.key] ?? "border-gray-200"} p-6 shadow-sm`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <CreditCard className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Plano atual</p>
                  <h2 className="text-xl font-black text-gray-800">{plan.label}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={plan.status} />
                {plan.cancelAtPeriodEnd && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-semibold">Cancelamento agendado</span>
                )}
              </div>
            </div>

            {plan.key !== "free" && (
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            )}

            {plan.renewsAt && (
              <div className="mt-4 pt-4 border-t border-black/5">
                <p className="text-sm text-gray-500">
                  {plan.cancelAtPeriodEnd ? "Acesso até" : "Próxima cobrança"}:{" "}
                  <span className="font-semibold text-gray-700">{formatDate(plan.renewsAt)}</span>
                </p>
                {!plan.cancelAtPeriodEnd && (
                  <DaysBar days={plan.daysUntilRenewal} max={365} />
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {plan.key === "free" ? (
                <Link
                  href="/lojista/plano"
                  className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  Assinar um plano
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {portalLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Gerenciar assinatura
                </button>
              )}
              {plan.key === "destaque" && (
                <Link
                  href="/lojista/plano"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
                >
                  Fazer upgrade para Premium
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Boosts ───────────────────────────────────────── */}
        <h2 className="text-base font-bold text-gray-700 mb-3 mt-6">Impulsionamentos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Zone boost */}
          <div className={`bg-white rounded-2xl border ${data.zoneBoost ? "border-amber-200" : "border-gray-100"} p-5 shadow-sm`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data.zoneBoost ? "bg-amber-100" : "bg-gray-100"}`}>
                <Zap className={`w-4 h-4 ${data.zoneBoost ? "text-amber-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Destaque de Zona</p>
                <p className="text-sm font-bold text-gray-800">R$79 / 30 dias</p>
              </div>
            </div>

            {data.zoneBoost ? (
              <>
                <div className="flex items-center justify-between">
                  <StatusBadge status={data.zoneBoost.status} />
                  {data.zoneBoost.zone && (
                    <span className="text-xs text-gray-500 capitalize">Zona {data.zoneBoost.zone}</span>
                  )}
                </div>
                {data.zoneBoost.expiresAt && (
                  <p className="text-xs text-gray-500 mt-2">Vence em {formatDate(data.zoneBoost.expiresAt)}</p>
                )}
                <DaysBar days={data.zoneBoost.daysLeft} max={30} />
                {data.zoneBoost.daysLeft !== null && data.zoneBoost.daysLeft <= 7 && (
                  <Link
                    href="/lojista/boost"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    Renovar antes que expire <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  {plan.key === "free"
                    ? "Disponível a partir do plano Base."
                    : "Apareça em primeiro na sua zona por 30 dias."}
                </p>
                <Link
                  href="/lojista/boost"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  {plan.key === "free" ? "Ver planos" : "Ativar agora"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Home+Busca boost */}
          <div className={`bg-white rounded-2xl border ${data.homeBoost ? "border-amber-200" : "border-gray-100"} p-5 shadow-sm`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data.homeBoost ? "bg-amber-100" : "bg-gray-100"}`}>
                <Zap className={`w-4 h-4 ${data.homeBoost ? "text-amber-600" : "text-gray-400"}`} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Destaque Home + Busca</p>
                <p className="text-sm font-bold text-gray-800">R$149 / 30 dias</p>
              </div>
            </div>

            {data.homeBoost ? (
              <>
                <StatusBadge status={data.homeBoost.status} />
                {data.homeBoost.expiresAt && (
                  <p className="text-xs text-gray-500 mt-2">Vence em {formatDate(data.homeBoost.expiresAt)}</p>
                )}
                <DaysBar days={data.homeBoost.daysLeft} max={30} />
                {data.homeBoost.daysLeft !== null && data.homeBoost.daysLeft <= 7 && (
                  <Link
                    href="/lojista/boost"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
                  >
                    Renovar antes que expire <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mb-3">
                  {plan.key !== "premium"
                    ? "Exclusivo para o plano Premium."
                    : "Destaque simultâneo na Home e na busca por 30 dias."}
                </p>
                <Link
                  href={plan.key !== "premium" ? "/lojista/plano" : "/lojista/boost"}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  {plan.key !== "premium" ? "Ver plano Premium" : "Ativar agora"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Banner Home ──────────────────────────────────── */}
        <h2 className="text-base font-bold text-gray-700 mb-3">Banner na Home</h2>
        <div className={`bg-white rounded-2xl border ${data.homeBanner ? "border-purple-200" : "border-gray-100"} p-5 shadow-sm`}>
          <div className="flex items-start gap-4 flex-wrap">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${data.homeBanner ? "bg-purple-100" : "bg-gray-100"}`}>
              <Layout className={`w-4 h-4 ${data.homeBanner ? "text-purple-600" : "text-gray-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-sm font-bold text-gray-800">Banner na Home</p>
                <span className="text-xs text-gray-400">R$299/mês</span>
              </div>

              {data.homeBanner ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <StatusBadge status={data.homeBanner.status} />
                  </div>
                  {data.homeBanner.status === "pending_review" && (
                    <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-2">
                      Sua solicitação está em análise pela equipe Hub Londrina. Você receberá um email com o resultado em até 24h.
                    </p>
                  )}
                  {data.homeBanner.status === "rejected" && data.homeBanner.rejectionReason && (
                    <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                      Motivo da rejeição: {data.homeBanner.rejectionReason}
                    </p>
                  )}
                  {data.homeBanner.status === "active" && data.homeBanner.endsAt && (
                    <>
                      <p className="text-xs text-gray-500">Ativo até {formatDate(data.homeBanner.endsAt)}</p>
                      <DaysBar days={data.homeBanner.daysLeft} max={30} />
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-gray-500">
                    Apareça como banner de destaque no topo da página inicial do Hub Londrina. Sujeito a aprovação.
                  </p>
                  <Link
                    href="/lojista/boost"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-700 whitespace-nowrap"
                  >
                    Solicitar banner
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Nota de lembretes ──────────────────────────── */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
          <p className="text-sm text-blue-700">
            Você receberá lembretes por email 7 dias e 1 dia antes de cada vencimento.
          </p>
        </div>
      </div>
    </LojistaLayout>
  );
}
