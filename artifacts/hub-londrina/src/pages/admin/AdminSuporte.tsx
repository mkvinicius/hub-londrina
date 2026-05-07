import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  listSupportTickets,
  updateSupportTicket,
  type AdminSupportTicket,
} from "@/lib/admin-api";
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  AlertCircle,
  Send,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  open: { label: "Aberto", cls: "bg-blue-100 text-blue-700", icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: "Em andamento", cls: "bg-amber-100 text-amber-700", icon: <RefreshCw className="w-3.5 h-3.5" /> },
  resolved: { label: "Resolvido", cls: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  closed: { label: "Fechado", cls: "bg-gray-100 text-gray-500", icon: <XCircle className="w-3.5 h-3.5" /> },
};

const PRIORITY_MAP: Record<string, { label: string; cls: string }> = {
  low: { label: "Baixa", cls: "bg-gray-100 text-gray-600" },
  normal: { label: "Normal", cls: "bg-blue-50 text-blue-600" },
  high: { label: "Alta", cls: "bg-orange-50 text-orange-700" },
  urgent: { label: "Urgente", cls: "bg-red-100 text-red-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSuporte() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [activeTicket, setActiveTicket] = useState<AdminSupportTicket | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState("resolved");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await listSupportTickets({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setTickets(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter, priorityFilter]);

  function openTicket(t: AdminSupportTicket) {
    setActiveTicket(t);
    setResponseText(t.adminResponse ?? "");
    setResponseStatus(t.status === "open" ? "resolved" : t.status);
  }

  async function handleRespond() {
    if (!activeTicket) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateSupportTicket(activeTicket.id, {
        adminResponse: responseText.trim() || undefined,
        status: responseStatus,
      });
      setActiveTicket(null);
      setResponseText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function quickStatus(t: AdminSupportTicket, status: string) {
    setSubmitting(true);
    try {
      await updateSupportTicket(t.id, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#d97706]" />
              Tickets de Suporte
            </h1>
            <p className="text-sm text-gray-500 mt-1">Atenda lojistas e responda dúvidas.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="">Todos os status</option>
              <option value="open">Aberto</option>
              <option value="in_progress">Em andamento</option>
              <option value="resolved">Resolvido</option>
              <option value="closed">Fechado</option>
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="">Toda prioridade</option>
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
            <button
              onClick={load}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">
            Carregando…
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhum ticket encontrado.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Negócio</th>
                  <th className="text-left px-4 py-3">Assunto</th>
                  <th className="text-left px-4 py-3">Prioridade</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Aberto em</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map(t => {
                  const st = STATUS_MAP[t.status] ?? STATUS_MAP.open;
                  const pr = PRIORITY_MAP[t.priority] ?? PRIORITY_MAP.normal;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{t.businessName ?? `#${t.businessId}`}</div>
                        <div className="text-xs text-gray-400">{t.ownerEmail ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-gray-800 line-clamp-1">{t.subject}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">{t.message}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${pr.cls}`}>{pr.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.icon}{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openTicket(t)}
                          className="inline-flex items-center gap-1 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                        >
                          <Send className="w-3 h-3" />
                          Abrir
                        </button>
                        {t.status !== "closed" && (
                          <button
                            onClick={() => quickStatus(t, "closed")}
                            disabled={submitting}
                            className="ml-1.5 inline-flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            Fechar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTicket && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setActiveTicket(null)}>
            <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">{activeTicket.subject}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{activeTicket.businessName} — {activeTicket.ownerEmail}</p>
                </div>
                <button onClick={() => setActiveTicket(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase text-gray-500 mb-1">Mensagem do lojista</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">{activeTicket.message}</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Resposta</label>
                  <textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    rows={6}
                    maxLength={5000}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none resize-y"
                    placeholder="Escreva a resposta. Será enviada por email ao lojista."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Novo status</label>
                  <select
                    value={responseStatus}
                    onChange={e => setResponseStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                  >
                    <option value="open">Aberto</option>
                    <option value="in_progress">Em andamento</option>
                    <option value="resolved">Resolvido</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActiveTicket(null)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={submitting}
                    className="bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    {submitting ? "Salvando…" : "Salvar e enviar email"}
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
