import { Lock } from "lucide-react";
import { Link } from "wouter";

interface LockedFeatureProps {
  planRequired: "destaque" | "premium";
  currentPlan: string;
  children: React.ReactNode;
  message?: string;
  inline?: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  destaque: "Destaque",
  premium: "Premium",
};

const PLAN_RANK: Record<string, number> = {
  free: 0,
  destaque: 1,
  premium: 2,
};

export function LockedFeature({ planRequired, currentPlan, children, message, inline }: LockedFeatureProps) {
  const hasAccess = (PLAN_RANK[currentPlan] ?? 0) >= (PLAN_RANK[planRequired] ?? 0);

  if (hasAccess) return <>{children}</>;

  const label = PLAN_LABELS[planRequired] || planRequired;
  const defaultMsg = `Disponível no plano ${label} ou superior`;

  if (inline) {
    return (
      <div className="relative">
        <div className="opacity-40 pointer-events-none select-none blur-[2px]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
            <Lock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500 font-medium">{message || defaultMsg}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{message || defaultMsg}</h3>
      <p className="text-sm text-gray-500 mb-4">
        Faça upgrade do seu plano para desbloquear este recurso.
      </p>
      <Link
        href="/lojista/plano"
        className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl transition-colors text-sm"
      >
        Ver Planos
      </Link>
    </div>
  );
}
