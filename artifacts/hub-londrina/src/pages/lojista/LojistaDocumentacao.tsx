import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { lojistaFetch, getLojistaToken } from "@/lib/lojista-api";
import { FileText, Upload, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface DocItem {
  id: number;
  documentType: string;
  signedUrl: string;
  status: "submitted" | "approved" | "rejected";
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

interface DocsResponse {
  documents: DocItem[];
  documentationStatus: string;
  documentationRemainingDays: number;
  documentationTimerPaused: boolean;
  documentationDeadline: string | null;
}

const DOC_TYPES: { type: string; label: string; description: string }[] = [
  {
    type: "personal_id",
    label: "Documento Pessoal",
    description: "RG ou CNH do responsável legal pelo negócio.",
  },
  {
    type: "cnpj_card",
    label: "Cartão CNPJ",
    description: "Comprovante de inscrição emitido pela Receita Federal.",
  },
  {
    type: "address_proof",
    label: "Comprovante de Endereço",
    description: "Conta de água, luz ou telefone do endereço comercial.",
  },
];

function statusBadge(status: string | undefined) {
  switch (status) {
    case "approved":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
        </span>
      );
    case "submitted":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5" /> Em análise
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
          <XCircle className="w-3.5 h-3.5" /> Rejeitado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
          <Clock className="w-3.5 h-3.5" /> Pendente
        </span>
      );
  }
}

export default function LojistaDocumentacao() {
  const [data, setData] = useState<DocsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = (await lojistaFetch("/lojista/documents")) as DocsResponse;
      setData(r);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(documentType: string, file: File) {
    setUploading(documentType);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("documentType", documentType);
      fd.append("file", file);
      const token = getLojistaToken();
      const res = await fetch(`${API_BASE}/api/lojista/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao enviar arquivo");
      }
      await load();
    } catch (e: any) {
      setError(e.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(null);
    }
  }

  return (
    <LojistaLayout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Documentação</h1>
          <p className="text-gray-600">
            Envie os 3 documentos abaixo para validar sua loja. A análise leva até 24h.
          </p>
        </div>

        {data && (() => {
          const s = data.documentationStatus;
          const statusMap: Record<string, { cls: string; msg: string }> = {
            expired:   { cls: "bg-red-50 border-red-200 text-red-800",       msg: "⏰ Prazo encerrado. Sua loja está offline. Envie a documentação para reativar." },
            submitted: { cls: "bg-blue-50 border-blue-200 text-blue-800",    msg: "📋 Documentação em análise. Sua loja será ativada em até 24h." },
            approved:  { cls: "bg-green-50 border-green-200 text-green-800", msg: "✅ Documentação aprovada. Sua loja está ativa!" },
            rejected:  { cls: "bg-red-50 border-red-200 text-red-800",       msg: "❌ Documentação rejeitada. Corrija e reenvie os documentos abaixo." },
            pending:   { cls: "bg-amber-50 border-amber-200 text-amber-800", msg: "📎 Envie os 3 documentos abaixo para validar sua loja." },
          };
          const entry = statusMap[s] ?? statusMap["pending"];
          return (
            <div className={`mb-6 rounded-xl p-4 border ${entry.cls}`}>
              <p className="font-semibold">{entry.msg}</p>
            </div>
          );
        })()}

        {error && (
          <div className="mb-4 rounded-xl p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {DOC_TYPES.map((t) => {
              const doc = data?.documents.find((d) => d.documentType === t.type);
              const isUploading = uploading === t.type;
              return (
                <div key={t.type} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{t.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                    </div>
                  </div>

                  <div className="mb-3">{statusBadge(doc?.status)}</div>

                  {doc?.status === "rejected" && doc.rejectionReason && (
                    <div className="mb-3 text-xs bg-red-50 border border-red-100 text-red-700 rounded-lg p-2">
                      <strong>Motivo:</strong> {doc.rejectionReason}
                    </div>
                  )}

                  {doc?.signedUrl && (
                    <a
                      href={`${API_BASE}${doc.signedUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-700 hover:underline mb-3 truncate"
                    >
                      Ver arquivo enviado
                    </a>
                  )}

                  <label
                    className={`mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
                      doc?.status === "approved"
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-[#d97706] text-white hover:bg-[#b45e05]"
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {doc ? "Reenviar" : "Enviar arquivo"}
                      </>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      disabled={doc?.status === "approved" || isUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUpload(t.type, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6">
          Aceitamos JPG, PNG, WebP ou PDF. Tamanho máximo: 10 MB por arquivo.
        </p>
      </div>
    </LojistaLayout>
  );
}
