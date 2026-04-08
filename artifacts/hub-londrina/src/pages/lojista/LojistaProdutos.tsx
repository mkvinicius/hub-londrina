import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/lojista-api";
import { Plus, Trash2, Edit2, X, Check } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", mediaUrl: "", mediaType: "image", whatsappLink: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getProducts().then(r => setProducts(r.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  function resetForm() {
    setForm({ name: "", description: "", price: "", mediaUrl: "", mediaType: "image", whatsappLink: "" });
    setShowForm(false);
    setEditId(null);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-800">Produtos</h1>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm">
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        )}
      </div>

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
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">URL da Mídia</label>
              <input value={form.mediaUrl} onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))} placeholder="https://..." className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Mídia</label>
              <select value={form.mediaType} onChange={e => setForm(f => ({ ...f, mediaType: e.target.value }))} className={inputCls}>
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
              </select>
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
