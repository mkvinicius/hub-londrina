import { useEffect, useState, useRef } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, getProducts, createProduct, updateProduct, deleteProduct, getLojistaToken } from "@/lib/lojista-api";
import { Plus, Trash2, Edit2, X, Check, Upload, Link2 } from "lucide-react";
import { LockedFeature } from "@/components/LockedFeature";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  whatsappLink: string | null;
  isActive: boolean;
  sortOrder: number;
}

export default function LojistaProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", mediaUrl: "", mediaType: "image", whatsappLink: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [mediaMode, setMediaMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getProfile(), getProducts()])
      .then(([p, r]) => {
        setProfile(p);
        setProducts(r.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  if (profile?.planType === "free") {
    return (
      <LojistaLayout>
        <h1 className="text-2xl font-black text-gray-800 mb-6">Produtos</h1>
        <LockedFeature planRequired="destaque" currentPlan={profile?.planType || "free"} message="Vitrine de Produtos disponível nos planos Destaque e Premium">
          <div />
        </LockedFeature>
      </LojistaLayout>
    );
  }

  const PRODUCT_LIMITS: Record<string, number> = { destaque: 10, premium: 999 };
  const productLimit = PRODUCT_LIMITS[profile?.planType] ?? 0;
  const reachedLimit = products.length >= productLimit;

  function resetForm() {
    setForm({ name: "", description: "", price: "", mediaUrl: "", mediaType: "image", whatsappLink: "" });
    setShowForm(false);
    setEditId(null);
    setMediaMode("url");
    setUploadPreview(null);
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price || "",
      mediaUrl: p.mediaUrl || "",
      mediaType: p.mediaType || "image",
      whatsappLink: p.whatsappLink || "",
    });
    setEditId(p.id);
    setShowForm(true);
    setMediaMode("url");
    setUploadPreview(p.mediaUrl || null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setMsg(`Arquivo muito grande. Máximo: ${isVideo ? "50MB" : "10MB"}`);
      return;
    }

    setUploading(true);
    setMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getLojistaToken();
      const res = await fetch(`${API_BASE}/api/lojista/upload/product-media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");
      setForm(f => ({ ...f, mediaUrl: data.mediaUrl, mediaType: data.mediaType }));
      if (data.mediaType === "image") setUploadPreview(data.mediaUrl);
      else setUploadPreview(null);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    setMsg("");
    try {
      if (editId) {
        const result = await updateProduct(editId, form);
        setProducts(ps => ps.map(p => p.id === editId ? result : p));
        setMsg("Produto atualizado!");
      } else {
        const result = await createProduct(form);
        setProducts(ps => [...ps, result]);
        setMsg("Produto criado!");
      }
      resetForm();
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este produto?")) return;
    try {
      await deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      setMsg("Produto excluído");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    }
  }

  async function handleToggle(p: Product) {
    try {
      const result = await updateProduct(p.id, { isActive: !p.isActive });
      setProducts(ps => ps.map(x => x.id === p.id ? result : x));
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent";

  return (
    <LojistaLayout>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black text-gray-800">Produtos</h1>
        {!showForm && (
          <button
            onClick={() => { if (!reachedLimit) { resetForm(); setShowForm(true); } }}
            disabled={reachedLimit}
            title={reachedLimit ? `Limite de ${productLimit} produtos atingido. Faça upgrade para Premium.` : ""}
            className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {products.length}/{productLimit === 999 ? "ilimitado" : productLimit} produtos cadastrados
        {profile?.planType === "destaque" && (
          <> · <a href="/lojista/plano" className="text-[#d97706] font-bold hover:underline">Upgrade para Premium</a> para cadastrar mais</>
        )}
      </p>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">{editId ? "Editar Produto" : "Novo Produto"}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="49.90" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Mídia do Produto</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMediaMode("upload")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${mediaMode === "upload" ? "bg-[#d97706] text-white border-[#d97706]" : "bg-white text-gray-600 border-gray-300 hover:border-[#d97706]"}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Fazer upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode("url")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${mediaMode === "url" ? "bg-[#d97706] text-white border-[#d97706]" : "bg-white text-gray-600 border-gray-300 hover:border-[#d97706]"}`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  URL externa
                </button>
              </div>

              {mediaMode === "upload" ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,video/mp4"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-500 hover:border-[#d97706] hover:text-[#d97706] transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">
                      {uploading ? "Enviando..." : "Clique para selecionar arquivo"}
                    </span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP (máx 10MB) · MP4 (máx 50MB)</span>
                  </button>
                  {uploadPreview && (
                    <img src={uploadPreview} alt="Preview" className="mt-3 w-full max-h-48 rounded-xl object-cover border border-gray-200" />
                  )}
                  {form.mediaUrl && form.mediaType === "video" && (
                    <p className="mt-2 text-xs text-green-600 font-medium">✓ Vídeo enviado com sucesso</p>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={form.mediaUrl}
                    onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                    placeholder="https://..."
                    className={inputCls + " flex-1"}
                  />
                  <select
                    value={form.mediaType}
                    onChange={e => setForm(f => ({ ...f, mediaType: e.target.value }))}
                    className="border border-gray-300 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                  >
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Link WhatsApp</label>
              <input value={form.whatsappLink} onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))} placeholder="https://wa.me/5543..." className={inputCls} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={resetForm} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      {products.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center text-gray-400">
          <p className="text-lg mb-2">Nenhum produto cadastrado</p>
          <p className="text-sm">Clique em "Novo Produto" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 ${!p.isActive ? "opacity-60" : ""}`}>
              {p.mediaUrl && p.mediaType === "image" && (
                <img src={p.mediaUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500 truncate">{p.description}</p>}
              </div>
              {p.price && (
                <span className="text-lg font-bold text-[#d97706] whitespace-nowrap">R$ {p.price}</span>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {p.isActive ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-[#d97706]"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </LojistaLayout>
  );
}
