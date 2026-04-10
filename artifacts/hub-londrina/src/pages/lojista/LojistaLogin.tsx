import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { lojistaLogin } from "@/lib/lojista-api";

const verified = new URLSearchParams(window.location.search).get("verified") === "1";

export default function LojistaLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await lojistaLogin(email, password);
      navigate("/lojista");
    } catch (err: any) {
      setError(err.message || "Erro no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#3a2512] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </div>
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl text-[#d97706]">Hub</span>
          <span className="font-extrabold text-2xl text-white ml-1">Lojista</span>
          <p className="text-white/50 text-sm mt-2">Painel do Lojista</p>
        </div>
        {verified && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-green-700 font-medium">Email confirmado com sucesso!</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-xl">
          <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent mb-4"
            autoFocus
          />
          <label className="block text-sm font-bold text-gray-700 mb-2">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent mb-4"
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <div className="text-center mt-4">
            <Link
              href="/lojista/esqueci-senha"
              className="text-sm text-gray-500 hover:text-[#d97706] transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
