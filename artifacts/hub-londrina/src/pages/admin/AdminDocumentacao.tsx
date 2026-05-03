import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { CheckCircle2, XCircle, Clock, Loader2, FileText, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface AdminDoc {
  id: number;
  businessId: number;
  documentType: string;
  signedUrl: string;
  status: "submitted" | "approved" | "rejected";
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

interface AdminItem {
  businessId: number;
  businessName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  cnpj: string | null;
  isVisible: boolean;
  planFrozen: boolean;
  documentationStatus: string | null;
  documentationRemainingDays: number | null;
  documentationTimerPaused: boolean | null;
  documentationDeadline: string | null;
  firstLoginAt: string | null;
  documents: AdminDoc[];
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "submitted", label: "Submetidos" },
  { key: "rejected", label: "Rejeitados" },
  { key: "expired", label: "Expirados" },
];

const TYPE_LABELS: Record<string, string> = {
  personal_id: "Documento Pessoal",
  cnpj_card: "Cartão CNPJ",
  address_proof: "Comprovante de Endereço",
};

function statusChip(status: string | null | undefined) {
  switch (status) {
    case "approved":
      return <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Aprovado</span>;
    case "submitted":
      return <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Em análise</span>;
    case "rejected":
      return <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Rejeitado</span>;
    case "expired":
      return <span className="text-xs font-semibold text-red-800 bg-red-200 px-2 py-0.5 rounded-full">Expirado</span>;
    default:
      return <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Pendente</span>;
  }
}

export default function AdminDocumentacao() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = (await adminFetch("/api/admin/documents")) as { items: AdminItem[] };
      setItems(r.items || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.documentationStatus === filter);
  }, [items, filter]);

  async function reviewDoc(docId: number, action: "approve" | "reject") {
    let reason: string | undefined;
    if (action === "reject") {
      const r = window.prompt("Motivo da rejeição (será enviado ao lojista):");
      if (!r?.trim()) return;
      reason = r.trim();
    }
    setActionLoading(docId);
    try {
      await adminFetch(`/api/admin/documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason }),
      });
      await load();
    } catch (e: any) {
      alert(e.message || "Erro ao processar");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Documentação dos Lojistas</h1>
            <p className="text-gray-600 text-sm">
              Aprove ou rejeite os documentos enviados. O timer do lojista é pausado durante a
              análise.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#d97706] text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
            Nenhum lojista nesta categoria.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const isOpen = openId === item.businessId;
              const daysLeft = item.documentationRemainingDays ?? 0;
              return (
                <div key={item.businessId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.businessId)}
                    className="w-full p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{item.businessName}</h3>
                        {statusChip(item.documentationStatus)}
                        {!item.isVisible && (
                          <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                            Offline
                          </span>
                        )}
                        {item.planFrozen && (
                          <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            Plano congelado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {item.ownerName} · {item.ownerEmail} · CNPJ {item.cnpj || "—"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {item.documentationStatus !== "approved" && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                            daysLeft <= 0
                              ? "bg-red-200 text-red-800"
                              : daysLeft <= 3
                                ? "bg-red-100 text-red-700"
                                : daysLeft <= 7
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {daysLeft <= 0 ? "expirado" : `${daysLeft}d restantes`}
                        </span>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {item.documents.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum documento enviado ainda.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-3">
                          {item.documents.map((d) => (
                            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-900">
                                  {TYPE_LABELS[d.documentType] || d.documentType}
                                </span>
                              </div>
                              <div className="mb-2">{statusChip(d.status)}</div>
                              {d.rejectionReason && (
                                <p className="text-xs bg-red-50 text-red-700 rounded p-2 mb-2">
                                  <strong>Motivo:</strong> {d.rejectionReason}
                                </p>
                              )}
                              <a
                                href={`${API_BASE}${d.signedUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-orange-700 hover:underline inline-block mb-3"
                              >
                                Abrir arquivo →
                              </a>
                              <div className="flex gap-2">
                                <button
                                  disabled={d.status === "approved" || actionLoading === d.id}
                                  onClick={() => reviewDoc(d.id, "approve")}
                                  className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                                </button>
                                <button
                                  disabled={actionLoading === d.id}
                                  onClick={() => reviewDoc(d.id, "reject")}
                                  className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Rejeitar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
