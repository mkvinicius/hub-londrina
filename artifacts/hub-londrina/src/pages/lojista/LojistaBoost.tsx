import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { lojistaFetch, getCategoryBoostPositions, createCategoryBoostCheckout } from "@/lib/lojista-api";
import { Zap, Crown, Flame, MessageCircle, ExternalLink, AlertTriangle, MapPin, Star, CheckCircle2, Clock, Loader2, ImageIcon } from "lucide-react";
import { Link } from "wouter";

interface CategoryPosition {
  position: number;
  price: number;
  occupied: boolean;
  mine: boolean;
  expiresAt: string | null;
}
interface CategoryPositionsResponse {
  plan: string;
  eligible: boolean;
  requiredPlan: string;
  positions: CategoryPosition[];
  currentBoost: { position: number; expiresAt: string | null } | null;
}

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";
const WHATSAPP_NUMBER = "5543999999999";

interface BoostInfo {
  boostType: string;
  position: number | null;
  expiresAt: string | null;
}

interface PositionInfo {
  position: number;
  bid: number;
  occupied: boolean;
}

interface SpecialBoost {
  total: number;
  available: number;
  price: number;
  eligible: boolean;
  requiredPlan: string;
  currentBoost: { status: string; expiresAt: string | null } | null;
}

interface AvailabilityResponse {
  plan: string;
  zone: string | null;
  zoneAvailability: SpecialBoost;
  homeSearchAvailability: SpecialBoost;
}

const ZONE_COLORS: Record<string, string> = {
  norte: "#3d7a28",
  sul: "#2563eb",
  leste: "#d97706",
  oeste: "#7c3aed",
  centro: "#dc2626",
};
const ZONE_LABELS: Record<string, string> = {
  norte: "Norte", sul: "Sul", leste: "Leste", oeste: "Oeste", centro: "Centro",
};

