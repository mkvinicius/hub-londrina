import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { Zap, Search, RefreshCw, Crown, Flame, Trash2, Plus, X } from "lucide-react";

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";

interface Boost {
  id: number;
  businessId: number;
  monthlyBid: string;
  position: number | null;
  boostType: string;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  businessName: string;
  businessRegion: string;
  businessCategory: string;
}

interface Business {
  id: number;
  name: string;
  region: string;
  categorySlug: string;
}

const AVULSO_OPTIONS = [
  { days: 7, label: "7 dias", price: "R$29" },
  { days: 15, label: "15 dias", price: "R$49" },
  { days: 30, label: "30 dias", price: "R$79" },
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminImpulsionamento() {
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"monthly" | "avulso">("monthly");
  const [addBusinessId, setAddBusinessId] = useState<number | "">("");
  const [addPosition, setAddPosition] = useState<number>(1);
  const [addBid, setAddBid] = useState("");
  const [addDays, setAddDays] = useState(7);
  const [bizSearch, setBizSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [boostRes, bizRes] = await Promise.all([
        adminFetch("/api/admin/search-boosts"),
        adminFetch("/api/admin/businesses?limit=200"),
      ]);
      setBoosts(boostRes.data || []);
      setBusinesses(bizRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthly = boosts.filter(b => b.boostType === "monthly" && b.status === "active");
  const avulso = boosts.filter(b => b.boostType === "avulso" && b.status === "active");
  const occupied = new Set(monthly.map(b => b.position));
  const boostedIds = new Set(boosts.map(b => b.businessId));

  const availableBusinesses = businesses.filter(
    b => !boostedIds.has(b.id) &&
    (!bizSearch || b.name.toLowerCase().includes(bizSearch.toLowerCase()))
  );

  async function handleAdd() {
    if (!addBusinessId) return;
    setSaving(true);
    try {
      await adminFetch("/api/admin/search-boosts", {
        method: "POST",
        body: JSON.stringify({
          businessId: addBusinessId,
          boostType: addType,
          monthlyBid: addType === "monthly" ? addBid : "0",
          position: addType === "monthly" ? addPosition : undefined,
          days: addType === "avulso" ? addDays : undefined,
        }),
      });
      setShowAdd(false);
      setAddBusinessId("");
      setAddBid("");
      setBizSearch("");
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao criar boost");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remover boost?")) return;
    try {
      await adminFetch(`/api/admin/search-boosts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao remover");
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#d97706]" />
            Impulsionamento
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as 5 vagas mensais fixas e boosts avulsos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className={`p-2 rounded-lg bg-gray-100 hover:bg-gray-200 ${BTN_ELEVATION}`}>
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className={`px-4 py-2 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl flex items-center gap-1 ${BTN_ELEVATION}`}
          >
            <Plus className="w-4 h-4" /> Novo Boost
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-sm font-bold text-amber-800 mb-1">Como funciona:</p>
        <ul className="text-xs text-amber-700 space-y-1">
          <li><Crown className="w-3 h-3 inline mr-1" /><strong>Mensal (posições 1-5):</strong> Vagas fixas no topo da busca por lance mensal. Badge "Patrocinado".</li>
          <li><Flame className="w-3 h-3 inline mr-1" /><strong>Avulso (7/15/30 dias):</strong> Aparecem após os mensais. R$29/R$49/R$79.</li>
        </ul>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#d97706]" />
          Vagas Mensais (5 posições)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(pos => {
            const boost = monthly.find(b => b.position === pos);
            return (
              <div key={pos} className={`rounded-2xl border p-4 ${boost ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-dashed border-gray-300"}`}>
                <div className="text-xs font-bold text-gray-500 mb-2">Posição #{pos}</div>
                {boost ? (
                  <>
                    <p className="font-bold text-sm text-gray-800 truncate">{boost.businessName}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{boost.businessRegion} · {boost.businessCategory}</p>
                    <p className="text-xs text-amber-700 font-semibold mt-2">R${Number(boost.monthlyBid).toFixed(0)}/mês</p>
                    <button
                      onClick={() => handleDelete(boost.id)}
                      className={`mt-3 w-full px-2 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />Remover
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">Vaga disponível</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Boosts Avulsos
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Negócio</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Região</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Início</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expira</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : avulso.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum boost avulso ativo.</td></tr>
              ) : (
                avulso.map(b => (
                  <tr key={b.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-700">{b.businessName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{b.businessRegion} · {b.businessCategory}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(b.startsAt)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(b.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className={`px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                      >
                        <Trash2 className="w-3 h-3 inline mr-1" />Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Novo Boost</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddType("monthly")}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-colors ${
                      addType === "monthly" ? "bg-[#d97706] text-white border-[#d97706]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    } ${BTN_ELEVATION}`}
                  >
                    <Crown className="w-4 h-4 inline mr-1" />Mensal
                  </button>
                  <button
                    onClick={() => setAddType("avulso")}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl border transition-colors ${
                      addType === "avulso" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    } ${BTN_ELEVATION}`}
                  >
                    <Flame className="w-4 h-4 inline mr-1" />Avulso
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Negócio</label>
                <input
                  type="text"
                  placeholder="Buscar negócio..."
                  value={bizSearch}
                  onChange={e => setBizSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-2"
                />
                <select
                  value={addBusinessId}
                  onChange={e => setAddBusinessId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  <option value="">Selecionar...</option>
                  {availableBusinesses.slice(0, 30).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.region})</option>
                  ))}
                </select>
              </div>

              {addType === "monthly" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Posição (1-5)</label>
                    <select
                      value={addPosition}
                      onChange={e => setAddPosition(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                    >
                      {[1, 2, 3, 4, 5].map(p => (
                        <option key={p} value={p} disabled={occupied.has(p)}>
                          Posição #{p} {occupied.has(p) ? "(ocupada)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lance mensal (R$)</label>
                    <input
                      type="number"
                      value={addBid}
                      onChange={e => setAddBid(e.target.value)}
                      placeholder="Ex: 150"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              {addType === "avulso" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duração</label>
                  <select
                    value={addDays}
                    onChange={e => setAddDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                  >
                    {AVULSO_OPTIONS.map(o => (
                      <option key={o.days} value={o.days}>{o.label} ({o.price})</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={saving || !addBusinessId}
                className={`w-full py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {saving ? "Salvando..." : "Criar Boost"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
