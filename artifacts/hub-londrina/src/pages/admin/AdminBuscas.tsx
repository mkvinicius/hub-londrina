import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { getSearchAnalytics } from "@/lib/admin-api";
import { Search, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";

interface SearchAnalyticsRow {
  term: string;
  searches: number;
  zeroResults: number;
  zeroResultsPct: number;
}

export default function AdminBuscas() {
  const [rows, setRows] = useState<SearchAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSearchAnalytics({ days });
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Search className="w-6 h-6 text-[#d97706]" />
            Analytics de Busca
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            O que seus usuários estão procurando
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border border-gray-200 outline-none"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-sm text-gray-500 mb-1">Buscas únicas</div>
            <div className="text-3xl font-black text-gray-800">{rows.length}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-sm text-gray-500 mb-1">Total de buscas</div>
            <div className="text-3xl font-black text-[#d97706]">
              {rows.reduce((s, r) => s + r.searches, 0).toLocaleString("pt-BR")}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-sm text-gray-500 mb-1">Com 0 resultados</div>
            <div className="text-3xl font-black text-red-500">
              {rows.filter(r => r.zeroResultsPct > 50).length}
            </div>
            <div className="text-xs text-gray-400 mt-1">termos sem resultado na maioria das buscas</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase">#</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Termo buscado</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase text-right">Buscas</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase text-right">% sem resultado</th>
                <th className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    Nenhuma busca registrada neste período
                  </td>
                </tr>
              ) : rows.map((r, idx) => (
                <tr key={r.term} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {idx < 3 && <TrendingUp className="w-3.5 h-3.5 text-[#d97706]" />}
                      <span className="font-semibold text-gray-800">{r.term}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-800">
                    {r.searches.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-bold ${r.zeroResultsPct >= 80 ? "text-red-600" : r.zeroResultsPct >= 40 ? "text-amber-600" : "text-green-600"}`}>
                      {r.zeroResultsPct.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {r.zeroResultsPct >= 80 ? (
                      <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 rounded-full px-2 py-1 w-fit">
                        <AlertCircle className="w-3 h-3" />
                        Catálogo com gap
                      </span>
                    ) : r.zeroResultsPct >= 40 ? (
                      <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-1 w-fit">Atenção</span>
                    ) : (
                      <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-1 w-fit">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
