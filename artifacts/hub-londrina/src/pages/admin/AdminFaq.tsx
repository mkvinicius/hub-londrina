import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  listAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  type AdminFaq,
} from "@/lib/admin-api";
import { HelpCircle, Plus, Edit2, Trash2, Save, X, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

const CATEGORIES: { value: AdminFaq["category"]; label: string }[] = [
  { value: "consumidor", label: "Consumidor" },
  { value: "lojista", label: "Lojista" },
  { value: "lgpd", label: "LGPD / Privacidade" },
];

const emptyDraft = (category: AdminFaq["category"]): Partial<AdminFaq> => ({
  category,
  question: "",
  answer: "",
  sortOrder: 0,
  isActive: true,
});

export default function AdminFaqPage() {
  const [tab, setTab] = useState<AdminFaq["category"]>("consumidor");
  const [items, setItems] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<AdminFaq> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const j = await listAdminFaqs();
      setItems(j.data);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((f) => f.category === tab);

  function startCreate() {
    setEditing(emptyDraft(tab));
    setMsg(null);
  }

  function startEdit(f: AdminFaq) {
    setEditing({ ...f });
    setMsg(null);
  }

  async function save() {
    if (!editing) return;
    const question = String(editing.question || "").trim();
    const answer = String(editing.answer || "").trim();
    if (question.length < 3) return setMsg({ type: "err", text: "Pergunta muito curta." });
    if (answer.length < 3) return setMsg({ type: "err", text: "Resposta muito curta." });

    setSubmitting(true);
    setMsg(null);
    try {
      if (editing.id) {
        await updateAdminFaq(editing.id, {
          category: editing.category,
          question,
          answer,
          sortOrder: Number(editing.sortOrder ?? 0),
          isActive: editing.isActive ?? true,
        });
        setMsg({ type: "ok", text: "FAQ atualizada." });
      } else {
        await createAdminFaq({
          category: editing.category!,
          question,
          answer,
          sortOrder: Number(editing.sortOrder ?? 0),
          isActive: editing.isActive ?? true,
        });
        setMsg({ type: "ok", text: "FAQ criada." });
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(f: AdminFaq) {
    try {
      await updateAdminFaq(f.id, { isActive: !f.isActive });
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta FAQ?")) return;
    try {
      await deleteAdminFaq(id);
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#d97706]" />
              FAQ
            </h1>
            <p className="text-sm text-gray-500 mt-1">Gerencie as perguntas frequentes exibidas em /faq.</p>
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2 rounded-xl"
            data-testid="button-new-faq"
          >
            <Plus className="w-4 h-4" /> Nova pergunta
          </button>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-1">
            {CATEGORIES.map((c) => {
              const count = items.filter((f) => f.category === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setTab(c.value)}
                  data-testid={`tab-${c.value}`}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    tab === c.value ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {c.label} <span className="ml-1.5 text-xs text-gray-400">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {msg && (
          <div
            className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 mb-4 ${
              msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma pergunta nesta categoria.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered
              .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
              .map((f) => (
                <div
                  key={f.id}
                  className={`bg-white border rounded-2xl p-4 ${f.isActive ? "border-gray-100" : "border-gray-200 opacity-60"}`}
                  data-testid={`faq-row-${f.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          #{f.sortOrder}
                        </span>
                        {!f.isActive && (
                          <span className="text-[10px] font-bold uppercase bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                            Inativa
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800">{f.question}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{f.answer}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(f)}
                        className="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                        title={f.isActive ? "Desativar" : "Ativar"}
                      >
                        {f.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => startEdit(f)}
                        className="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                        data-testid={`button-edit-${f.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(f.id)}
                        className="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditing(null)}>
            <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-800 text-lg">{editing.id ? "Editar FAQ" : "Nova FAQ"}</h2>
                <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Categoria</label>
                  <select
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value as AdminFaq["category"] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Pergunta *</label>
                  <input
                    type="text"
                    value={editing.question ?? ""}
                    onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                    maxLength={300}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                    data-testid="input-question"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Resposta *</label>
                  <textarea
                    value={editing.answer ?? ""}
                    onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                    rows={6}
                    maxLength={4000}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none resize-y"
                    data-testid="input-answer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Ordem</label>
                    <input
                      type="number"
                      value={editing.sortOrder ?? 0}
                      onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={editing.isActive ?? true}
                        onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                        className="w-4 h-4"
                      />
                      Ativa (visível no site)
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={save}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                    data-testid="button-save-faq"
                  >
                    <Save className="w-4 h-4" />
                    {submitting ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
