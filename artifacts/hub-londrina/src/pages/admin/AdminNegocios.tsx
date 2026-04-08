import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { getBusinesses, updateBusiness, deleteBusiness } from "@/lib/admin-api";
import { Search, Trash2, Eye, EyeOff } from "lucide-react";

interface Business {
  id: number;
  name: string;
  zone: string;
  planType: string;
  clicks: number;
  whatsappClicks: number;
  isVisible: boolean;
  verified: boolean;
}

export default function AdminNegocios() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;
      if (filterZone) params.zone = filterZone;
      if (filterPlan) params.planType = filterPlan;
      const res = await getBusinesses(params);
      setBusinesses(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterZone, filterPlan]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleVisibility(biz: Business) {
    await updateBusiness(biz.id, { isVisible: !biz.isVisible });
    fetchData();
  }

  async function changePlan(biz: Business, planType: string) {
    await updateBusiness(biz.id, { planType });
    fetchData();
  }

  async function handleDelete(biz: Business) {
    if (!confirm(`Excluir "${biz.name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteBusiness(biz.id);
    fetchData();
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Negócios</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={filterZone}
            onChange={(e) => { setFilterZone(e.target.value); setPage(1); }}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value="">Todas as zonas</option>
            {["centro", "norte", "sul", "leste", "oeste"].map((z) => (
              <option key={z} value={z} className="capitalize">{z.charAt(0).toUpperCase() + z.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value="">Todos os planos</option>
            <option value="free">Gratuito</option>
            <option value="destaque">Destaque</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Nome</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Zona</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Plano</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Cliques</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-right">WhatsApp</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Visível</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum negócio encontrado.</td></tr>
              ) : (
                businesses.map((biz) => (
                  <tr key={biz.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{biz.name}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{biz.zone}</td>
                    <td className="px-4 py-3">
                      <select
                        value={biz.planType}
                        onChange={(e) => changePlan(biz, e.target.value)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none ${
                          biz.planType === "premium" ? "bg-green-100 text-green-700" :
                          biz.planType === "destaque" ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <option value="free">Gratuito</option>
                        <option value="destaque">Destaque</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{biz.clicks}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{biz.whatsappClicks}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(biz)}
                        className={`p-1.5 rounded-lg transition-colors ${biz.isVisible ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                        title={biz.isVisible ? "Visível" : "Oculto"}
                      >
                        {biz.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(biz)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} negócios</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
