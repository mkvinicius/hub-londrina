import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { getAdminReviews, deleteAdminReview, type AdminReview } from "@/lib/admin-api";
import { Star, Trash2, RefreshCw, MessageSquare } from "lucide-react";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [rows, setRows] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessIdFilter, setBusinessIdFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { businessId?: number; rating?: number; limit: number } = { limit };
      if (businessIdFilter) {
        const n = Number(businessIdFilter);
        if (!isNaN(n)) params.businessId = n;
      }
      if (ratingFilter) {
        const n = Number(ratingFilter);
        if (!isNaN(n)) params.rating = n;
      }
      const res = await getAdminReviews(params);
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, [businessIdFilter, ratingFilter, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(r: AdminReview) {
    if (!confirm(`Excluir avaliação de "${r.author}" (${r.rating}★) sobre "${r.businessName ?? `#${r.businessId}`}"? Esta ação não pode ser desfeita e o rating do negócio será recalculado.`)) return;
    await deleteAdminReview(r.id);
    fetchData();
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Star className="w-6 h-6 text-[#d97706]" />
            Moderação de Reviews
          </h1>
          <p className="text-sm text-gray-500 mt-1">{rows.length} avaliações</p>
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
          <input
            type="number"
            placeholder="ID do negócio"
            value={businessIdFilter}
            onChange={(e) => setBusinessIdFilter(e.target.value)}
            className="flex-1 bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value="">Todas as notas</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} estrela{n > 1 ? "s" : ""}</option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Data</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Negócio</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Autor</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Nota</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Comentário</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhuma avaliação encontrada</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">
                    <div className="font-semibold">{r.businessName ?? <span className="text-gray-400">(removido)</span>}</div>
                    <div className="text-gray-400">#{r.businessId}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{r.author}</td>
                  <td className="px-4 py-3"><StarRating rating={r.rating} /></td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-md">
                    <div className="line-clamp-3">{r.comment || <span className="text-gray-400">—</span>}</div>
                    {r.ownerResponse && (
                      <div className="mt-1 flex items-start gap-1 text-[10px] text-gray-500">
                        <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="italic">resposta: {r.ownerResponse.slice(0, 60)}{r.ownerResponse.length > 60 ? "…" : ""}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Excluir review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
