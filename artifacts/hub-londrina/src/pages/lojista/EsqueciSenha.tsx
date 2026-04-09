import { useState } from "react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Erro ao enviar email");
      }
      setSent(true);
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
          <p className="text-white/50 text-sm mt-2">Recuperar senha</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Email enviado!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Se o email existir em nossa base, você receberá as instruções em breve.
              </p>
              <Link
                href="/lojista/login"
                className="text-sm font-medium text-[#d97706] hover:underline"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 className="text-lg font-bold text-gray-800 mb-1">Esqueceu sua senha?</h2>
              <p className="text-sm text-gray-500 mb-5">
                Digite seu email e enviaremos as instruções para criar uma nova senha.
              </p>

              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent mb-4"
              />

              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mb-4"
              >
                {loading ? "Enviando..." : "Enviar instruções"}
              </button>

              <div className="text-center">
                <Link
                  href="/lojista/login"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Voltar ao login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
