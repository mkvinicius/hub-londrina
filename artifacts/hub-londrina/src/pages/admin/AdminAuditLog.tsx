import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { getAuditLog, type AdminAction } from "@/lib/admin-api";
import { ScrollText, RefreshCw } from "lucide-react";

const TARGET_TYPES = ["", "business", "home_banner", "business_document", "review"];

const ACTION_COLORS: Record<string, string> = {
  approve: "bg-emerald-100 text-emerald-700",
  reject: "bg-red-100 text-red-700",
  delete: "bg-red-100 text-red-700",
  create: "bg-blue-100 text-blue-700",
  show: "bg-emerald-50 text-emerald-700",
  hide: "bg-amber-100 text-amber-700",
  plan_change: "bg-violet-100 text-violet-700",
  status_change: "bg-amber-100 text-amber-700",
  impersonate: "bg-pink-100 text-pink-700",
};

function actionBadgeClass(action: string): string {
  const suffix = action.split(".").pop() || "";
  return ACTION_COLORS[suffix] || "bg-gray-100 text-gray-700";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export default function AdminAuditLog() {
  const [rows, setRows] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLog({ targetType: filterType || undefined, limit });
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, [filterType, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-[#d97706]" />
            Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">{rows.length} ações registradas</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>{t || "Todos os tipos"}</option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Data</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Admin</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Ação</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Alvo</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Detalhes</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma ação registrada</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">#{r.adminId}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${actionBadgeClass(r.action)}`}>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    {r.targetType}{r.targetId ? <span className="text-gray-500"> #{r.targetId}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-md">
                    {r.details ? (
                      <pre className="font-mono text-[10px] whitespace-pre-wrap break-words bg-gray-50 rounded px-2 py-1">{r.details}</pre>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
