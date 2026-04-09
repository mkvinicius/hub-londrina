import { useState } from "react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export default function NovaSenha() {
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    if (!token) {
      setError("Token inválido. Use o link do email de recuperação.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Erro ao redefinir senha");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#3a2512] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl text-[#d97706]">Hub</span>
          <span className="font-extrabold text-2xl text-white ml-1">Lojista</span>
          <p className="text-white/50 text-sm mt-2">Nova senha</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {!token && !success ? (
            <div className="text-center">
              <p className="text-red-500 text-sm mb-4">Link inválido. Solicite um novo link de recuperação.</p>
              <Link href="/lojista/esqueci-senha" className="text-sm font-medium text-[#d97706] hover:underline">
                Solicitar novo link
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Senha atualizada!</h2>
              <p className="text-sm text-gray-500 mb-6">Sua senha foi redefinida com sucesso.</p>
              <Link
                href="/lojista/login"
                className="inline-block bg-[#d97706] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#b45309] transition-colors text-sm"
              >
                Fazer login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Criar nova senha</h2>
              <p className="text-sm text-gray-500 mb-5">A senha deve ter pelo menos 8 caracteres.</p>

              <label className="block text-sm font-bold text-gray-700 mb-2">Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent mb-4"
              />

              <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent mb-4"
              />

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
