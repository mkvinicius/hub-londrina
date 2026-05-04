import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { MapPin, Plus, Trash2, X, RefreshCw, Clock, Edit3, Save } from "lucide-react";

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";

const DURATION_OPTIONS = [
  { days: 7, label: "7 dias", price: 19 },
  { days: 15, label: "15 dias", price: 29 },
  { days: 30, label: "30 dias", price: 49 },
];

const MAX_SLOTS = 6;

interface Zone {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  bannerUrl: string | null;
  active: boolean;
  businessCount: number;
}

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

const emptyZoneForm = { slug: "", name: "", description: "", color: "#f97316", bannerUrl: "", active: true };

// Zonas padrão — sempre existem no sistema. Garante que a página renderize
// mesmo se /api/admin/zones falhar (auth, rede, etc).
const DEFAULT_ZONES: Zone[] = [
  { id: -1, slug: "norte",  name: "Zona Norte",  color: "#3b82f6", description: "Região norte de Londrina",   bannerUrl: null, active: true, businessCount: 0 },
  { id: -2, slug: "sul",    name: "Zona Sul",    color: "#10b981", description: "Região sul de Londrina",     bannerUrl: null, active: true, businessCount: 0 },
  { id: -3, slug: "leste",  name: "Zona Leste",  color: "#f59e0b", description: "Região leste de Londrina",   bannerUrl: null, active: true, businessCount: 0 },
  { id: -4, slug: "oeste",  name: "Zona Oeste",  color: "#8b5cf6", description: "Região oeste de Londrina",   bannerUrl: null, active: true, businessCount: 0 },
  { id: -5, slug: "centro", name: "Centro",      color: "#ef4444", description: "Região central de Londrina", bannerUrl: null, active: true, businessCount: 0 },
];

