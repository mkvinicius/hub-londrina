import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { LojistaLayout } from "./LojistaLayout";
import {
  getProfile, getStripeConfig, getSubscription, getSubscriptions,
  createCheckoutSession, createPortalSession, getInvoices,
  type StripeInvoice,
} from "@/lib/lojista-api";
import {
  Check, X, Lock, Zap, Crown, Star, AlertCircle, CheckCircle2, ExternalLink,
  CreditCard, Layout, Clock, XCircle, ArrowRight, RefreshCw, FileText, Download,
} from "lucide-react";

interface Profile { planType: string; name: string }
interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripePriceId: string | null;
}
interface PlanFeature { label: string; included: boolean }
interface PlanInfo {
  key: string;
  label: string;
  monthlyDisplay: string;
  annualDisplay: string;
  annualTotalDisplay: string;
  annualSavings: string;
  features: PlanFeature[];
}
interface StripeConfig {
  prices: {
    base_monthly: string;
    base_annual: string;
    premium_monthly: string;
    premium_annual: string;
  };
  plans?: {
    free: PlanInfo;
    destaque: PlanInfo;
    premium: PlanInfo;
  };
}
interface SubsBoostData {
  status: string;
  zone?: string;
  expiresAt: string | null;
  daysLeft: number | null;
  price: string;
  label: string;
}
interface SubsBannerData {
  status: string;
  endsAt: string | null;
  daysLeft: number | null;
  rejectionReason?: string | null;
  price: string;
  label: string;
}
interface SubsPlanData {
  key: string;
  label: string;
  price: string;
  features: string[];
  status: string;
  renewsAt: string | null;
  daysUntilRenewal: number | null;
  cancelAtPeriodEnd: boolean;
}
interface SubscriptionsData {
  plan: SubsPlanData;
  zoneBoost: SubsBoostData | null;
  homeBoost: SubsBoostData | null;
  homeBanner: SubsBannerData | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
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
      {info.icon}{info.label}
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

function VisaoGeral({
  data, openPortal, portalLoading, planKey,
}: { data: SubscriptionsData; openPortal: () => void; portalLoading: boolean; planKey: string }) {
  const plan = data.plan;
  const planColors: Record<string, string> = { free: "border-gray-200", destaque: "border-[#d97706]", premium: "border-green-500" };
  const planBg: Record<string, string> = { free: "from-gray-50 to-white", destaque: "from-amber-50 to-white", premium: "from-green-50 to-white" };

  return (
    <div>
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

          {plan.key !== "free" && plan.features.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
              {plan.features.map(f => (
                <div key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{f}
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
              {!plan.cancelAtPeriodEnd && <DaysBar days={plan.daysUntilRenewal} max={365} />}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {plan.key !== "free" && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {portalLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Gerenciar assinatura
              </button>
            )}
          </div>
        </div>
      </section>

      <h2 className="text-base font-bold text-gray-700 mb-3 mt-6">Impulsionamentos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                {data.zoneBoost.zone && <span className="text-xs text-gray-500 capitalize">Zona {data.zoneBoost.zone}</span>}
              </div>
              {data.zoneBoost.expiresAt && <p className="text-xs text-gray-500 mt-2">Vence em {formatDate(data.zoneBoost.expiresAt)}</p>}
              <DaysBar days={data.zoneBoost.daysLeft} max={30} />
            </>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-3">{planKey === "free" ? "Disponível a partir do plano Base." : "Apareça em primeiro na sua zona por 30 dias."}</p>
              <Link href="/lojista/boost" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700">
                {planKey === "free" ? "Ver planos" : "Ativar agora"} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        <div className={`bg-white rounded-2xl border ${data.homeBoost ? "border-amber-200" : "border-gray-100"} p-5 shadow-sm`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data.homeBoost ? "bg-amber-100" : "bg-gray-100"}`}>
              <Star className={`w-4 h-4 ${data.homeBoost ? "text-amber-600" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Destaque Home + Busca</p>
              <p className="text-sm font-bold text-gray-800">R$149 / 30 dias</p>
            </div>
          </div>
          {data.homeBoost ? (
            <>
              <StatusBadge status={data.homeBoost.status} />
              {data.homeBoost.expiresAt && <p className="text-xs text-gray-500 mt-2">Vence em {formatDate(data.homeBoost.expiresAt)}</p>}
              <DaysBar days={data.homeBoost.daysLeft} max={30} />
            </>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-3">{planKey !== "premium" ? "Disponível apenas no Premium." : "Topo da home + topo da busca por 30 dias."}</p>
              <Link href="/lojista/boost" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700">
                {planKey !== "premium" ? "Ver planos" : "Ativar agora"} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <h2 className="text-base font-bold text-gray-700 mb-3 mt-6">Banner Home</h2>
      <div className={`bg-white rounded-2xl border ${data.homeBanner ? "border-purple-200" : "border-gray-100"} p-5 shadow-sm mb-6`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${data.homeBanner ? "bg-purple-100" : "bg-gray-100"}`}>
            <Layout className={`w-4 h-4 ${data.homeBanner ? "text-purple-600" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Banner Home</p>
            <p className="text-sm font-bold text-gray-800">R$299 (sob aprovação)</p>
          </div>
        </div>
        {data.homeBanner ? (
          <>
            <StatusBadge status={data.homeBanner.status} />
            {data.homeBanner.status === "pending_review" && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-2">
                Sua solicitação está em análise pela equipe Hub Londrina.
              </p>
            )}
            {data.homeBanner.status === "rejected" && data.homeBanner.rejectionReason && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                Motivo da rejeição: {data.homeBanner.rejectionReason}
              </p>
            )}
            {data.homeBanner.status === "active" && data.homeBanner.endsAt && (
              <>
                <p className="text-xs text-gray-500 mt-2">Ativo até {formatDate(data.homeBanner.endsAt)}</p>
                <DaysBar days={data.homeBanner.daysLeft} max={30} />
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">Apareça como banner de destaque no topo da home. Sujeito a aprovação.</p>
            <Link href="/lojista/boost" className="inline-flex items-center gap-1.5 text-sm font-bold text-purple-600 hover:text-purple-700 whitespace-nowrap">
              Solicitar banner <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      <InvoicesSection />

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <p className="text-sm text-blue-700">Você receberá lembretes por email 7 dias e 1 dia antes de cada vencimento.</p>
      </div>
    </div>
  );
}

// B3 — Histórico de Faturas (Stripe)
function InvoicesSection() {
  const [invoices, setInvoices] = useState<StripeInvoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInvoices()
      .then(res => setInvoices(res.data ?? []))
      .catch(err => setError(err instanceof Error ? err.message : "Erro ao carregar faturas"))
      .finally(() => setLoading(false));
  }, []);

  function fmtMoney(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: (currency || "BRL").toUpperCase() })
        .format((amount || 0) / 100);
    } catch {
      return `R$ ${((amount || 0) / 100).toFixed(2)}`;
    }
  }

  function fmtDate(unix: number) {
    return new Date(unix * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  const STATUS_CLS: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    open: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-600",
    uncollectible: "bg-red-100 text-red-700",
    void: "bg-gray-100 text-gray-500",
  };

  return (
    <>
      <h2 className="text-base font-bold text-gray-700 mb-3 mt-8 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-500" />
        Histórico de Faturas
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-500">Carregando faturas…</p>
        ) : error ? (
          <p className="text-sm text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>
        ) : !invoices || invoices.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma fatura encontrada ainda.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400">
                <tr className="border-b border-gray-100">
                  <th className="text-left font-semibold py-2">Data</th>
                  <th className="text-left font-semibold py-2">Número</th>
                  <th className="text-left font-semibold py-2">Status</th>
                  <th className="text-right font-semibold py-2">Valor</th>
                  <th className="text-right font-semibold py-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-2.5 text-gray-700">{fmtDate(inv.created)}</td>
                    <td className="py-2.5 text-gray-500 font-mono text-xs">{inv.number ?? "—"}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_CLS[inv.status ?? ""] ?? "bg-gray-100 text-gray-600"}`}>
                        {inv.status ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-800">
                      {fmtMoney(inv.amountPaid || inv.amountDue, inv.currency)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {inv.hostedInvoiceUrl && (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver
                          </a>
                        )}
                        {inv.invoicePdf && (
                          <a
                            href={inv.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#d97706] hover:text-[#b45309] px-2 py-1 rounded-lg border border-orange-200 hover:bg-orange-50"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const FALLBACK_PLANS: Record<string, PlanInfo> = {
  free: {
    key: "free", label: "Gratuito",
    monthlyDisplay: "R$0", annualDisplay: "R$0", annualTotalDisplay: "", annualSavings: "",
    features: [
      { label: "Perfil na plataforma", included: true },
      { label: "Botão WhatsApp", included: true },
      { label: "1 foto na galeria", included: true },
      { label: "Logo e banner", included: false },
      { label: "Instagram / Website", included: false },
      { label: "Métricas de cliques", included: false },
      { label: "Vitrine de produtos", included: false },
    ],
  },
  destaque: {
    key: "destaque", label: "Base",
    monthlyDisplay: "R$59,90", annualDisplay: "R$49,90",
    annualTotalDisplay: "R$598,80/ano", annualSavings: "Economize R$120/ano",
    features: [
      { label: "Tudo do Gratuito", included: true },
      { label: "Até 10 fotos", included: true },
      { label: "Logo e banner", included: true },
      { label: "Instagram / Website", included: true },
      { label: "Métricas básicas", included: true },
      { label: "Prioridade na busca", included: true },
    ],
  },
  premium: {
    key: "premium", label: "Premium",
    monthlyDisplay: "R$89,90", annualDisplay: "R$79,90",
    annualTotalDisplay: "R$958,80/ano", annualSavings: "Economize R$120/ano",
    features: [
      { label: "Tudo do plano Base", included: true },
      { label: "Vitrine de produtos", included: true },
      { label: "Vídeo de apresentação", included: true },
      { label: "Boost de categoria disponível", included: true },
      { label: "Métricas avançadas", included: true },
      { label: "Selo Premium", included: true },
    ],
  },
};

const PLAN_VISUAL: Record<string, { color: string; badge: string; icon: typeof Lock }> = {
  free: { color: "border-gray-200", badge: "bg-gray-100 text-gray-600", icon: Lock },
  destaque: { color: "border-[#d97706]", badge: "bg-amber-100 text-amber-700", icon: Zap },
  premium: { color: "border-emerald-500", badge: "bg-emerald-100 text-emerald-700", icon: Crown },
};

export default function LojistaPlano() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [subsData, setSubsData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [tab, setTab] = useState<"overview" | "change">("overview");
  const [location] = useLocation();

  const isSuccess = location.includes("success=1");
  const isCancelled = location.includes("cancelled=1");

  async function reloadData() {
    const [p, s, subs] = await Promise.all([
      getProfile(),
      getSubscription().catch(() => null),
      getSubscriptions().catch(() => null),
    ]);
    setProfile(p);
    setSub(s);
    setSubsData(subs);
    return { p, s };
  }

  useEffect(() => {
    Promise.all([
      getProfile(),
      getSubscription().catch(() => null),
      getStripeConfig().catch(() => null),
      getSubscriptions().catch(() => null),
    ]).then(([p, s, c, subs]) => {
      setProfile(p);
      setSub(s);
      setConfig(c);
      setSubsData(subs);
      const planType = p?.planType || "free";
      setTab(planType === "free" ? "change" : "overview");
    }).finally(() => setLoading(false));
  }, []);

  // When Stripe redirects back with ?success=1, poll until the webhook updates the plan
  useEffect(() => {
    if (!isSuccess) return;

    let cancelled = false;
    const MAX_ATTEMPTS = 10;
    const INTERVAL_MS = 2500;

    async function poll(attempt: number) {
      if (cancelled) return;
      try {
        const { p, s } = await reloadData();
        const planActive = p?.planType && p.planType !== "free";
        const subActive = s && (s.status === "active" || s.status === "trialing");
        if (planActive || subActive) {
          setPolling(false);
          setTab("overview");
          return;
        }
      } catch {}
      if (attempt < MAX_ATTEMPTS && !cancelled) {
        setTimeout(() => poll(attempt + 1), INTERVAL_MS);
      } else {
        setPolling(false);
      }
    }

    setPolling(true);
    setTimeout(() => poll(1), 2000);
    return () => { cancelled = true; };
  }, [isSuccess]);

  const currentPlan = profile?.planType || "free";
  const planOrder = ["free", "destaque", "premium"];
  const currentIndex = planOrder.indexOf(currentPlan);
  const prices = config?.prices;
  const planConfigs = config?.plans ?? FALLBACK_PLANS;

  const PLANS_LIST = (["free", "destaque", "premium"] as const).map(key => {
    const p = planConfigs[key];
    const v = PLAN_VISUAL[key];
    return {
      ...p,
      ...v,
      priceIdMonthly: key === "destaque" ? prices?.base_monthly : key === "premium" ? prices?.premium_monthly : null,
      priceIdAnnual: key === "destaque" ? prices?.base_annual : key === "premium" ? prices?.premium_annual : null,
    };
  });

  async function handleCheckout(plan: typeof PLANS_LIST[number]) {
    const priceId = cycle === "annual" ? plan.priceIdAnnual : plan.priceIdMonthly;
    if (!priceId) return;
    setCheckingOut(plan.key);
    try {
      const { url } = await createCheckoutSession(priceId);
      window.location.href = url;
    } catch (err: any) {
      if (err.redirectToPortal) {
        alert(err.message || "Você já possui uma assinatura ativa. Abrindo portal...");
        setCheckingOut(null);
        await handlePortal();
        return;
      }
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
        </p>
      </div>

      <div className="border-b border-gray-200 mb-6 flex gap-1">
        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            tab === "overview" ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setTab("change")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            tab === "change" ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Mudar Plano
        </button>
      </div>

      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          {polling
            ? <RefreshCw className="w-5 h-5 text-emerald-600 flex-shrink-0 animate-spin" />
            : <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
          <div>
            <p className="font-bold text-emerald-800">Pagamento confirmado!</p>
            <p className="text-sm text-emerald-700">
              {polling
                ? "Aguardando confirmação do pagamento... isso pode levar alguns segundos."
                : "Seu plano foi ativado com sucesso."}
            </p>
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
            <p className="text-sm text-red-700">Há um problema com seu pagamento. Use "Gerenciar assinatura" para resolver.</p>
          </div>
        </div>
      )}

      {tab === "overview" && (
        subsData ? (
          <VisaoGeral data={subsData} openPortal={handlePortal} portalLoading={openingPortal} planKey={currentPlan} />
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500">
            Não foi possível carregar a visão geral. Tente recarregar a página.
          </div>
        )
      )}

      {tab === "change" && (
        <div>
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
            {PLANS_LIST.map((plan, i) => {
              const Icon = plan.icon;
              const isCurrent = plan.key === currentPlan;
              const isUpgrade = i > currentIndex;
              const isDowngrade = i < currentIndex;
              const displayPrice = cycle === "annual" && plan.annualDisplay ? plan.annualDisplay : plan.monthlyDisplay;
              return (
                <div key={plan.key} className={`bg-white rounded-2xl border-2 p-6 shadow-sm relative ${plan.color} ${isCurrent ? "shadow-md" : ""}`}>
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#d97706] text-white text-xs font-bold px-3 py-1 rounded-full shadow">Plano atual</span>
                    </div>
                  )}
                  {plan.key === "destaque" && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">MAIS POPULAR</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3 mt-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.badge}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.badge}`}>{plan.label}</span>
                  </div>
                  <div className="mb-1">
                    <span className="text-3xl font-black text-gray-800">{displayPrice}</span>
                    <span className="text-gray-400 text-sm">/mês</span>
                  </div>
                  {cycle === "annual" && plan.annualTotalDisplay
                    ? <p className="text-xs text-gray-400 mb-4">{plan.annualTotalDisplay} cobrado anualmente</p>
                    : <div className="mb-4" />}
                  <ul className="space-y-2 mb-6">
                    {plan.features.map(f => (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
                        {f.included
                          ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <X className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                  {isUpgrade && !isSubscribed && (
                    <button
                      onClick={() => handleCheckout(plan)}
                      disabled={checkingOut === plan.key || !config}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-60 ${
                        plan.key === "premium" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-[#d97706] hover:bg-[#b45309] text-white"
                      }`}
                    >
                      {checkingOut === plan.key ? "Redirecionando..." : `Assinar plano ${plan.label}`}
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
                    <div className="w-full py-3 rounded-xl font-bold text-sm text-center bg-gray-100 text-gray-500">Plano atual</div>
                  )}
                  {isDowngrade && (
                    isSubscribed ? (
                      <button
                        onClick={handlePortal}
                        disabled={openingPortal}
                        className="w-full py-3 rounded-xl font-bold text-sm border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-60 text-xs"
                      >
                        Fazer downgrade para {plan.label}
                      </button>
                    ) : (
                      <div className="w-full py-3 rounded-xl text-center border border-dashed border-gray-200 text-gray-400 text-xs">
                        Plano inferior ao atual
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />Regra de degradação
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Se o pagamento não for renovado, o plano volta automaticamente para <strong>Gratuito</strong>.
              Seu perfil continua ativo na plataforma — você não some do Hub Londrina — mas perde os recursos pagos
              (logo, banner, posição na busca, métricas, etc.) até a renovação.
            </p>
          </div>
        </div>
      )}
    </LojistaLayout>
  );
}
