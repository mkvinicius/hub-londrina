import { useState } from "react";
import { useLocation } from "wouter";
import { LojistaLayout } from "./LojistaLayout";
import { changePassword, deleteAccount, clearToken } from "@/lib/lojista-api";
import { Lock, AlertTriangle, X } from "lucide-react";

export default function LojistaSenha() {
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deletePwd, setDeletePwd] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (newPassword !== confirmPassword) {
      setMsg("Erro: As senhas não coincidem");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Erro: A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMsg("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteMsg("");
    if (deleteConfirm !== "EXCLUIR") {
      setDeleteMsg("Erro: digite EXCLUIR para confirmar");
      return;
    }
    if (!deletePwd) {
      setDeleteMsg("Erro: senha é obrigatória");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePwd);
      clearToken();
      const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
      window.location.href = `${base}/?account_deleted=1`;
    } catch (err: any) {
      setDeleteMsg(`Erro: ${err.message}`);
      setDeleting(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent";

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Alterar Senha</h1>

      <div className="max-w-md space-y-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          {msg && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {msg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Senha atual</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nova senha</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar nova senha</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="mt-6 flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {saving ? "Salvando..." : "Alterar Senha"}
          </button>
        </form>

        {/* Sprint 4.3 — Excluir minha conta (LGPD) */}
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-sm">
          <h2 className="text-base font-bold text-red-700 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Zona de risco
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Excluir sua conta é <strong>permanente</strong>. Seus dados pessoais serão anonimizados, sua assinatura cancelada e seu negócio ficará invisível na plataforma. Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="text-sm font-bold text-red-600 hover:text-red-800 border border-red-300 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
          >
            Excluir minha conta
          </button>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setShowDelete(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Confirmar exclusão da conta
              </h2>
              <button
                onClick={() => !deleting && setShowDelete(false)}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDelete} className="p-6 space-y-4">
              {deleteMsg && (
                <div className="p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700">{deleteMsg}</div>
              )}
              <p className="text-sm text-gray-700">
                Esta operação irá:
              </p>
              <ul className="text-xs text-gray-600 list-disc list-inside space-y-1 ml-2">
                <li>Anonimizar nome, email, telefone, endereço, CNPJ</li>
                <li>Cancelar sua assinatura ativa no Stripe</li>
                <li>Apagar seus documentos enviados</li>
                <li>Ocultar seu negócio da plataforma</li>
              </ul>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Senha atual</label>
                <input
                  type="password"
                  value={deletePwd}
                  onChange={e => setDeletePwd(e.target.value)}
                  className={inputCls}
                  disabled={deleting}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Digite <code className="bg-gray-100 px-1 rounded text-red-700">EXCLUIR</code> para confirmar</label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  className={inputCls}
                  disabled={deleting}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDelete(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleting || deleteConfirm !== "EXCLUIR" || !deletePwd}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50"
                >
                  {deleting ? "Excluindo..." : "Excluir permanentemente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LojistaLayout>
  );
}
