import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { registerLojista } from "@/lib/lojista-api";

const ZONES = [
  { value: "centro", label: "Centro" },
  { value: "norte", label: "Zona Norte" },
  { value: "sul", label: "Zona Sul" },
  { value: "leste", label: "Zona Leste" },
  { value: "oeste", label: "Zona Oeste" },
];

interface Category { slug: string; name: string }

export default function Cadastro() {
  const [, navigate] = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    categorySlug: "",
    zone: "centro",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || "";
    fetch(`${BASE}/api/categories`)
      .then(r => r.json())
      .then(d => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.passwordConfirm) {
      setError("As senhas não coincidem");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await registerLojista({
        businessName: form.businessName,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        categorySlug: form.categorySlug || "servicos",
        zone: form.zone,
      });
      navigate("/lojista");
    } catch (err: any) {
      setError(err.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent bg-gray-50";

  return (
    <div className="min-h-screen bg-[#3a2512] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="font-extrabold text-2xl text-[#d97706]">Hub</span>
            <span className="font-extrabold text-2xl text-white ml-1">Londrina</span>
          </a>
          <h1 className="text-white font-bold text-xl mt-3">Cadastrar meu negócio</h1>
          <p className="text-white/50 text-sm mt-1">É grátis. Você começa agora mesmo.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-xl space-y-5">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Dados do negócio</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do negócio *</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => set("businessName", e.target.value)}
                  placeholder="Ex: Restaurante Sabor da Serra"
                  className={inputClass}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria</label>
                  <select
                    value={form.categorySlug}
                    onChange={e => set("categorySlug", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => (
                      <option key={c.slug} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Região</label>
                  <select
                    value={form.zone}
                    onChange={e => set("zone", e.target.value)}
                    className={inputClass}
                  >
                    {ZONES.map(z => (
                      <option key={z.value} value={z.value}>{z.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">Dados do responsável</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Seu nome *</label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={e => set("ownerName", e.target.value)}
                  placeholder="Nome completo"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="seu@email.com"
                  className={inputClass}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    placeholder="Mín. 6 caracteres"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar senha *</label>
                  <input
                    type="password"
                    value={form.passwordConfirm}
                    onChange={e => set("passwordConfirm", e.target.value)}
                    placeholder="Repita a senha"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.businessName || !form.ownerName || !form.email || !form.password}
            className="w-full bg-[#d97706] hover:bg-[#b45309] text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 text-base"
          >
            {loading ? "Criando conta..." : "Criar conta grátis"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Já tem conta?{" "}
            <Link href="/lojista/login" className="text-[#d97706] font-semibold hover:underline">
              Entrar no painel
            </Link>
          </p>
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🆓", label: "100% gratuito", sub: "para começar" },
            { icon: "⚡", label: "Ativo em minutos", sub: "sem aprovação" },
            { icon: "📍", label: "Londrina", sub: "negócios locais" },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl p-3">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-white text-xs font-bold">{item.label}</div>
              <div className="text-white/50 text-[10px]">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
