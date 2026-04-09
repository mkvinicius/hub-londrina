import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { getAdminToken } from "@/lib/admin-api";
import { CreditCard, TrendingUp, AlertTriangle, XCircle, ExternalLink } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface Subscription {
  id: number;
  businessId: number;
  businessName: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string;
  cancelAtPeriodEnd: boolean | null;
  updatedAt: string | null;
}

interface SubData {
  mrr: number;
  byStatus: { active: number; past_due: number; cancelled: number; trialing: number };
  subscriptions: Subscription[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-orange-100 text-orange-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const label: Record<string, string> = {
    active: "Ativa",
    trialing: "Trial",
    past_due: "Inadimplente",
    cancelled: "Cancelada",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {label[status] || status}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    destaque: "bg-amber-100 text-amber-700",
    premium: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[plan] || "bg-gray-100 text-gray-500"}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

export default function AdminAssinaturas() {
  const [data, setData] = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const token = getAdminToken();
    fetch(`${API_BASE}/api/admin/subscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-[#d97706] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return <AdminLayout><p className="text-red-500">Erro ao carregar assinaturas.</p></AdminLayout>;
  }

  const pastDue = data.subscriptions.filter(s => s.status === "past_due");

  const filtered = statusFilter === "all"
    ? data.subscriptions
    : data.subscriptions.filter(s => s.status === statusFilter);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Assinaturas</h1>
        <p className="text-sm text-gray-500 mt-1">Receita recorrente e status das assinaturas Stripe</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-gray-800">
            R$ {data.mrr.toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs text-gray-500 mt-1">MRR estimado</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-3">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-gray-800">{data.byStatus.active}</p>
          <p className="text-xs text-gray-500 mt-1">Ativas</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mb-3">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-gray-800">{data.byStatus.past_due}</p>
          <p className="text-xs text-gray-500 mt-1">Inadimplentes</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center mb-3">
            <XCircle className="w-4 h-4 text-white" />
          </div>
          <p className="text-2xl font-black text-gray-800">{data.byStatus.cancelled}</p>
          <p className="text-xs text-gray-500 mt-1">Canceladas</p>
        </div>
      </div>

      {pastDue.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Inadimplentes ({pastDue.length})
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-red-700 border-b border-red-200 bg-red-100">
                  <th className="px-4 py-3">Negócio</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 hidden md:table-cell">Atualizado em</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {pastDue.map(s => (
                  <tr key={s.id} className="border-b border-red-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.businessName || "—"}</td>
                    <td className="px-4 py-3"><PlanBadge plan={s.plan} /></td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{s.ownerEmail || "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.stripeCustomerId && (
                        <a
                          href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Ver no Stripe <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800">
            Todas as assinaturas ({data.subscriptions.length})
          </h2>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#d97706]"
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="past_due">Inadimplentes</option>
            <option value="cancelled">Canceladas</option>
            <option value="trialing">Trial</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma assinatura encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3">Negócio</th>
                  <th className="px-4 py-3">Plano</th>
                  <th className="px-4 py-3">Valor/mês</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Renova em</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Stripe ID</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{s.businessName || "—"}</p>
                      <p className="text-xs text-gray-400">{s.ownerEmail || ""}</p>
                    </td>
                    <td className="px-4 py-3"><PlanBadge plan={s.plan} /></td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {s.plan === "premium" ? "R$ 89,90" : "R$ 49,90"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                      {s.currentPeriodEnd
                        ? new Date(s.currentPeriodEnd).toLocaleDateString("pt-BR")
                        : "—"}
                      {s.cancelAtPeriodEnd && (
                        <span className="ml-1 text-red-400">(cancela)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {s.stripeSubscriptionId ? (
                        <span className="font-mono text-[11px] text-gray-400">{s.stripeSubscriptionId.slice(0, 20)}…</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {s.stripeCustomerId && (
                        <a
                          href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-700"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
