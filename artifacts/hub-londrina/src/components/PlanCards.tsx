import { useState } from "react";
import { Check, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPlan,
  ANNUAL_COMPARISON_NOTE,
  MONTHLY_COMPARISON_NOTE,
  type PlanDef,
  type PlanId,
} from "@/lib/plans";

interface PlanCardsProps {
  /** "completa" = cards grandes (Anuncie) · "compacta" = painel escuro (Home) */
  variant: "completa" | "compacta";
  /** Chamado ao clicar no CTA de um plano. `anual` reflete o toggle atual. */
  onSelect: (plan: PlanDef, anual: boolean) => void;
}

export function PlanCards({ variant, onSelect }: PlanCardsProps) {
  const [anual, setAnual] = useState(false);

  if (variant === "compacta") {
    return <CompactCards anual={anual} setAnual={setAnual} onSelect={onSelect} />;
  }
  return <FullCards anual={anual} setAnual={setAnual} onSelect={onSelect} />;
}

interface VariantProps {
  anual: boolean;
  setAnual: (fn: (v: boolean) => boolean) => void;
  onSelect: (plan: PlanDef, anual: boolean) => void;
}

/* ----------------------------- Variante completa (Anuncie) ----------------------------- */

function FullCards({ anual, setAnual, onSelect }: VariantProps) {
  const gratuito = getPlan("gratuito");
  const base = getPlan("base");
  const premium = getPlan("premium");

  return (
    <>
      {/* Toggle Mensal / Anual */}
      <div className="flex items-center justify-center gap-4 mb-14">
        <span className={`text-sm font-bold transition-colors ${!anual ? "text-[#6F4E37]" : "text-gray-400"}`}>Mensal</span>
        <button
          onClick={() => setAnual((v) => !v)}
          className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none ${anual ? "bg-[#FF9800]" : "bg-gray-300"}`}
          aria-label="Alternar cobrança anual"
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${anual ? "translate-x-7" : "translate-x-0"}`} />
        </button>
        <span className={`text-sm font-bold transition-colors ${anual ? "text-[#6F4E37]" : "text-gray-400"}`}>
          Anual
          <span className="ml-2 bg-[#4CAF50] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">economize R$120</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
        {/* Gratuito */}
        <div className="bg-white rounded-[2rem] p-10 shadow-lg border border-gray-200">
          <h3 className="font-serif text-2xl font-black text-[#6F4E37] mb-1">{gratuito.name}</h3>
          <p className="text-gray-400 text-sm mb-6">{gratuito.tagline}</p>
          <div className="flex items-baseline gap-1 mb-8">
            <span className="text-5xl font-black text-[#6F4E37]">{gratuito.mensal.price}</span>
            <span className="text-gray-500 font-medium">{gratuito.mensal.sub}</span>
          </div>
          <ul className="space-y-4 mb-10 min-h-[220px]">
            {gratuito.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-600">
                <Check className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button onClick={() => onSelect(gratuito, anual)} variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-2xl py-6 font-bold text-lg">
            Começar com este plano
          </Button>
        </div>

        {/* Base (Mais Popular) */}
        <div className="bg-white rounded-[2.5rem] p-12 shadow-2xl border-2 border-[#FF9800] relative lg:scale-105 z-10">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#FF9800] text-white px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider whitespace-nowrap">
            Mais Popular
          </div>
          <h3 className="font-serif text-2xl font-black text-[#6F4E37] mb-1">{base.name}</h3>
          <p className="text-gray-400 text-sm mb-6">{base.tagline}</p>
          <div className="mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-[#6F4E37]">{(anual ? base.anual : base.mensal).price}</span>
              <span className="text-gray-500 font-medium">{(anual ? base.anual : base.mensal).sub}</span>
            </div>
            {anual && base.anual.total && (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm text-gray-400">{base.anual.total}</p>
                <p className="text-sm font-bold text-[#4CAF50]">{base.anual.economia}</p>
              </div>
            )}
          </div>
          <div className="mb-8 mt-4 h-px bg-gray-100" />
          <ul className="space-y-3.5 mb-10 min-h-[220px]">
            {base.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700 font-medium">
                <CheckCircle2 className="h-5 w-5 text-[#FF9800] flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button onClick={() => onSelect(base, anual)} className="w-full bg-[#FF9800] hover:bg-[#e68a00] text-white rounded-2xl py-6 font-bold text-lg shadow-lg flex items-center justify-center gap-2">
            Começar com este plano <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Premium */}
        <div className="bg-[#6F4E37] rounded-[2rem] p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="font-serif text-2xl font-black text-white mb-1">{premium.name}</h3>
          <p className="text-white/50 text-sm mb-6">{premium.tagline}</p>
          <div className="mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white">{(anual ? premium.anual : premium.mensal).price}</span>
              <span className="text-white/70 font-medium">{(anual ? premium.anual : premium.mensal).sub}</span>
            </div>
            {anual && premium.anual.total && (
              <div className="mt-1 space-y-0.5">
                <p className="text-sm text-white/40">{premium.anual.total}</p>
                <p className="text-sm font-bold text-[#4CAF50]">{premium.anual.economia}</p>
              </div>
            )}
          </div>
          <div className="mb-8 mt-4 h-px bg-white/10" />
          <ul className="space-y-3.5 mb-10 min-h-[220px]">
            {premium.features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 text-[#4CAF50] flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button onClick={() => onSelect(premium, anual)} className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-2xl py-6 font-bold text-lg border-0 flex items-center justify-center gap-2">
            Começar com este plano <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Nota de comparação */}
      <div className="text-center mt-10 space-y-1">
        <p className="text-gray-500 text-sm">
          {anual ? ANNUAL_COMPARISON_NOTE : MONTHLY_COMPARISON_NOTE}
        </p>
        <p className="text-gray-400 text-xs">Sem taxas escondidas · Cancele quando quiser</p>
      </div>
    </>
  );
}

/* ----------------------------- Variante compacta (Home) ----------------------------- */

const COMPACT_CTA: Record<PlanId, string> = {
  gratuito: "Começar",
  base: "Assinar",
  premium: "Assinar Premium",
};

/** Home mostra só um resumo dos benefícios (a lista completa fica na página Anuncie). */
const COMPACT_FEATURE_LIMIT = 4;

function CompactCards({ anual, setAnual, onSelect }: VariantProps) {
  const gratuito = getPlan("gratuito");
  const base = getPlan("base");
  const premium = getPlan("premium");

  return (
    <div className="flex flex-col h-full">
      {/* Toggle Mensal / Anual */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-xs font-bold transition-colors ${!anual ? "text-white" : "text-white/40"}`}>Mensal</span>
        <button
          onClick={() => setAnual((v) => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${anual ? "bg-[#d97706]" : "bg-white/20"}`}
          aria-label="Alternar cobrança anual"
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${anual ? "translate-x-6" : "translate-x-0"}`} />
        </button>
        <span className={`text-xs font-bold transition-colors ${anual ? "text-white" : "text-white/40"}`}>
          Anual
          <span className="ml-1.5 bg-[#4CAF50] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full">-R$120</span>
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 flex-grow">
        {/* Gratuito */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h3 className="font-bold text-white mb-1">{gratuito.name}</h3>
          <div className="text-3xl font-black text-white mb-4">
            {gratuito.mensal.price}<span className="text-sm font-normal text-white/50">{gratuito.mensal.sub}</span>
          </div>
          <ul className="space-y-2 flex-grow mb-6">
            {gratuito.features.slice(0, COMPACT_FEATURE_LIMIT).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 text-white/40 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onSelect(gratuito, anual)}
            className="w-full border border-white/20 text-white/80 hover:bg-white/10 rounded-xl py-2 text-sm font-bold transition-colors"
          >
            {COMPACT_CTA[gratuito.id]}
          </button>
        </div>

        {/* Base (Popular) */}
        <div className="bg-[#d97706] rounded-2xl p-6 flex flex-col relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#d97706] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            Popular
          </div>
          <h3 className="font-bold text-white mb-1">{base.name}</h3>
          <div className="text-3xl font-black text-white mb-1">
            {(anual ? base.anual : base.mensal).price}<span className="text-sm font-normal text-white/70">{(anual ? base.anual : base.mensal).sub}</span>
          </div>
          <div className="text-xs text-white/60 mb-4">
            {anual ? base.anual.total : `ou ${base.anual.price}/mês no anual`}
          </div>
          <ul className="space-y-2 flex-grow mb-6">
            {base.features.slice(0, COMPACT_FEATURE_LIMIT).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/90">
                <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onSelect(base, anual)}
            className="w-full bg-white text-[#d97706] hover:bg-gray-100 rounded-xl py-2 text-sm font-black transition-colors"
          >
            {COMPACT_CTA[base.id]}
          </button>
        </div>

        {/* Premium */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h3 className="font-bold text-white mb-1">{premium.name}</h3>
          <div className="text-3xl font-black text-white mb-1">
            {(anual ? premium.anual : premium.mensal).price}<span className="text-sm font-normal text-white/50">{(anual ? premium.anual : premium.mensal).sub}</span>
          </div>
          <div className="text-xs text-white/50 mb-4">
            {anual ? premium.anual.total : `ou ${premium.anual.price}/mês no anual`}
          </div>
          <ul className="space-y-2 flex-grow mb-6">
            {premium.features.slice(0, COMPACT_FEATURE_LIMIT).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 text-[#4CAF50] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={() => onSelect(premium, anual)}
            className="w-full bg-[#4CAF50] hover:bg-[#3d8c40] text-white rounded-xl py-2 text-sm font-bold transition-colors"
          >
            {COMPACT_CTA[premium.id]}
          </button>
        </div>
      </div>
    </div>
  );
}
