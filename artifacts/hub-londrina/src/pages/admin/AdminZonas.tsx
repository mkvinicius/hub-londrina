import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { MapPin, Plus, Trash2, X, RefreshCw, Clock } from "lucide-react";

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";

const ZONES = [
  { key: "norte", label: "Zona Norte", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "sul", label: "Zona Sul", color: "bg-green-50 text-green-700 border-green-200" },
  { key: "leste", label: "Zona Leste", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "oeste", label: "Zona Oeste", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "centro", label: "Centro", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

const DURATION_OPTIONS = [
  { days: 7, label: "7 dias", price: 19 },
  { days: 15, label: "15 dias", price: 29 },
  { days: 30, label: "30 dias", price: 49 },
];

const MAX_SLOTS = 6;

interface ZoneBoost {
  id: number;
  business: { id: number; name: string; planType: string; region: string; category: string };
  zone: string | null;
  boostType: string;
  status: string;
  durationDays: number | null;
  price: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ListBusiness {
  id: number;
  name: string;
  region: string;
  categorySlug: string;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysRemaining(d: string | null): string {
  if (!d) return "—";
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Expirado";
  return `${diff} dia${diff > 1 ? "s" : ""}`;
}

export default function AdminZonas() {
  const [zones, setZones] = useState<Record<string, ZoneBoost[]>>({ norte: [], sul: [], leste: [], oeste: [], centro: [] });
  const [businesses, setBusinesses] = useState<ListBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [bizId, setBizId] = useState<number | "">("");
  const [bizSearch, setBizSearch] = useState("");
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [extra, biz] = await Promise.all([
        adminFetch("/api/admin/boosts-extra"),
        adminFetch("/api/admin/businesses?limit=200"),
      ]);
      setZones(extra.zones || {});
      setBusinesses(biz.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const opt = DURATION_OPTIONS.find(o => o.days === days)!;

  async function handleAdd() {
    if (!activeZone || !bizId) return;
    setSaving(true);
    try {
      await adminFetch("/api/admin/boosts-extra", {
        method: "POST",
        body: JSON.stringify({
          businessId: bizId,
          boostContext: "zone",
          zone: activeZone,
          durationDays: days,
          price: opt.price,
        }),
      });
      setActiveZone(null);
      setBizId("");
      setBizSearch("");
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao criar destaque");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: number) {
    if (!confirm("Remover este destaque de zona?")) return;
    try {
      await adminFetch(`/api/admin/boosts-extra/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao remover");
    }
  }

  const filteredBiz = businesses.filter(b =>
    !bizSearch || b.name.toLowerCase().includes(bizSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-[#d97706]" />
            Destaque por Zona
          </h1>
          <p className="text-sm text-gray-500 mt-1">Até {MAX_SLOTS} negócios em destaque por zona</p>
        </div>
        <button
          onClick={() => fetchData()}
          className={`p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#d97706] ${BTN_ELEVATION}`}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {ZONES.map(z => {
            const slots = zones[z.key] || [];
            const free = MAX_SLOTS - slots.length;
            return (
              <div key={z.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${z.color}`}>{z.label}</span>
                    <span className="text-sm text-gray-500">{slots.length}/{MAX_SLOTS} ocupados</span>
                  </div>
                  {free > 0 && (
                    <button
                      onClick={() => { setActiveZone(z.key); setBizId(""); setBizSearch(""); setDays(7); }}
                      className={`px-3 py-1.5 text-xs font-bold text-[#d97706] bg-amber-50 hover:bg-amber-100 rounded-lg ${BTN_ELEVATION}`}
                    >
                      <Plus className="w-3 h-3 inline mr-1" />Adicionar
                    </button>
                  )}
                </div>

                {slots.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">Nenhum destaque ativo nesta zona</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {slots.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 flex items-center justify-center bg-amber-50 rounded-lg font-black text-amber-700 text-xs flex-shrink-0">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{s.business.name}</p>
                            <p className="text-[10px] text-gray-400 flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              Expira em {daysRemaining(s.expiresAt)} ({formatDate(s.expiresAt)})
                              {s.price && <span>· R${s.price}</span>}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(s.id)}
                          className={`flex-shrink-0 ml-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" />Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeZone && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Adicionar destaque — {ZONES.find(z => z.key === activeZone)?.label}
              </h3>
              <button onClick={() => setActiveZone(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
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
                  value={bizId}
                  onChange={e => setBizId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  <option value="">Selecionar...</option>
                  {filteredBiz.slice(0, 30).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.region})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Duração</label>
                <select
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  {DURATION_OPTIONS.map(o => (
                    <option key={o.days} value={o.days}>{o.label} (R${o.price})</option>
                  ))}
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                Será criado um boost avulso de <b>R${opt.price}</b> com vigência de <b>{opt.label}</b>.
              </div>
              <button
                onClick={handleAdd}
                disabled={saving || !bizId}
                className={`w-full py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
