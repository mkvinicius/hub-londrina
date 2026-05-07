import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import {
  getSupportTickets,
  createSupportTicket,
  type SupportTicket,
} from "@/lib/lojista-api";
import {
  HelpCircle,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
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
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LojistaSuporte() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");

  async function load() {
    setLoading(true);
    try {
      const res = await getSupportTickets();
      setTickets(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createSupportTicket({ subject: subject.trim(), message: message.trim(), priority });
      setSubject("");
      setMessage("");
      setPriority("normal");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LojistaLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#d97706]" />
              Suporte
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tire dúvidas, relate problemas ou peça ajuda à equipe Hub Londrina.
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Cancelar" : "Novo ticket"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Assunto</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                maxLength={200}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
                placeholder="Ex.: Não consigo subir banner"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Prioridade</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none"
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={5000}
                required
                rows={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-[#d97706] focus:outline-none resize-y"
                placeholder="Descreva sua dúvida ou problema com o máximo de detalhes possível."
              />
              <p className="text-[10px] text-gray-400 mt-1">{message.length} / 5000</p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#d97706] hover:bg-[#b45309] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar ticket"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500 text-sm">
            Carregando tickets…
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <HelpCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Você ainda não abriu nenhum ticket.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => {
              const st = STATUS_MAP[t.status] ?? STATUS_MAP.open;
              const pr = PRIORITY_MAP[t.priority] ?? PRIORITY_MAP.normal;
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <h3 className="font-bold text-gray-800 text-base">{t.subject}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${pr.cls}`}>
                        {pr.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>
                        {st.icon}
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">{t.message}</p>
                  <p className="text-[11px] text-gray-400">Aberto em {formatDate(t.createdAt)}</p>
                  {t.adminResponse && (
                    <div className="mt-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg p-3">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase mb-1">
                        Resposta da equipe Hub Londrina
                        {t.respondedAt && <span className="ml-2 font-normal text-emerald-600">— {formatDate(t.respondedAt)}</span>}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{t.adminResponse}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LojistaLayout>
  );
}
