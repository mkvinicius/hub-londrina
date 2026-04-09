import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { ImageIcon, Plus, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";

interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  active: boolean;
  endsAt: string | null;
  createdAt: string;
}

function formatDate(d: string | null) {
  if (!d) return "Sem data";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function AdminHomeBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", linkUrl: "", endsAt: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchBanners() {
    setLoading(true);
    const data = await adminFetch("/api/admin/home-banners");
    setBanners(data.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchBanners(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await adminFetch("/api/admin/home-banners", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || null,
          endsAt: form.endsAt || null,
        }),
      });
      setForm({ title: "", imageUrl: "", linkUrl: "", endsAt: "" });
      setShowForm(false);
      fetchBanners();
    } catch (e: any) {
      setError(e.message || "Erro ao criar banner");
    } finally {
      setSaving(false);
    }
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

  const activeBanners = banners.filter(b => b.active);

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#d97706]" />
            Banners da Home
          </h1>
          <p className="text-sm text-gray-500 mt-1">Máximo 2 banners ativos simultâneos • R$299/mês cada</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBanners} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={activeBanners.length >= 2}
            className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Novo Banner
          </button>
        </div>
      </div>

      {activeBanners.length >= 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-amber-700 font-semibold">Máximo de 2 banners ativos atingido. Desative um para criar outro.</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">Novo Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Nome do anunciante"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">URL da imagem *</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link de destino</label>
              <input
                type="url"
                value={form.linkUrl}
                onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                placeholder="https://... (opcional)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expira em</label>
              <input
                type="date"
                value={form.endsAt}
                onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
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
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum banner cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map(banner => (
            <div key={banner.id} className={`bg-white rounded-2xl border ${banner.active ? "border-[#d97706] shadow-md" : "border-gray-100"} overflow-hidden shadow-sm`}>
              <div className="relative h-40 bg-gray-100">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = ""; }} />
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${banner.active ? "bg-emerald-500 text-white" : "bg-gray-400 text-white"}`}>
                  {banner.active ? "Ativo" : "Inativo"}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-1">{banner.title}</h3>
                {banner.linkUrl && (
                  <p className="text-xs text-gray-400 mb-1 truncate">{banner.linkUrl}</p>
                )}
                <p className="text-xs text-gray-400">Expira: {formatDate(banner.endsAt)}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleActive(banner)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${banner.active ? "text-gray-600 bg-gray-100 hover:bg-gray-200" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}
                  >
                    {banner.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {banner.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Excluir
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
