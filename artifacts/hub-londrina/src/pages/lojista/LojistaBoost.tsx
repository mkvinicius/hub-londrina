import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { lojistaFetch } from "@/lib/lojista-api";
import { Zap, Crown, Flame, MessageCircle, ExternalLink, AlertTriangle, MapPin, Star, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Link } from "wouter";

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

  async function loadAll() {
    try {
      const [profile, posData, avail] = await Promise.all([
        lojistaFetch("/lojista/profile"),
        lojistaFetch("/lojista/boost-positions"),
        lojistaFetch("/lojista/boosts/availability"),
      ]);
      setBoost(profile._boost || null);
      setPositions(posData.positions || []);
      setPlanType(profile.planType || "free");
      setAvailability(avail);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("boost_success") === "1") {
      setBanner({ type: "success", msg: "Pagamento confirmado! Seu destaque foi ativado (ou colocado na fila se as 6 vagas estavam ocupadas). Verifique seu email." });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("boost_cancelled") === "1") {
      setBanner({ type: "info", msg: "Pagamento cancelado. Você pode tentar novamente quando quiser." });
      window.history.replaceState({}, "", window.location.pathname);
    }
    loadAll();
  }, []);

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
                      <p className="text-xs text-gray-500 mb-2">Disponível a partir do plano Destaque</p>
                      <Link
                        href="/lojista/plano"
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl ${BTN_ELEVATION}`}
                      >
                        Ver planos
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
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
                    <button
                      onClick={() => handleBuyBoost("zone")}
                      disabled={checkoutLoading === "zone"}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-60 ${BTN_ELEVATION}`}
                    >
                      {checkoutLoading === "zone" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-4 h-4" />Entrar na lista de espera</>}
                    </button>
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
                      <p className="text-xs text-gray-600 mb-2">Exclusivo para o plano Premium</p>
                      <Link
                        href="/lojista/plano"
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl ${BTN_ELEVATION}`}
                      >
                        Ver planos
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
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
                    <button
                      onClick={() => handleBuyBoost("home_search")}
                      disabled={checkoutLoading === "home_search"}
                      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-60 ${BTN_ELEVATION}`}
                    >
                      {checkoutLoading === "home_search" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-4 h-4" />Entrar na fila de espera</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
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
        <div className={`bg-white border border-gray-200 rounded-2xl p-6 mb-8 ${planType !== "premium" ? "opacity-60 pointer-events-none" : ""}`}>
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            Posições Mensais
          </h3>
          <div className="bg-gray-50 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Posição</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Preço Mensal</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => (
                  <tr key={p.position} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5 font-bold text-gray-700">{p.position}º</td>
                    <td className="px-4 py-2.5 text-gray-700">R${p.bid}/mês</td>
                    <td className="px-4 py-2.5">
                      {p.occupied ? (
                        <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Ocupado</span>
                      ) : (
                        <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Livre</span>
                      )}
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
            className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl ${BTN_ELEVATION}`}
          >
            <MessageCircle className="w-4 h-4" />
            Fale com a gente para contratar
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

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
            Fale com a gente
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </LojistaLayout>
  );
}