export default function LojistaBoost() {
  const [boost, setBoost] = useState<BoostInfo | null>(null);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<string>("free");
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "info" | "error"; msg: string } | null>(null);
  const [homeBanner, setHomeBanner] = useState<{ id: number; status: string; rejectionReason: string | null; createdAt: string } | null>(null);
  const [bannerCheckoutLoading, setBannerCheckoutLoading] = useState(false);
  const [catPositions, setCatPositions] = useState<CategoryPositionsResponse | null>(null);
  const [catCheckoutLoading, setCatCheckoutLoading] = useState<number | null>(null);

  async function loadAll() {
    try {
      const [profile, posData, avail, hb, cats] = await Promise.all([
        lojistaFetch("/lojista/profile"),
        lojistaFetch("/lojista/boost-positions"),
        lojistaFetch("/lojista/boosts/availability"),
        lojistaFetch("/lojista/home-banner/status").catch(() => ({ banner: null })),
        getCategoryBoostPositions().catch(() => null),
      ]);
      setBoost(profile._boost || null);
      setPositions(posData.positions || []);
      setPlanType(profile.planType || "free");
      setAvailability(avail);
      setHomeBanner(hb?.banner || null);
      setCatPositions(cats);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const isBoostSuccess = params.get("boost_success") === "1";
    const isCatSuccess = params.get("cat_success") === "1";
    const isBannerSuccess = params.get("banner") === "success";
    const anySuccess = isBoostSuccess || isCatSuccess || isBannerSuccess;

    // Limpa a URL antes de qualquer trabalho async (capturamos os flags acima)
    if (params.toString()) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    async function maybeSyncAndShow() {
      if (anySuccess && sessionId) {
        // Banner provisório enquanto sync roda
        setBanner({ type: "info", msg: "Confirmando seu pagamento..." });
        try {
          const r = await lojistaFetch("/lojista/boosts/sync", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
          });
          if (r?.ok) {
            if (r.type === "home_banner") {
              setBanner({ type: "success", msg: "Pagamento confirmado! Sua solicitação de banner Home está em análise pelo admin. Você será notificado quando for aprovada." });
            } else if (r.status === "active") {
              const ctxLabel = r.type === "category" ? `categoria (posição ${r.position}º)` : r.type === "zone" ? "zona" : "Home + Busca";
              setBanner({ type: "success", msg: `Pagamento confirmado! Seu boost de ${ctxLabel} está ATIVO. Verifique seu email.` });
            } else if (r.status === "waitlist") {
              setBanner({ type: "info", msg: "Pagamento confirmado! Você foi colocado na fila de espera (todas as vagas estão ocupadas). Avisaremos quando uma vaga abrir." });
            } else if (r.status === "duplicate") {
              setBanner({ type: "info", msg: "Boost já estava ativo. Nenhuma duplicação foi criada." });
            } else {
              setBanner({ type: "success", msg: "Pagamento confirmado!" });
            }
          } else if (r?.pending) {
            setBanner({ type: "info", msg: "Pagamento ainda processando pelo Stripe. Atualize a página em alguns segundos." });
          } else {
            setBanner({ type: "error", msg: "Pagamento recebido, mas houve um problema na ativação. Atualize a página ou contate o suporte." });
          }
        } catch {
          setBanner({ type: "error", msg: "Pagamento recebido, mas a ativação falhou. Atualize a página ou contate o suporte." });
        }
      } else if (anySuccess) {
        // Fallback (sem session_id na URL — não deve acontecer com fluxo novo)
        setBanner({ type: "success", msg: "Pagamento confirmado! Verifique seu email." });
      } else if (params.get("boost_cancelled") === "1") {
        setBanner({ type: "info", msg: "Pagamento cancelado. Você pode tentar novamente quando quiser." });
      } else if (params.get("cat_cancelled") === "1") {
        setBanner({ type: "info", msg: "Pagamento de boost de categoria cancelado." });
      } else if (params.get("banner") === "cancelled") {
        setBanner({ type: "info", msg: "Pagamento do banner cancelado." });
      }
      await loadAll();
    }

    maybeSyncAndShow();
  }, []);

  async function handleBuyHomeBanner() {
    setBannerCheckoutLoading(true);
    setBanner(null);
    try {
      const res = await lojistaFetch("/lojista/home-banner/checkout", { method: "POST" });
      if (res?.url) { window.location.href = res.url; return; }
      setBanner({ type: "error", msg: res?.error || "Erro ao iniciar o checkout" });
    } catch (e: any) {
      setBanner({ type: "error", msg: e?.message || "Erro de conexão" });
    } finally {
      setBannerCheckoutLoading(false);
    }
  }

  async function handleBuyCategoryBoost(position: number) {
    setCatCheckoutLoading(position);
    setBanner(null);
    try {
      const res = await createCategoryBoostCheckout(position);
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setBanner({ type: "error", msg: "Erro ao iniciar o checkout" });
    } catch (e: any) {
      setBanner({ type: "error", msg: e?.message || "Erro de conexão" });
    } finally {
      setCatCheckoutLoading(null);
    }
  }

  async function handleBuyBoost(boostContext: "zone" | "home_search") {
    setCheckoutLoading(boostContext);
    setBanner(null);
    try {
      const res = await lojistaFetch("/lojista/boosts/checkout", {
        method: "POST",
        body: JSON.stringify({ boostContext }),
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      setBanner({ type: "error", msg: res?.error || "Erro ao iniciar o checkout" });
    } catch (e: any) {
      setBanner({ type: "error", msg: e?.message || "Erro de conexão" });
    } finally {
      setCheckoutLoading(null);
    }
  }

  const ctaUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre o impulsionamento do meu negócio no Hub Londrina.")}`;

  if (loading) {
    return (
      <LojistaLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>
      </LojistaLayout>
    );
  }

  const zoneSlug = availability?.zone || "centro";
  const zoneColor = ZONE_COLORS[zoneSlug] || "#d97706";
  const zoneLabel = ZONE_LABELS[zoneSlug] || zoneSlug;

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 mb-6">
        <Zap className="w-7 h-7 text-[#d97706]" />
        Impulsionamento
      </h1>

      {banner && (
        <div className={`mb-6 rounded-2xl p-4 border flex items-start gap-3 ${
          banner.type === "success" ? "bg-green-50 border-green-200 text-green-800" :
          banner.type === "error" ? "bg-red-50 border-red-200 text-red-800" :
          "bg-blue-50 border-blue-200 text-blue-800"
        }`}>
          {banner.type === "success" ? <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <div className="flex-1 text-sm font-medium">{banner.msg}</div>
          <button onClick={() => setBanner(null)} className="text-current opacity-60 hover:opacity-100 text-sm">×</button>
        </div>
      )}

      {/* ============================================================ */}
      {/* SEÇÃO: DESTAQUES ESPECIAIS                                    */}
      {/* ============================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          Destaques Especiais
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* CARD 1 — DESTAQUE DE ZONA */}
          {availability && (() => {
            const z = availability.zoneAvailability;
            const cur = z.currentBoost;
            return (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: zoneColor + "1a", color: zoneColor }}
                  >
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800">Destaque de Zona</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Apareça em destaque na <strong style={{ color: zoneColor }}>Zona {zoneLabel}</strong> por 30 dias
                    </p>
                  </div>
                </div>

                <div className="mt-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg text-sm flex items-center justify-between">
                  <span className="text-gray-600">Vagas disponíveis</span>
                  <span className="font-bold text-gray-800">
                    {z.available} de {z.total}
                  </span>
                </div>

                <div className="text-3xl font-black text-gray-800 mb-1">
                  R${z.price}
                  <span className="text-sm font-normal text-gray-500">/30 dias</span>
                </div>

                <div className="mt-auto pt-4">
                  {cur && cur.status === "active" ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-bold text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Ativo até {cur.expiresAt ? new Date(cur.expiresAt).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  ) : cur && cur.status === "waitlist" ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-700">
                      <Clock className="w-4 h-4" />
                      Na fila de espera
                    </div>
                  ) : !z.eligible ? (
                    <div>
                      <button
                        type="button"
                        disabled
                        title="Exclusivo para os planos Destaque e Premium"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl cursor-not-allowed opacity-70"
                      >
                        Comprar destaque — R${z.price}
                      </button>
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        Exclusivo para os planos <strong>Destaque</strong> e <strong>Premium</strong>.{" "}
                        <Link href="/lojista/plano" className="font-bold underline hover:no-underline">Ver planos</Link>
                      </p>
                    </div>
                  ) : z.available > 0 ? (
                    <button
                      onClick={() => handleBuyBoost("zone")}
                      disabled={checkoutLoading === "zone"}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-60 ${BTN_ELEVATION}`}
                    >
                      {checkoutLoading === "zone" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Comprar destaque — R${z.price}</>}
                    </button>
                  ) : (
                    <div>
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                        Todas as vagas estao ocupadas. Ao comprar, voce entra na fila e sera ativado automaticamente quando uma vaga abrir.
                      </p>
                      <button
                        onClick={() => handleBuyBoost("zone")}
                        disabled={checkoutLoading === "zone"}
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-60 ${BTN_ELEVATION}`}
                      >
                        {checkoutLoading === "zone" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-4 h-4" />Entrar na lista de espera</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* CARD 2 — DESTAQUE HOME + BUSCA */}
          {availability && (() => {
            const h = availability.homeSearchAvailability;
            const cur = h.currentBoost;
            return (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100 text-amber-600">
                    <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-800">Destaque Home + Busca</h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Apareça na home principal e em todas as buscas por 30 dias
                    </p>
                  </div>
                </div>

                <div className="mt-2 mb-4 px-3 py-2 bg-white/60 rounded-lg text-sm flex items-center justify-between">
                  <span className="text-gray-600">Vagas disponíveis</span>
                  <span className="font-bold text-gray-800">
                    {h.available} de {h.total}
                  </span>
                </div>

                <div className="text-3xl font-black text-gray-800 mb-1">
                  R${h.price}
                  <span className="text-sm font-normal text-gray-500">/30 dias</span>
                </div>

                <div className="mt-auto pt-4">
                  {cur && cur.status === "active" ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-bold text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Ativo até {cur.expiresAt ? new Date(cur.expiresAt).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  ) : cur && cur.status === "waitlist" ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-100 border border-amber-300 rounded-xl text-sm font-bold text-amber-800">
                      <Clock className="w-4 h-4" />
                      Na fila de espera
                    </div>
                  ) : !h.eligible ? (
                    <div>
                      <button
                        type="button"
                        disabled
                        title="Exclusivo para o plano Premium"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-500 bg-gray-200 rounded-xl cursor-not-allowed opacity-70"
                      >
                        Comprar destaque — R${h.price}
                      </button>
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                        Exclusivo para o plano <strong>Premium</strong>.{" "}
                        <Link href="/lojista/plano" className="font-bold underline hover:no-underline">Ver planos</Link>
                      </p>
                    </div>
                  ) : h.available > 0 ? (
                    <button
                      onClick={() => handleBuyBoost("home_search")}
                      disabled={checkoutLoading === "home_search"}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-60 ${BTN_ELEVATION}`}
                    >
                      {checkoutLoading === "home_search" ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Comprar destaque — R${h.price}</>}
                    </button>
                  ) : (
                    <div>
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                        Todas as vagas estao ocupadas. Ao comprar, voce entra na fila e sera ativado automaticamente quando uma vaga abrir.
                      </p>
                      <button
                        onClick={() => handleBuyBoost("home_search")}
                        disabled={checkoutLoading === "home_search"}
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-60 ${BTN_ELEVATION}`}
                      >
                        {checkoutLoading === "home_search" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-4 h-4" />Entrar na fila de espera</>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ===== BANNER HOME (R$299/mês) — Modelo C: compra → análise admin ===== */}
        <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#d97706]/10">
              <ImageIcon className="w-6 h-6 text-[#d97706]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-base">Banner na Home</h3>
              <p className="text-xs text-gray-500 mt-0.5">Apareça em destaque na página inicial • máx. 2 lojistas simultâneos</p>
            </div>
            <span className="text-lg font-black text-[#d97706] whitespace-nowrap">R$299/mês</span>
          </div>

          {homeBanner && homeBanner.status === "pending_review" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm text-amber-800">
              <Clock className="w-4 h-4 flex-shrink-0" />
              Sua solicitação está em análise pelo admin (enviada em {new Date(homeBanner.createdAt).toLocaleDateString("pt-BR")}).
            </div>
          )}
          {homeBanner && homeBanner.status === "active" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Seu banner está ativo na Home!
            </div>
          )}
          {homeBanner && homeBanner.status === "rejected" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm text-red-800">
              <p className="font-semibold">Banner rejeitado</p>
              {homeBanner.rejectionReason && <p className="text-xs mt-1">{homeBanner.rejectionReason}</p>}
            </div>
          )}

          {(!homeBanner || homeBanner.status === "rejected" || homeBanner.status === "expired") && (
            planType !== "premium" ? (
              <div>
                <button
                  type="button"
                  disabled
                  title="Exclusivo para o plano Premium"
                  className="w-full bg-gray-200 text-gray-500 font-bold px-4 py-2.5 rounded-xl text-sm cursor-not-allowed opacity-70 flex items-center justify-center gap-2"
                >
                  Comprar banner — R$299/mês
                </button>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  Exclusivo para o plano <strong>Premium</strong>.{" "}
                  <Link href="/lojista/plano" className="font-bold underline hover:no-underline">Ver planos</Link>
                </p>
              </div>
            ) : (
              <button
                onClick={handleBuyHomeBanner}
                disabled={bannerCheckoutLoading}
                className={`w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${BTN_ELEVATION}`}
              >
                {bannerCheckoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Comprar banner — R$299/mês</>}
              </button>
            )
          )}

          <p className="text-[11px] text-gray-400 mt-2">
            Após o pagamento, sua solicitação fica em análise. O admin aprova banners que respeitam as diretrizes de imagem e conteúdo.
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SEÇÃO ORIGINAL: BOOST MENSAL E AVULSO (mantida)               */}
      {/* ============================================================ */}
      <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-[#d97706]" />
        Boost na busca por categoria
      </h2>

      {planType !== "premium" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Recurso exclusivo do plano Premium</p>
            <p className="text-sm text-amber-700 mt-1">
              O impulsionamento na busca por categoria está disponível apenas para negócios com plano Premium.
            </p>
            <Link
              href="/lojista/plano"
              className="inline-flex items-center gap-2 mt-3 text-sm font-bold text-[#d97706] hover:text-[#b45309] transition-colors"
            >
              Ver Planos
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {boost ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            {boost.boostType === "monthly" ? (
              <Crown className="w-8 h-8 text-amber-600" />
            ) : (
              <Flame className="w-8 h-8 text-orange-500" />
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-800">Seu boost está ativo!</h2>
              <p className="text-sm text-gray-600">
                {boost.boostType === "monthly"
                  ? `Posição #${boost.position} — Mensal`
                  : `Boost avulso — expira em ${boost.expiresAt ? new Date(boost.expiresAt).toLocaleDateString("pt-BR") : "—"}`
                }
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Seu negócio aparece em destaque na busca. Para alterar ou renovar, entre em contato:
          </p>
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 mt-4 px-5 py-2.5 text-sm font-bold text-white bg-[#4CAF50] hover:bg-[#3d8c40] rounded-xl ${BTN_ELEVATION}`}
          >
            <MessageCircle className="w-4 h-4" />
            Falar no WhatsApp
          </a>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-gray-800">Boost de Categoria</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                5 posições mensais por categoria. Compra direta no cartão (Premium).
              </p>
            </div>
          </div>

          {catPositions && !catPositions.eligible && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              Boost de categoria é exclusivo para o plano <strong>Premium</strong>.{" "}
              <Link href="/lojista/plano" className="font-bold underline hover:no-underline">Ver planos</Link>
            </div>
          )}

          {catPositions?.currentBoost && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Você ocupa a <strong>{catPositions.currentBoost.position}ª posição</strong> até{" "}
              {catPositions.currentBoost.expiresAt
                ? new Date(catPositions.currentBoost.expiresAt).toLocaleDateString("pt-BR")
                : "—"}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Posição</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Preço Mensal</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody>
                {(catPositions?.positions ?? positions.map(p => ({ position: p.position, price: p.bid, occupied: p.occupied, mine: false, expiresAt: null }))).map(p => {
                  const canBuy = catPositions?.eligible && !p.occupied && !catPositions.currentBoost;
                  return (
                    <tr key={p.position} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 font-bold text-gray-700">{p.position}º</td>
                      <td className="px-4 py-2.5 text-gray-700">R${p.price}/mês</td>
                      <td className="px-4 py-2.5">
                        {p.mine ? (
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Sua</span>
                        ) : p.occupied ? (
                          <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Ocupada</span>
                        ) : (
                          <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Livre</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canBuy ? (
                          <button
                            onClick={() => handleBuyCategoryBoost(p.position)}
                            disabled={catCheckoutLoading === p.position}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-lg disabled:opacity-60"
                          >
                            {catCheckoutLoading === p.position
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <>Comprar</>}
                          </button>
                        ) : catPositions && !catPositions.eligible && !p.occupied ? (
                          <button
                            type="button"
                            disabled
                            title="Exclusivo para o plano Premium"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-200 rounded-lg cursor-not-allowed opacity-70"
                          >
                            Comprar
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mt-8 mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Boost Avulso
          </h3>
          <div className="bg-gray-50 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Período</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Preço</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { period: "7 dias", price: "R$29" },
                  { period: "15 dias", price: "R$49" },
                  { period: "30 dias", price: "R$79" },
                ].map(o => (
                  <tr key={o.period} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 text-gray-700">{o.period}</td>
                    <td className="px-4 py-2.5 text-gray-700">{o.price}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Disponível</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl ${BTN_ELEVATION}`}
          >
            <MessageCircle className="w-4 h-4" />
            Fale com a gente para boost avulso
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </LojistaLayout>
  );
}
