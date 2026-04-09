import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { Zap, Search, RefreshCw } from "lucide-react";

interface Business {
  id: number;
  name: string;
  region: string;
  categorySlug: string;
  planType: string;
  boostedUntil: string | null;
}

const DAYS_OPTIONS = [
  { days: 7, label: "7 dias", price: "R$29" },
  { days: 15, label: "15 dias", price: "R$49" },
  { days: 30, label: "30 dias", price: "R$79" },
];

function isActive(boostedUntil: string | null): boolean {
  if (!boostedUntil) return false;
  return new Date(boostedUntil) > new Date();
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminImpulsionamento() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [boosting, setBoosting] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<Record<number, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      const data = await adminFetch(`/api/admin/businesses?${params}`);
      setBusinesses(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleBoost(id: number) {
    const days = selectedDays[id] || 7;
    setBoosting(id);
    try {
      await adminFetch(`/api/admin/businesses/${id}/boost`, {
        method: "POST",
        body: JSON.stringify({ days }),
      });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao impulsionar");
    } finally {
      setBoosting(null);
    }
  }

  async function handleRemoveBoost(id: number) {
    if (!confirm("Remover impulsionamento?")) return;
    setBoosting(id);
    try {
      await adminFetch(`/api/admin/businesses/${id}/boost`, { method: "DELETE" });
      fetchData();
    } finally {
      setBoosting(null);
    }
  }

  const filtered = businesses.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#d97706]" />
            Impulsionamento
          </h1>
          <p className="text-sm text-gray-500 mt-1">Ative impulsionamento avulso para negócios específicos</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          {DAYS_OPTIONS.map(opt => (
            <div key={opt.days} className="flex items-center gap-2">
              <span className="font-bold text-amber-800">{opt.label}</span>
              <span className="text-amber-600">→ {opt.price}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-amber-600 mt-2">Máximo 3 impulsionados por página de resultado. Aparecem antes de Premium e Destaque.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar negócio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Negócio</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Região / Categoria</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expira em</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum resultado.</td></tr>
              ) : (
                filtered.map(b => {
                  const active = isActive(b.boostedUntil);
                  const days = selectedDays[b.id] || 7;
                  const opt = DAYS_OPTIONS.find(o => o.days === days)!;
                  return (
                    <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-700">{b.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{b.region} · {b.categorySlug}</td>
                      <td className="px-4 py-3">
                        {active ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Inativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(b.boostedUntil)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!active && (
                            <select
                              value={days}
                              onChange={e => setSelectedDays(prev => ({ ...prev, [b.id]: Number(e.target.value) }))}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
                            >
                              {DAYS_OPTIONS.map(o => (
                                <option key={o.days} value={o.days}>{o.label} ({o.price})</option>
                              ))}
                            </select>
                          )}
                          {active ? (
                            <button
                              onClick={() => handleRemoveBoost(b.id)}
                              disabled={boosting === b.id}
                              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Remover
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBoost(b.id)}
                              disabled={boosting === b.id}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <Zap className="w-3 h-3" />
                              {boosting === b.id ? "..." : `Impulsionar ${opt.label}`}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
