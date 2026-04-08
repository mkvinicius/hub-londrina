import { useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { changePassword } from "@/lib/lojista-api";
import { Lock } from "lucide-react";

export default function LojistaSenha() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

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

  const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent";

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Alterar Senha</h1>

      <div className="max-w-md">
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
      </div>
    </LojistaLayout>
  );
}
