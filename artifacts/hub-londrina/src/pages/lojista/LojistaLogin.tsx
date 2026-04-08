import { useState } from "react";
import { useLocation } from "wouter";
import { lojistaLogin } from "@/lib/lojista-api";

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
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl text-[#d97706]">Hub</span>
          <span className="font-extrabold text-2xl text-white ml-1">Lojista</span>
          <p className="text-white/50 text-sm mt-2">Painel do Lojista</p>
        </div>
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
        </form>
      </div>
    </div>
  );
}
