import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { imgSrc } from "@/lib/utils";
import { ImageIcon, Plus, Trash2, Eye, EyeOff, RefreshCw, Check, X, Clock, ShoppingBag } from "lucide-react";

interface Banner {
  id: number;
  businessId: number | null;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  active: boolean;
  status: "active" | "pending_review" | "rejected" | "expired";
  requestedBy: "admin" | "lojista";
  rejectionReason: string | null;
  stripeSessionId: string | null;
  clicks: number;
  endsAt: string | null;
  createdAt: string;
  businessName: string | null;
  businessLogoUrl: string | null;
  businessZone: string | null;
  businessPlanType: string | null;
  businessIsVisible: boolean | null;
  businessStatus: string | null;
}

interface ListBusiness {
  id: number;
  name: string;
  logoUrl: string | null;
  zone: string | null;
  planType: string;
  status: string;
  isVisible: boolean;
}

function formatDate(d: string | null) {
  if (!d) return "Sem data";
  return new Date(d).toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<Banner["status"], string> = {
  active: "Ativo",
  pending_review: "Aguardando aprovação",
  rejected: "Rejeitado",
  expired: "Expirado",
};
const STATUS_COLOR: Record<Banner["status"], string> = {
  active: "bg-emerald-500 text-white",
  pending_review: "bg-amber-500 text-white",
  rejected: "bg-red-500 text-white",
  expired: "bg-gray-400 text-white",
};

export default function AdminHomeBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [businesses, setBusinesses] = useState<ListBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ businessId: "", imageUrl: "", linkUrl: "", endsAt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"pending" | "active" | "all">("pending");

  async function fetchBanners() {
    setLoading(true);
    const data = await adminFetch("/api/admin/home-banners");
    setBanners(data.data || []);
    setLoading(false);
  }

  async function fetchBusinesses() {
    const data = await adminFetch("/api/admin/businesses?limit=500");
    const list = (data.data || []) as ListBusiness[];
    setBusinesses(list.filter(b => b.status === "active" && b.isVisible));
  }

  useEffect(() => { fetchBanners(); fetchBusinesses(); }, []);

  const selectedBiz = businesses.find(b => String(b.id) === form.businessId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.businessId) { setError("Selecione um negócio."); return; }
    setSaving(true);
    try {
      await adminFetch("/api/admin/home-banners", {
        method: "POST",
        body: JSON.stringify({
          businessId: Number(form.businessId),
          imageUrl: form.imageUrl || undefined,
          linkUrl: form.linkUrl || undefined,
          endsAt: form.endsAt || null,
        }),
      });
      setForm({ businessId: "", imageUrl: "", linkUrl: "", endsAt: "" });
      setShowForm(false);
      fetchBanners();
    } catch (e: any) {
      setError(e.message || "Erro ao criar banner");
    } finally {
      setSaving(false);
    }
  }

  async function approve(id: number) {
    try {
      await adminFetch(`/api/admin/home-banners/${id}/approve`, { method: "POST" });
      fetchBanners();
    } catch (e: any) { alert(e.message || "Erro ao aprovar"); }
  }
  async function reject(id: number) {
    const reason = prompt("Motivo da rejeição (opcional):") || "";
    try {
      await adminFetch(`/api/admin/home-banners/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      fetchBanners();
    } catch (e: any) { alert(e.message || "Erro ao rejeitar"); }
  }
  async function toggleActive(banner: Banner) {
    await adminFetch(`/api/admin/home-banners/${banner.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !banner.active }),
    });
    fetchBanners();
  }
  async function handleDelete(id: number) {
    if (!confirm("Excluir este banner?")) return;
    await adminFetch(`/api/admin/home-banners/${id}`, { method: "DELETE" });
    fetchBanners();
  }

  const pending = banners.filter(b => b.status === "pending_review");
  const activeOnes = banners.filter(b => b.status === "active");
  const visible = tab === "pending" ? pending : tab === "active" ? activeOnes : banners;
  const activeSlots = activeOnes.filter(b => b.active).length;

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#d97706]" />
            Banners da Home
          </h1>
          <p className="text-sm text-gray-500 mt-1">Máximo 2 banners ativos simultâneos • R$299/mês cada • Lojistas podem solicitar via Stripe</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchBanners(); fetchBusinesses(); }} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={activeSlots >= 2}
            className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Novo Banner
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {([
          ["pending", `Pendentes (${pending.length})`, Clock],
          ["active", `Ativos (${activeOnes.length})`, Check],
          ["all", `Todos (${banners.length})`, ImageIcon],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === key ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeSlots >= 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-amber-700 font-semibold">Máximo de 2 banners ativos atingido. Desative um para criar/aprovar outro.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Novo Banner (cadastro direto pelo admin)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Negócio cadastrado *</label>
              <select
                value={form.businessId}
                onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))}
                className={inputClass}
                required
              >
                <option value="">— escolha um negócio ativo —</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.zone ? `(${b.zone})` : ""} • {b.planType}
                  </option>
                ))}
              </select>
              {selectedBiz && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-2">
                  {selectedBiz.logoUrl && <img src={imgSrc(selectedBiz.logoUrl)} alt="" className="w-6 h-6 rounded object-cover" />}
                  Título do banner = nome do negócio • link = /negocio/{selectedBiz.id}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL da imagem (opcional)</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder={selectedBiz?.logoUrl ? "(usa logo do negócio)" : "https://..."}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expira em (opcional)</label>
              <input
                type="date"
                value={form.endsAt}
                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link customizado (opcional)</label>
              <input
                type="text"
                value={form.linkUrl}
                onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                placeholder="(padrão: /negocio/:id)"
                className={inputClass}
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
              {saving ? "Salvando..." : "Criar Banner"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Carregando...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {tab === "pending" ? "Nenhuma solicitação pendente." : tab === "active" ? "Nenhum banner ativo." : "Nenhum banner cadastrado."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map(banner => (
            <div key={banner.id} className={`bg-white rounded-2xl border ${banner.status === "active" && banner.active ? "border-[#d97706] shadow-md" : "border-gray-100"} overflow-hidden shadow-sm`}>
              <div className="relative h-40 bg-gray-100">
                {banner.imageUrl ? (
                  <img src={banner.imageUrl} alt={banner.title || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLOR[banner.status]}`}>
                  {STATUS_LABEL[banner.status]}
                </div>
                {banner.requestedBy === "lojista" && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Comprado
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-1">{banner.businessName || banner.title || "(sem negócio)"}</h3>
                {banner.businessZone && <p className="text-xs text-gray-500 mb-1">Zona: {banner.businessZone} • Plano: {banner.businessPlanType}</p>}
                {banner.linkUrl && <p className="text-xs text-gray-400 mb-1 truncate">→ {banner.linkUrl}</p>}
                <p className="text-xs text-gray-400">Cliques: {banner.clicks} • Expira: {formatDate(banner.endsAt)}</p>
                {banner.rejectionReason && <p className="text-xs text-red-600 mt-1">Rejeitado: {banner.rejectionReason}</p>}

                <div className="flex flex-wrap gap-2 mt-3">
                  {banner.status === "pending_review" ? (
                    <>
                      <button
                        onClick={() => approve(banner.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Aprovar
                      </button>
                      <button
                        onClick={() => reject(banner.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                      >
                        <X className="w-3 h-3" /> Rejeitar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${banner.active ? "text-gray-600 bg-gray-100 hover:bg-gray-200" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}
                    >
                      {banner.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {banner.active ? "Desativar" : "Ativar"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
