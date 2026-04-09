import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { lojistaFetch } from "@/lib/lojista-api";
import { Zap, Crown, Flame, MessageCircle, ExternalLink, AlertTriangle } from "lucide-react";
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

export default function LojistaBoost() {
  const [boost, setBoost] = useState<BoostInfo | null>(null);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<string>("free");

  useEffect(() => {
    async function load() {
      try {
        const [profile, posData] = await Promise.all([
          lojistaFetch("/lojista/profile"),
          lojistaFetch("/lojista/boost-positions"),
        ]);
        setBoost(profile._boost || null);
        setPositions(posData.positions || []);
        setPlanType(profile.planType || "free");
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const ctaUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre o impulsionamento do meu negócio no Hub Londrina.")}`;

  if (loading) {
    return (
      <LojistaLayout>
        <div className="flex items-center justify-center py-20 text-gray-400">Carregando...</div>
      </LojistaLayout>
    );
  }

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 mb-6">
        <Zap className="w-7 h-7 text-[#d97706]" />
        Impulsionamento
      </h1>

      {planType !== "premium" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Recurso exclusivo do plano Premium</p>
            <p className="text-sm text-amber-700 mt-1">
              O impulsionamento está disponível apenas para negócios com plano Premium.
              Faça upgrade para impulsionar seu negócio na busca.
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">Apareça em primeiro na busca</h2>
          <p className="text-sm text-gray-600 mb-6">
            Com o impulsionamento, seu negócio aparece antes de todos quando alguém buscar pelo seu serviço em Londrina.
          </p>

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
