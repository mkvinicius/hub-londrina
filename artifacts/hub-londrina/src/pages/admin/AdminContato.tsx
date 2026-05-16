import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  adminFetch,
  getAdminToken,
  listContactMessages,
  updateContactMessage,
  deleteContactMessage,
  type AdminContactMessage,
} from "@/lib/admin-api";
import { csrfFetch } from "@/lib/csrf";
import {
  Mail,
  Settings,
  Inbox,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  XCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface LegalRow {
  key: string;
  value: string;
  isCore: boolean;
}

const CONTACT_KEYS = [
  {
    key: "WHATSAPP_CONTATO",
    label: "WhatsApp de contato",
    help: "Apenas dígitos com DDI/DDD. Ex.: 5543999990000",
    placeholder: "5543999990000",
    defaultValue: "5543999990000",
  },
  {
    key: "ATENDIMENTO_HORARIO",
    label: "Horário de atendimento",
    help: "Texto livre exibido na página /contato.",
    placeholder: "Seg–Sex, 9h às 18h",
    defaultValue: "Seg–Sex, 9h às 18h",
  },
  {
    key: "MAP_EMBED_URL",
    label: "URL do mapa (Google Maps embed)",
    help: "URL completa do iframe do Google Maps. Use o link Compartilhar → Incorporar.",
    placeholder: "https://www.google.com/maps?q=Londrina,PR&output=embed",
    defaultValue: "https://www.google.com/maps?q=Londrina,PR&output=embed",
  },
];

const STATUS_OPTIONS = [
  { value: "new", label: "Nova", cls: "bg-blue-100 text-blue-700" },
  { value: "read", label: "Lida", cls: "bg-amber-100 text-amber-700" },
  { value: "replied", label: "Respondida", cls: "bg-green-100 text-green-700" },
  { value: "archived", label: "Arquivada", cls: "bg-gray-100 text-gray-500" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminContato() {
  const [tab, setTab] = useState<"config" | "mensagens">("mensagens");

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#d97706]" />
              Contato
            </h1>
            <p className="text-sm text-gray-500 mt-1">Mensagens recebidas e configurações da página pública /contato.</p>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-1">
            <button
              onClick={() => setTab("mensagens")}
              data-testid="tab-mensagens"
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === "mensagens" ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Inbox className="w-4 h-4" /> Mensagens
              </span>
            </button>
            <button
              onClick={() => setTab("config")}
              data-testid="tab-config"
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === "config" ? "border-[#d97706] text-[#d97706]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Settings className="w-4 h-4" /> Configurações
              </span>
            </button>
          </div>
        </div>

        {tab === "mensagens" ? <MensagensPanel /> : <ConfigPanel />}
      </div>
    </AdminLayout>
  );
}

function ConfigPanel() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const j = await adminFetch("/api/admin/legal-config");
      const rows: LegalRow[] = j.data || [];
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      setValues(map);
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(key: string) {
    const value = editing[key];
    if (value === undefined) return;
    if (!value.trim()) {
      setMsg({ type: "err", text: "Valor obrigatório." });
      return;
    }
    setSavingKey(key);
    setMsg(null);
    try {
      const token = getAdminToken();
      const resp = await csrfFetch(`${API_BASE}/api/admin/legal-config/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ value }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Falha ao salvar");
      setEditing((e) => {
        const c = { ...e };
        delete c[key];
        return c;
      });
      await load();
      setMsg({ type: "ok", text: `${key} atualizado.` });
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">Carregando…</div>;
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
            msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {msg.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {CONTACT_KEYS.map((k) => {
        const current = values[k.key] ?? k.defaultValue;
        const isEditing = editing[k.key] !== undefined;
        const draft = editing[k.key] ?? current;
        return (
          <div key={k.key} className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="font-bold text-gray-800">{k.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {k.help} <span className="text-gray-400">· chave: <code>{k.key}</code></span>
                </p>
              </div>
              {!values[k.key] && (
                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  padrão
                </span>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(e) => setEditing((s) => ({ ...s, [k.key]: e.target.value }))}
                  rows={k.key === "MAP_EMBED_URL" ? 3 : 2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none resize-y"
                  placeholder={k.placeholder}
                  data-testid={`input-${k.key}`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => save(k.key)}
                    disabled={savingKey === k.key}
                    className="inline-flex items-center gap-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingKey === k.key ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    onClick={() =>
                      setEditing((s) => {
                        const c = { ...s };
                        delete c[k.key];
                        return c;
                      })
                    }
                    className="bg-white border border-gray-200 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700 break-all">
                  {current}
                </code>
                <button
                  onClick={() => setEditing((s) => ({ ...s, [k.key]: current }))}
                  className="text-xs font-semibold text-[#d97706] hover:underline"
                  data-testid={`button-edit-${k.key}`}
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MensagensPanel() {
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState<AdminContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<AdminContactMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [draftStatus, setDraftStatus] = useState("read");
  const [draftNotes, setDraftNotes] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const j = await listContactMessages({ status: statusFilter || undefined, limit: 100 });
      setItems(j.data);
      setNewCount(j.newCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function open(m: AdminContactMessage) {
    setActive(m);
    setDraftStatus(m.status === "new" ? "read" : m.status);
    setDraftNotes(m.adminNotes ?? "");
    if (m.status === "new") {
      // marcar como lida automaticamente em background
      updateContactMessage(m.id, { status: "read" }).then(() => load()).catch(() => {});
    }
  }

  async function saveActive() {
    if (!active) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateContactMessage(active.id, { status: draftStatus, adminNotes: draftNotes });
      setActive(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Excluir esta mensagem? Esta ação não pode ser desfeita.")) return;
    try {
      await deleteContactMessage(id);
      if (active?.id === id) setActive(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Total: <strong className="text-gray-800">{items.length}</strong></span>
          {newCount > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {newCount} nova{newCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            data-testid="select-status-filter"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma mensagem.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Remetente</th>
                <th className="text-left px-4 py-3">Assunto</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Recebido</th>
                <th className="text-right px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((m) => {
                const st = STATUS_OPTIONS.find((s) => s.value === m.status) ?? STATUS_OPTIONS[0];
                return (
                  <tr key={m.id} className={`hover:bg-gray-50/60 ${m.status === "new" ? "bg-blue-50/30" : ""}`} data-testid={`row-message-${m.id}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{m.name}</div>
                      <div className="text-xs text-gray-400 break-all">{m.email}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-gray-800 line-clamp-1">{m.subject}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{m.message}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => open(m)}
                        className="inline-flex items-center gap-1 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                        data-testid={`button-open-${m.id}`}
                      >
                        <Eye className="w-3 h-3" /> Abrir
                      </button>
                      <button
                        onClick={() => remove(m.id)}
                        className="ml-1.5 inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActive(null)}>
          <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">{active.subject}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  <strong>{active.name}</strong> · <a href={`mailto:${active.email}`} className="underline">{active.email}</a>
                  {active.phone && <> · {active.phone}</>}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(active.createdAt)}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">Mensagem</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{active.message}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Notas internas</label>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none resize-y"
                  placeholder="Observações internas (não enviadas ao remetente)."
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Status</label>
                <select
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <a
                  href={`mailto:${active.email}?subject=${encodeURIComponent("Re: " + active.subject)}`}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50"
                >
                  <Mail className="w-4 h-4" /> Responder por email
                </a>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActive(null)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={saveActive}
                    disabled={submitting}
                    className="bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {submitting ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
