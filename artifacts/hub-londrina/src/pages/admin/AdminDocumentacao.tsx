import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { CheckCircle2, XCircle, Clock, Loader2, FileText, AlertTriangle, ChevronDown, Eye, ShieldCheck, RotateCcw } from "lucide-react";

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
  documentationAdminApproved?: boolean | null;
  documentationAdminApprovedAt?: string | null;
  documents: AdminDoc[];
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "submitted", label: "Submetidos" },
  { key: "rejected", label: "Rejeitados" },
  { key: "expired", label: "Expirados" },
  { key: "manual", label: "Aprov. manual" },
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
  const [manualLoading, setManualLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

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
    if (filter === "manual") return items.filter((i) => i.documentationAdminApproved === true);
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

  async function setManualApproval(item: AdminItem, approved: boolean) {
    if (approved) {
      const ok = window.confirm(
        `APROVAÇÃO MANUAL — "${item.businessName}"\n\n` +
          "Você está aprovando a documentação MANUALMENTE, mesmo sem os 3 documentos enviados/corretos, " +
          "e ASSUME TOTAL RESPONSABILIDADE por isso.\n\n" +
          "A loja será tratada como documentação aprovada: volta ao ar, recebe o selo Verificado, " +
          "deixa de expirar e os alertas somem.\n\nConfirmar?",
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `REVOGAR APROVAÇÃO MANUAL — "${item.businessName}"\n\n` +
          "O estado da documentação voltará a ser derivado dos documentos reais. " +
          "Se os 3 documentos não estiverem aprovados e o prazo já tiver estourado, a loja ficará offline (expirada).\n\nConfirmar?",
      );
      if (!ok) return;
    }
    setManualLoading(item.businessId);
    try {
      await adminFetch(`/api/admin/documents/business/${item.businessId}/override`, {
        method: "PATCH",
        body: JSON.stringify({ approved }),
      });
      await load();
    } catch (e: any) {
      alert(e.message || "Erro ao processar aprovação manual");
    } finally {
      setManualLoading(null);
    }
  }

  async function runBulkOverride() {
    const semDoc = items.filter(
      (i) => i.documentationAdminApproved !== true && i.documentationStatus !== "approved",
    ).length;
    const ok = window.confirm(
      "APROVAÇÃO MANUAL EM MASSA — assumir responsabilidade\n\n" +
        `Você vai aprovar MANUALMENTE a documentação de TODAS as lojas que ainda não têm os 3 ` +
        `documentos aprovados (estimado: ${semDoc} loja(s)), incluindo as que estão offline por ` +
        "documentação expirada — elas voltam ao ar.\n\n" +
        "Você ASSUME TOTAL RESPONSABILIDADE por essas aprovações. Lojas que já têm os 3 documentos " +
        "aprovados não são afetadas. É reversível loja a loja (botão Revogar).\n\nConfirmar?",
    );
    if (!ok) return;
    setBulkLoading(true);
    try {
      const r = (await adminFetch("/api/admin/documents/override-all-unapproved", {
        method: "POST",
      })) as { applied: number; failed?: { businessId: number }[] };
      await load();
      const failCount = r.failed?.length ?? 0;
      if (failCount > 0) {
        alert(
          `Aprovação manual aplicada a ${r.applied} loja(s).\n` +
            `${failCount} loja(s) falharam e NÃO foram aprovadas — rode novamente para reprocessá-las.`,
        );
      } else {
        alert(`Aprovação manual aplicada a ${r.applied} loja(s).`);
      }
    } catch (e: any) {
      alert(e.message || "Erro ao aplicar aprovação manual em massa");
    } finally {
      setBulkLoading(false);
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
              análise. Lojas com documentação expirada ficam offline (todos os planos) e só voltam
              ao ar quando os 3 documentos forem aprovados.
            </p>
          </div>
          <button
            onClick={runBulkOverride}
            disabled={bulkLoading}
            className="shrink-0 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            title="Aprova manualmente todas as lojas sem os 3 documentos aprovados (assumir responsabilidade)"
          >
            {bulkLoading ? "Aplicando..." : "Aprovar todas manualmente"}
          </button>
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
                    aria-expanded={isOpen}
                    className="w-full p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{item.businessName}</h3>
                        {statusChip(item.documentationStatus)}
                        {item.documentationAdminApproved && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full ring-1 ring-purple-300">
                            <ShieldCheck className="w-3 h-3" />
                            Aprovada manualmente
                          </span>
                        )}
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
                    <div className="flex items-center gap-3 flex-shrink-0">
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
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          isOpen
                            ? "bg-[#d97706] text-white border-[#d97706]"
                            : "bg-white text-[#d97706] border-[#d97706]/30 hover:bg-[#d97706]/5"
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {item.documents.length > 0
                          ? `Ver ${item.documents.length} ${item.documents.length === 1 ? "documento" : "documentos"}`
                          : "Sem documentos"}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      {/* Task #104 — Aprovação manual do admin (override) */}
                      <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-3">
                        {item.documentationAdminApproved ? (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-2 text-sm text-purple-900">
                              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-purple-700" />
                              <span>
                                <strong>Documentação aprovada manualmente pelo admin.</strong> A loja é
                                tratada como verificada e está no ar, independente dos documentos enviados.
                              </span>
                            </div>
                            <button
                              disabled={manualLoading === item.businessId}
                              onClick={() => setManualApproval(item, false)}
                              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-purple-700 border border-purple-300 hover:bg-purple-100 disabled:opacity-50"
                            >
                              {manualLoading === item.businessId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              Revogar aprovação manual
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-start gap-2 text-sm text-purple-900">
                              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-purple-700" />
                              <span>
                                <strong>Aprovação manual (assumir responsabilidade).</strong> Aprova a
                                documentação mesmo sem os 3 documentos: a loja volta ao ar, recebe o selo
                                Verificado e deixa de expirar.
                              </span>
                            </div>
                            <button
                              disabled={manualLoading === item.businessId}
                              onClick={() => setManualApproval(item, true)}
                              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                              {manualLoading === item.businessId ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                              Aprovar manualmente
                            </button>
                          </div>
                        )}
                      </div>

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