export default function AdminZonas() {
  const [zonesList, setZonesList] = useState<Zone[]>([]);
  const [boosts, setBoosts] = useState<Record<string, ZoneBoost[]>>({});
  const [businesses, setBusinesses] = useState<ListBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [bizId, setBizId] = useState<number | "">("");
  const [bizSearch, setBizSearch] = useState("");
  const [days, setDays] = useState(7);
  const [saving, setSaving] = useState(false);

  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState(emptyZoneForm);
  const [zoneSaving, setZoneSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Zonas: tenta API admin, depois pública, depois fallback hardcoded.
    try {
      const zonesRes = await adminFetch("/api/admin/zones");
      const list = (zonesRes?.data as Zone[]) || [];
      setZonesList(list.length > 0 ? list : DEFAULT_ZONES);
    } catch {
      try {
        const pub = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/zones`).then(r => r.json());
        const list = (pub?.data as Zone[]) || [];
        setZonesList(list.length > 0 ? list.map(z => ({ ...z, businessCount: 0 })) : DEFAULT_ZONES);
      } catch {
        setZonesList(DEFAULT_ZONES);
      }
    }
    // Boosts e businesses são best-effort — sem eles a página ainda mostra zonas.
    try {
      const extra = await adminFetch("/api/admin/boosts-extra");
      setBoosts(extra.zones || {});
    } catch { setBoosts({}); }
    try {
      const biz = await adminFetch("/api/admin/businesses?limit=200");
      setBusinesses(biz.data || []);
    } catch { setBusinesses([]); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const opt = DURATION_OPTIONS.find(o => o.days === days)!;

  function openCreate() {
    setEditingZone(null);
    setZoneForm(emptyZoneForm);
    setZoneModalOpen(true);
  }

  function openEdit(z: Zone) {
    setEditingZone(z);
    setZoneForm({
      slug: z.slug,
      name: z.name,
      description: z.description || "",
      color: z.color,
      bannerUrl: z.bannerUrl || "",
      active: z.active,
    });
    setZoneModalOpen(true);
  }

  async function handleSaveZone() {
    if (!zoneForm.name.trim() || (!editingZone && !zoneForm.slug.trim())) {
      alert("Slug e nome são obrigatórios");
      return;
    }
    setZoneSaving(true);
    try {
      if (editingZone) {
        await adminFetch(`/api/admin/zones/${editingZone.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: zoneForm.name,
            description: zoneForm.description,
            color: zoneForm.color,
            bannerUrl: zoneForm.bannerUrl,
            active: zoneForm.active,
          }),
        });
      } else {
        await adminFetch("/api/admin/zones", {
          method: "POST",
          body: JSON.stringify(zoneForm),
        });
      }
      setZoneModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao salvar zona");
    } finally {
      setZoneSaving(false);
    }
  }

  async function handleDeleteZone(z: Zone) {
    if (!confirm(`Excluir a zona "${z.name}"? Negócios não serão excluídos.`)) return;
    try {
      await adminFetch(`/api/admin/zones/${z.id}`, { method: "DELETE" });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao excluir");
    }
  }

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
            Zonas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerenciar zonas e até {MAX_SLOTS} negócios em destaque por zona</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className={`px-4 py-2.5 text-sm font-bold text-white bg-[#d97706] rounded-xl ${BTN_ELEVATION}`}
          >
            <Plus className="w-4 h-4 inline mr-1" />Nova zona
          </button>
          <button
            onClick={() => fetchData()}
            className={`p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#d97706] ${BTN_ELEVATION}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Carregando...</div>
      ) : zonesList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          Nenhuma zona cadastrada. Clique em "Nova zona" para começar.
        </div>
      ) : (
        <div className="space-y-6">
          {zonesList.map(z => {
            const slots = boosts[z.slug] || [];
            const free = MAX_SLOTS - slots.length;
            return (
              <div key={z.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full border"
                      style={{ color: z.color, borderColor: z.color + "40", backgroundColor: z.color + "12" }}
                    >
                      {z.name}
                    </span>
                    <span className="text-xs text-gray-400">slug: {z.slug}</span>
                    <span className="text-sm text-gray-500">{z.businessCount} negócios</span>
                    {!z.active && <span className="text-xs text-red-600 font-bold">INATIVA</span>}
                    <span className="text-sm text-gray-500 ml-3">{slots.length}/{MAX_SLOTS} slots</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {free > 0 && (
                      <button
                        onClick={() => { setActiveZone(z.slug); setBizId(""); setBizSearch(""); setDays(7); }}
                        className={`px-3 py-1.5 text-xs font-bold text-[#d97706] bg-amber-50 hover:bg-amber-100 rounded-lg ${BTN_ELEVATION}`}
                      >
                        <Plus className="w-3 h-3 inline mr-1" />Slot
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(z)}
                      className={`px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg ${BTN_ELEVATION}`}
                    >
                      <Edit3 className="w-3 h-3 inline mr-1" />Editar
                    </button>
                    <button
                      onClick={() => handleDeleteZone(z)}
                      className={`px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {slots.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">Nenhum destaque ativo nesta zona</div>
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

      {/* Modal: criar/editar zona */}
      {zoneModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {editingZone ? `Editar — ${editingZone.name}` : "Nova zona"}
              </h3>
              <button onClick={() => setZoneModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Slug *</label>
                <input
                  type="text"
                  disabled={!!editingZone}
                  placeholder="ex: norte"
                  value={zoneForm.slug}
                  onChange={e => setZoneForm({ ...zoneForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nome *</label>
                <input
                  type="text"
                  placeholder="ex: Zona Norte"
                  value={zoneForm.name}
                  onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={zoneForm.description}
                  onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cor</label>
                  <input
                    type="color"
                    value={zoneForm.color}
                    onChange={e => setZoneForm({ ...zoneForm, color: e.target.value })}
                    className="w-full h-10 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={zoneForm.active}
                      onChange={e => setZoneForm({ ...zoneForm, active: e.target.checked })}
                    />
                    Ativa
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">URL do banner (opcional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={zoneForm.bannerUrl}
                  onChange={e => setZoneForm({ ...zoneForm, bannerUrl: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                />
              </div>
              <button
                onClick={handleSaveZone}
                disabled={zoneSaving}
                className={`w-full py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                <Save className="w-4 h-4 inline mr-1" />
                {zoneSaving ? "Salvando..." : editingZone ? "Atualizar zona" : "Criar zona"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeZone && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Adicionar destaque — {zonesList.find(z => z.slug === activeZone)?.name}
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
