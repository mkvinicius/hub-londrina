import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { csrfFetch } from "@/lib/csrf";
import { Info, Save, X, Loader2, CheckCircle2, AlertCircle, Edit3, RotateCcw, ExternalLink } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface AboutRow {
  key: string;
  value: string;
  isCore: boolean;
  label: string;
  hint: string;
  isOverridden: boolean;
}

const JSON_KEYS = new Set(["VALUES_ITEMS", "BENEFITS_BIZ_ITEMS", "BENEFITS_CON_ITEMS"]);

function isJsonKey(key: string) { return JSON_KEYS.has(key); }

export default function AdminSobreNos() {
  const [rows, setRows] = useState<AboutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const j = await adminFetch("/api/admin/about-page");
      setRows(j.data || []);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Erro ao carregar" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(r: AboutRow) {
    setEditing(e => ({ ...e, [r.key]: r.value }));
  }

  function cancelEdit(key: string) {
    setEditing(e => { const n = { ...e }; delete n[key]; return n; });
    setMsg(null);
  }

  async function save(key: string) {
    const value = (editing[key] ?? "").trim();
    if (!value) { setMsg({ type: "err", text: "Valor não pode ser vazio." }); return; }

    if (isJsonKey(key)) {
      try { JSON.parse(value); } catch {
        setMsg({ type: "err", text: `O campo "${key}" deve ser um JSON válido.` });
        return;
      }
    }

    setSavingKey(key);
    setMsg(null);
    try {
      await csrfFetch(`${API_BASE}/api/admin/about-page/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("hub_admin_token")}` },
        body: JSON.stringify({ value }),
      });
      setMsg({ type: "ok", text: `"${key}" salvo com sucesso.` });
      setEditing(e => { const n = { ...e }; delete n[key]; return n; });
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Erro ao salvar" });
    } finally {
      setSavingKey(null);
    }
  }

  async function resetToDefault(key: string) {
    if (!confirm(`Remover customização de "${key}" e voltar ao conteúdo padrão?`)) return;
    try {
      await csrfFetch(`${API_BASE}/api/admin/about-page/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("hub_admin_token")}` },
      });
      setMsg({ type: "ok", text: `"${key}" revertido ao padrão.` });
      cancelEdit(key);
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Erro ao reverter" });
    }
  }

  const SECTION_ORDER = [
    ["HERO_TITLE", "HERO_SUBTITLE"],
    ["STORY_TITLE", "STORY_TEXT"],
    ["MISSION_TITLE", "MISSION_TEXT"],
    ["VALUES_TITLE", "VALUES_ITEMS"],
    ["BENEFITS_BIZ_TITLE", "BENEFITS_BIZ_ITEMS"],
    ["BENEFITS_CON_TITLE", "BENEFITS_CON_ITEMS"],
    ["CTA_TITLE", "CTA_TEXT"],
  ];
  const SECTION_NAMES: Record<string, string> = {
    "HERO_TITLE": "🎯 Seção Hero (topo)",
    "STORY_TITLE": "📖 Nossa História",
    "MISSION_TITLE": "🎯 Nossa Missão",
    "VALUES_TITLE": "💡 Nossos Valores",
    "BENEFITS_BIZ_TITLE": "🏪 Benefícios para Negócios",
    "BENEFITS_CON_TITLE": "👥 Benefícios para Consumidores",
    "CTA_TITLE": "🚀 Call to Action (rodapé)",
  };

  const rowMap = Object.fromEntries(rows.map(r => [r.key, r]));

  return (
    <AdminLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Info className="w-6 h-6 text-[#d97706]" />
              Página "Sobre Nós"
            </h1>
            <p className="text-sm text-gray-500 mt-1">Edite os textos e conteúdo exibidos em <code className="bg-gray-100 px-1 rounded">/sobre</code>.</p>
          </div>
          <a
            href="/sobre"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <ExternalLink className="w-4 h-4" />
            Ver página
          </a>
        </div>

        {/* Global message */}
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-6 ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Loader2 className="w-8 h-8 text-[#d97706] animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            {SECTION_ORDER.map((keys, si) => {
              const sectionKey = keys[0];
              const sectionName = SECTION_NAMES[sectionKey] || `Seção ${si + 1}`;
              return (
                <div key={si} className="bg-white border border-gray-100 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <h2 className="font-black text-gray-700 text-sm">{sectionName}</h2>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {keys.map(key => {
                      const row = rowMap[key];
                      if (!row) return null;
                      const isEditing = key in editing;
                      const isSaving = savingKey === key;
                      const isJson = isJsonKey(key);

                      return (
                        <div key={key} className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-gray-800">{row.label}</span>
                                {row.isOverridden && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Customizado</span>
                                )}
                                {isJson && (
                                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">JSON</span>
                                )}
                              </div>
                              {row.hint && <p className="text-xs text-gray-400 mt-0.5">{row.hint}</p>}
                            </div>
                            {!isEditing && (
                              <button
                                onClick={() => startEdit(row)}
                                className="inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editing[key] ?? ""}
                                onChange={e => setEditing(prev => ({ ...prev, [key]: e.target.value }))}
                                rows={isJson ? 12 : key.endsWith("_TEXT") ? 6 : 2}
                                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none resize-y font-mono ${isJson ? "bg-gray-50 text-xs focus:border-blue-400" : "focus:border-[#d97706]"} border-gray-200`}
                                placeholder={isJson ? "Array JSON..." : "Texto..."}
                                disabled={isSaving}
                              />
                              {isJson && (
                                <p className="text-[11px] text-blue-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                                  💡 Este campo é um array JSON. Edite com cuidado — um JSON inválido não será salvo.
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => save(key)}
                                  disabled={isSaving}
                                  className="inline-flex items-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                                >
                                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                  {isSaving ? "Salvando…" : "Salvar"}
                                </button>
                                <button
                                  onClick={() => cancelEdit(key)}
                                  disabled={isSaving}
                                  className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                  Cancelar
                                </button>
                                {row.isOverridden && !row.isCore && (
                                  <button
                                    onClick={() => resetToDefault(key)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-50 disabled:opacity-50 ml-auto"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Voltar ao padrão
                                  </button>
                                )}
                                {row.isOverridden && row.isCore && (
                                  <button
                                    onClick={() => resetToDefault(key)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-600 text-xs font-semibold px-3 py-2 rounded-xl hover:bg-red-50 disabled:opacity-50 ml-auto"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Restaurar padrão
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3 ${isJson ? "font-mono text-xs text-gray-500 max-h-32 overflow-y-auto" : "line-clamp-3 whitespace-pre-wrap"}`}
                            >
                              {isJson
                                ? (JSON.stringify(JSON.parse(row.value || "[]"), null, 2) || row.value)
                                : row.value}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
