import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { Search, RefreshCw, ChevronLeft, ChevronRight, KeyRound, Eye, EyeOff } from "lucide-react";

interface Lojista {
  id: number;
  email: string;
  businessId: number;
  businessName: string;
  planType: string;
  region: string;
  isVisible: boolean;
  createdAt: string;
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    destaque: "bg-amber-100 text-amber-700",
    premium: "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = { free: "Gratuito", destaque: "Destaque", premium: "Premium" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${styles[plan] || styles.free}`}>
      {labels[plan] || plan}
    </span>
  );
}

function ResetPasswordModal({ lojista, onClose }: { lojista: Lojista; onClose: () => void }) {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const data = await adminFetch(`/api/admin/lojistas/${lojista.id}/reset-password`, {
        method: "POST",
      });
      setResult(data.tempPassword);
    } catch (e: any) {
      alert(e.message || "Erro ao resetar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800 mb-2">Resetar senha</h3>
        <p className="text-sm text-gray-500 mb-4">
          Isso vai gerar uma senha temporária para <strong>{lojista.email}</strong>.
          Compartilhe com o lojista para que ele faça login e troque.
        </p>
        {result ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Senha temporária gerada:</p>
            <p className="text-2xl font-black text-amber-700 font-mono tracking-widest">{result}</p>
            <p className="text-xs text-gray-400 mt-2">Anote e informe ao lojista</p>
          </div>
        ) : (
          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mb-3"
          >
            {loading ? "Gerando..." : "Gerar senha temporária"}
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {result ? "Fechar" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLojistas() {
  const [lojistas, setLojistas] = useState<Lojista[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<Lojista | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      const data = await adminFetch(`/api/admin/lojistas?${params}`);
      setLojistas(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleVisibility(lojista: Lojista) {
    await adminFetch(`/api/admin/businesses/${lojista.businessId}`, {
      method: "PATCH",
      body: JSON.stringify({ isVisible: !lojista.isVisible }),
    });
    fetchData();
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Lojistas</h1>
          <p className="text-sm text-gray-500 mt-1">{total} contas cadastradas</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Negócio</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Região</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cadastro</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Carregando...</td></tr>
              ) : lojistas.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Nenhum lojista encontrado.</td></tr>
              ) : (
                lojistas.map(l => (
                  <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-medium text-xs">{l.email}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium max-w-[180px] truncate">{l.businessName || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{l.region || "—"}</td>
                    <td className="px-4 py-3"><PlanBadge plan={l.planType} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {l.createdAt ? new Date(l.createdAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleVisibility(l)}
                        className={`p-1.5 rounded-lg transition-colors ${l.isVisible ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
                        title={l.isVisible ? "Perfil visível" : "Perfil oculto"}
                      >
                        {l.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setResetTarget(l)}
                        className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                        title="Resetar senha"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} lojistas</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {resetTarget && (
        <ResetPasswordModal lojista={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </AdminLayout>
  );
}
