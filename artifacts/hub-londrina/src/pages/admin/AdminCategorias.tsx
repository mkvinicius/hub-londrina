import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/admin-api";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
  color: string;
  businessCount: number;
}

export default function AdminCategorias() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIcon, setNewIcon] = useState("store");
  const [newColor, setNewColor] = useState("orange");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await createCategory({ name: newName, slug: newSlug, icon: newIcon, color: newColor });
      setShowNew(false);
      setNewName("");
      setNewSlug("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleUpdate(id: number) {
    await updateCategory(id, { name: editName });
    setEditId(null);
    fetchData();
  }

  async function handleDelete(cat: Category) {
    if (cat.businessCount > 0) {
      alert(`Não é possível excluir "${cat.name}" — possui ${cat.businessCount} negócios vinculados.`);
      return;
    }
    if (!confirm(`Excluir categoria "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-800">Categorias</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Nome"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }}
              className="bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#d97706]"
              required
            />
            <input
              type="text"
              placeholder="Slug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#d97706]"
              required
            />
            <input
              type="text"
              placeholder="Ícone (ex: store)"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#d97706]"
            />
            <input
              type="text"
              placeholder="Cor (ex: orange)"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="bg-gray-50 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#d97706]"
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              Criar
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Nome</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Slug</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Ícone</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Cor</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-right">Negócios</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma categoria.</td></tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    {editId === cat.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-gray-50 rounded-lg px-2 py-1 text-sm outline-none border border-gray-200 focus:ring-1 focus:ring-[#d97706]"
                          autoFocus
                        />
                        <button onClick={() => handleUpdate(cat.id)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditId(null)} className="text-gray-400 hover:bg-gray-100 p-1 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-800">{cat.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-500">{cat.icon}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-gray-500">{cat.color}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{cat.businessCount}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditId(cat.id); setEditName(cat.name); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
