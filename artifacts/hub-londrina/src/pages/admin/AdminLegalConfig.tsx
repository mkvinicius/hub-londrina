import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { csrfFetch } from "@/lib/csrf";
import { invalidateLegalConfigCache } from "@/lib/legal-config";
import { FileText, Plus, Trash2, Save, X, Loader2, AlertTriangle, Edit3 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface LegalRow {
  key: string;
  value: string;
  isCore: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

const HELP: Record<string, string> = {
  COMPANY_NAME: "Razão social registrada na Receita Federal",
  COMPANY_CNPJ: "CNPJ formatado (00.000.000/0000-00)",
  COMPANY_ADDRESS: "Endereço da sede (aparece em Termos e Privacidade)",
  CONTACT_EMAIL: "Email público de contato (footer, contratos)",
  DPO_EMAIL: "Email do encarregado de dados (LGPD — footer e Privacidade)",
  TERMS_VERSION: "Versão dos Termos. Alterar força re-aceite no próximo cadastro.",
  LAST_UPDATED: "Data formatada DD/MM/AAAA — exibida em Termos e Privacidade",
  RETENTION_MONTHS: "Meses para apagar documentos após cancelamento (cron diário)",
  PLATFORM_NAME: "Nome comercial exibido nas páginas legais",
  PLATFORM_URL: "URL canônica da plataforma",
};

export default function AdminLegalConfig() {
  const [rows, setRows] = useState<LegalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const j = await adminFetch("/api/admin/legal-config");
      setRows(j.data || []);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message || "Erro ao carregar" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(r: LegalRow) {
    setEditing((e) => ({ ...e, [r.key]: r.value }));
  }

  function cancelEdit(key: string) {
    setEditing((e) => {
      const c = { ...e }; delete c[key]; return c;
    });
  }

  async function saveKey(key: string) {
    const value = editing[key];
    if (value === undefined) return;
    setSavingKey(key);
    setMsg(null);
    try {
      const token = localStorage.getItem("hub_admin_token");
      const resp = await csrfFetch(`${API_BASE}/api/admin/legal-config/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Falha ao salvar");
      invalidateLegalConfigCache();
      cancelEdit(key);
      await load();
      setMsg({ type: "ok", text: `${key} atualizado.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSavingKey(null);
    }
  }

  async function createCustom() {
    setCreating(true);
    setMsg(null);
    try {
      const token = localStorage.getItem("hub_admin_token");
      const resp = await csrfFetch(`${API_BASE}/api/admin/legal-config`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: newKey.trim().toUpperCase(), value: newValue }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Falha ao criar");
      invalidateLegalConfigCache();
      setShowAdd(false);
      setNewKey(""); setNewValue("");
      await load();
      setMsg({ type: "ok", text: "Campo criado." });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(key: string) {
    setSavingKey(key);
    try {
      const token = localStorage.getItem("hub_admin_token");
      const resp = await csrfFetch(`${API_BASE}/api/admin/legal-config/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Falha ao excluir");
      invalidateLegalConfigCache();
      setConfirmDelete(null);
      await load();
      setMsg({ type: "ok", text: "Campo excluído." });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#d97706]" /> Config Legal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dados usados em Termos, Privacidade, footer, cadastro e job de retenção.
            Campos do <strong>Sistema</strong> não podem ser excluídos. Editar <strong>TERMS_VERSION</strong> força re-aceite no próximo cadastro.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-5 py-2.5 rounded-xl text-sm"
        >
          <Plus className="w-4 h-4" /> Novo campo
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.type === "err" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Chave</th>
                <th className="text-left px-4 py-3 font-bold">Valor</th>
                <th className="text-left px-4 py-3 font-bold w-32">Tipo</th>
                <th className="text-right px-4 py-3 font-bold w-48">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const isEditing = editing[r.key] !== undefined;
                return (
                  <tr key={r.key} data-testid={`row-legal-${r.key}`}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono font-bold text-gray-800">{r.key}</div>
                      {HELP[r.key] && <div className="text-xs text-gray-500 mt-1 max-w-md">{HELP[r.key]}</div>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {isEditing ? (
                        <textarea
                          value={editing[r.key]}
                          onChange={(e) => setEditing((s) => ({ ...s, [r.key]: e.target.value }))}
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                          data-testid={`input-legal-${r.key}`}
                        />
                      ) : (
                        <div className="font-mono text-gray-700 break-all">{r.value}</div>
                      )}
                      {r.updatedAt && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          Atualizado em {new Date(r.updatedAt).toLocaleString("pt-BR")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {r.isCore ? (
                        <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">Sistema</span>
                      ) : (
                        <span className="inline-block bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">Custom</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-right space-x-2 whitespace-nowrap">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveKey(r.key)}
                            disabled={savingKey === r.key}
                            className="inline-flex items-center gap-1 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                            data-testid={`button-save-${r.key}`}
                          >
                            {savingKey === r.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                          </button>
                          <button
                            onClick={() => cancelEdit(r.key)}
                            className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                          >
                            <X className="w-3 h-3" /> Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(r)}
                            className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                            data-testid={`button-edit-${r.key}`}
                          >
                            <Edit3 className="w-3 h-3" /> Editar
                          </button>
                          {!r.isCore && (
                            <button
                              onClick={() => setConfirmDelete(r.key)}
                              className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg"
                              data-testid={`button-delete-${r.key}`}
                            >
                              <Trash2 className="w-3 h-3" /> Excluir
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-gray-800 mb-4">Novo campo customizado</h2>
            <label className="block text-xs font-bold text-gray-700 mb-1">Chave (MAIÚSCULA, sem espaços)</label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              placeholder="EX: SAC_PHONE"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-[#d97706]"
              data-testid="input-new-key"
            />
            <label className="block text-xs font-bold text-gray-700 mb-1">Valor</label>
            <textarea
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-[#d97706]"
              data-testid="input-new-value"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={createCustom}
                disabled={creating || !newKey || !newValue}
                className="px-4 py-2 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-lg disabled:opacity-50 flex items-center gap-2"
                data-testid="button-create-custom"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />} Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" /> Excluir campo
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Tem certeza que deseja excluir o campo <strong className="font-mono">{confirmDelete}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={() => deleteKey(confirmDelete)}
                disabled={savingKey === confirmDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                data-testid="button-confirm-delete"
              >
                {savingKey === confirmDelete && <Loader2 className="w-4 h-4 animate-spin" />} Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
