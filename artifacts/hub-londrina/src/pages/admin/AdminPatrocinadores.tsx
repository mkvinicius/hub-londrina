import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  adminFetch,
  listAdminPartners,
  createAdminPartner,
  updateAdminPartner,
  deleteAdminPartner,
  uploadPartnerLogo,
  type AdminPartner,
} from "@/lib/admin-api";
import { imgSrc } from "@/lib/utils";
import { Award, Plus, Trash2, Eye, EyeOff, RefreshCw, Pencil, Upload, ExternalLink } from "lucide-react";

interface ListBusiness {
  id: number;
  name: string;
  zone: string | null;
  status: string;
  isVisible: boolean;
}

interface FormState {
  name: string;
  tier: "master" | "apoiador";
  logoUrl: string;
  businessId: string;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  tier: "apoiador",
  logoUrl: "",
  businessId: "",
  isActive: true,
  sortOrder: "0",
};

export default function AdminPatrocinadores() {
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [businesses, setBusinesses] = useState<ListBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"master" | "apoiador" | "all">("master");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchPartners() {
    setLoading(true);
    try {
      const { data } = await listAdminPartners();
      setPartners(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBusinesses() {
    const data = await adminFetch("/api/admin/businesses?limit=500");
    const list = (data.data || []) as ListBusiness[];
    setBusinesses(list.filter((b) => b.status === "active" && b.isVisible));
  }

  useEffect(() => {
    fetchPartners();
    fetchBusinesses();
  }, []);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  }

  function startEdit(p: AdminPartner) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      tier: p.tier,
      logoUrl: p.logoUrl,
      businessId: p.businessId ? String(p.businessId) : "",
      isActive: p.isActive,
      sortOrder: String(p.sortOrder),
    });
    setShowForm(true);
    setError("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { logoUrl } = await uploadPartnerLogo(file);
      setForm((f) => ({ ...f, logoUrl }));
    } catch (err: any) {
      setError(err.message || "Erro ao enviar logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Nome é obrigatório."); return; }
    if (!form.logoUrl) { setError("Envie uma logo."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        tier: form.tier,
        logoUrl: form.logoUrl,
        businessId: form.businessId ? Number(form.businessId) : null,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await updateAdminPartner(editingId, payload);
      } else {
        await createAdminPartner(payload);
      }
      resetForm();
      setShowForm(false);
      fetchPartners();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: AdminPartner) {
    await updateAdminPartner(p.id, { isActive: !p.isActive });
    fetchPartners();
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este patrocinador?")) return;
    await deleteAdminPartner(id);
    fetchPartners();
  }

  const masters = partners.filter((p) => p.tier === "master");
  const apoiadores = partners.filter((p) => p.tier === "apoiador");
  const visible = tab === "master" ? masters : tab === "apoiador" ? apoiadores : partners;

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <Award className="w-6 h-6 text-[#d97706]" />
            Patrocinadores e Apoiadores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Logos exibidas na home no lugar dos depoimentos. Master no grid superior, Apoiadores no carrossel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchPartners(); fetchBusinesses(); }}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            data-testid="button-refresh-partners"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => { if (showForm) { resetForm(); setShowForm(false); } else { resetForm(); setShowForm(true); } }}
            className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
            data-testid="button-new-partner"
          >
            <Plus className="w-4 h-4" /> Novo Patrocinador
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {([
          ["master", `Master (${masters.length})`],
          ["apoiador", `Apoiadores (${apoiadores.length})`],
          ["all", `Todos (${partners.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === key ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">
            {editingId ? `Editar patrocinador #${editingId}` : "Novo patrocinador"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
                placeholder="Ex: Padaria São José"
                required
                data-testid="input-partner-name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tier *</label>
              <select
                value={form.tier}
                onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as "master" | "apoiador" }))}
                className={inputClass}
                data-testid="select-partner-tier"
              >
                <option value="master">Master (grid principal)</option>
                <option value="apoiador">Apoiador (carrossel)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo *</label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                  {form.logoUrl ? (
                    <img src={imgSrc(form.logoUrl)} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFile}
                    className="text-sm"
                    data-testid="input-partner-logo"
                  />
                  <p className="text-xs text-gray-400 mt-1">PNG/JPG/WEBP/SVG até 2MB. Prefira fundo transparente.</p>
                  {uploading && <p className="text-xs text-amber-600 mt-1">Enviando...</p>}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Negócio vinculado (opcional)
              </label>
              <select
                value={form.businessId}
                onChange={(e) => setForm((f) => ({ ...f, businessId: e.target.value }))}
                className={inputClass}
                data-testid="select-partner-business"
              >
                <option value="">— Sem vínculo (logo não-clicável) —</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.zone ? `(${b.zone})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Se vinculado, o clique leva para <code>/negocio/&lt;id&gt;</code>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ordem (menor = primeiro)</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className={inputClass}
                data-testid="input-partner-sort"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                  data-testid="checkbox-partner-active"
                />
                Ativo (exibir na home)
              </label>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              data-testid="button-save-partner"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar patrocinador"}
            </button>
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(false); }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">Carregando...</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum patrocinador nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border ${p.isActive ? "border-[#d97706]/40" : "border-gray-200"} overflow-hidden shadow-sm`}
              data-testid={`row-partner-${p.id}`}
            >
              <div className="h-28 bg-gray-50 flex items-center justify-center p-4">
                <img src={imgSrc(p.logoUrl)} alt={p.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-gray-800 text-sm">{p.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.tier === "master" ? "bg-[#d97706] text-white" : "bg-[#6F4E37]/10 text-[#6F4E37]"
                    }`}
                  >
                    {p.tier === "master" ? "MASTER" : "APOIADOR"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  Ordem: {p.sortOrder} • {p.isActive ? "Ativo" : "Inativo"}
                </p>
                {p.businessName ? (
                  <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {p.businessName}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mb-3">Sem vínculo (logo não-clicável)</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleActive(p)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      p.isActive
                        ? "text-gray-600 bg-gray-100 hover:bg-gray-200"
                        : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    }`}
                  >
                    {p.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {p.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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
