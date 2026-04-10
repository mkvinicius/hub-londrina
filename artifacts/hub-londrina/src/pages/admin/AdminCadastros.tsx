import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { ClipboardList, CheckCircle2, XCircle, Clock, RefreshCw, X, MailCheck, MailX } from "lucide-react";

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";

interface Cadastro {
  id: number;
  name: string;
  cnpj: string;
  phone: string;
  zone: string;
  categorySlug: string;
  ownerName: string;
  ownerEmail: string;
  status: string;
  rejectionReason: string | null;
  isVisible: boolean;
  createdAt: string;
  emailVerified?: boolean;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-amber-700", bg: "bg-amber-50" },
  active: { label: "Aprovado", color: "text-green-700", bg: "bg-green-50" },
  rejected: { label: "Rejeitado", color: "text-red-700", bg: "bg-red-50" },
};

const ZONE_LABELS: Record<string, string> = {
  centro: "Centro",
  norte: "Zona Norte",
  sul: "Zona Sul",
  leste: "Zona Leste",
  oeste: "Zona Oeste",
};

export default function AdminCadastros() {
  const [data, setData] = useState<Cadastro[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await adminFetch(`/api/admin/cadastros${params}`);
      setData(res.data || []);
      setPendingCount(res.pendingCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleApprove(id: number) {
    setSaving(true);
    try {
      await adminFetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active", isVisible: true }),
      });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao aprovar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    setSaving(true);
    try {
      await adminFetch(`/api/admin/businesses/${rejectModal}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", rejectionReason: rejectReason.trim() || null }),
      });
      setRejectModal(null);
      setRejectReason("");
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao rejeitar");
    } finally {
      setSaving(false);
    }
  }

  const filters = [
    { value: "", label: "Todos" },
    { value: "pending", label: "Pendentes" },
    { value: "active", label: "Aprovados" },
    { value: "rejected", label: "Rejeitados" },
  ];

  return (
    <AdminLayout pendingCadastros={pendingCount}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-[#d97706]" />
            Cadastros
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{pendingCount}</span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Aprovação e gerenciamento de cadastros de lojistas</p>
        </div>
        <button onClick={fetchData} className={`p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#d97706] ${BTN_ELEVATION}`}>
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filter === f.value ? "bg-[#d97706] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
          >
            {f.label}
            {f.value === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Negócio</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">CNPJ</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Zona</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Categoria</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Data</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Nenhum cadastro encontrado.</td></tr>
            ) : data.map(c => {
              const st = STATUS_LABELS[c.status] || STATUS_LABELS.pending;
              return (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{c.name}</div>
                    <div className="text-[10px] text-gray-400">{c.ownerName} · {c.ownerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{c.cnpj || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{ZONE_LABELS[c.zone] || c.zone}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{c.categorySlug}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <span title={c.emailVerified ? "Email verificado" : "Email não verificado"}>
                      {c.emailVerified
                        ? <MailCheck className="w-4 h-4 text-green-500" />
                        : <MailX className="w-4 h-4 text-gray-300" />}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold ${st.color} ${st.bg} px-2 py-0.5 rounded-full inline-flex items-center gap-1`}>
                      {c.status === "pending" && <Clock className="w-3 h-3" />}
                      {c.status === "active" && <CheckCircle2 className="w-3 h-3" />}
                      {c.status === "rejected" && <XCircle className="w-3 h-3" />}
                      {st.label}
                    </span>
                    {c.rejectionReason && (
                      <div className="text-[10px] text-red-400 mt-0.5">{c.rejectionReason}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={saving}
                          className={`px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg ${BTN_ELEVATION}`}
                        >
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />Aprovar
                        </button>
                        <button
                          onClick={() => { setRejectModal(c.id); setRejectReason(""); }}
                          className={`px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                        >
                          <XCircle className="w-3 h-3 inline mr-1" />Rejeitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rejectModal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Rejeitar cadastro</h3>
              <button onClick={() => setRejectModal(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo da rejeição</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none h-24"
                  placeholder="Ex: CNPJ não corresponde ao negócio informado..."
                />
              </div>
              <button
                onClick={handleReject}
                disabled={saving}
                className={`w-full py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {saving ? "Rejeitando..." : "Confirmar Rejeição"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
