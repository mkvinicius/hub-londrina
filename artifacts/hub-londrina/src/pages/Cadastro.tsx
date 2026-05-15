import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle2, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Info, Star, Zap } from "lucide-react";
import { csrfFetch } from "@/lib/csrf";
import { useLegalConfig } from "@/lib/legal-config";

const API = import.meta.env.VITE_API_URL || "";

const ZONES = [
  { value: "centro", label: "Centro", color: "#dc2626" },
  { value: "norte", label: "Zona Norte", color: "#3d7a28" },
  { value: "sul", label: "Zona Sul", color: "#2563eb" },
  { value: "leste", label: "Zona Leste", color: "#d97706" },
  { value: "oeste", label: "Zona Oeste", color: "#7c3aed" },
];

interface Category { slug: string; name: string }

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";

function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCep(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function passwordStrength(pw: string): { level: number; label: string; color: string } {
  if (pw.length < 8) return { level: 0, label: "Muito curta", color: "bg-red-400" };
  let score = 0;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (pw.length >= 12) score++;
  if (score <= 2) return { level: 1, label: "Fraca", color: "bg-orange-400" };
  if (score <= 3) return { level: 2, label: "Média", color: "bg-yellow-400" };
  return { level: 3, label: "Forte", color: "bg-green-500" };
}

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_DUPLICATE: "Este email já possui uma conta. Faça login.",
  CNPJ_DUPLICATE: "Este CNPJ já está cadastrado na plataforma.",
  PHONE_DUPLICATE: "Este telefone já está cadastrado.",
  CNPJ_INVALID: "CNPJ inválido ou empresa inativa na Receita Federal.",
  RAZAO_SOCIAL_DUPLICATE: "Razão social já cadastrada na plataforma.",
};

const PLAN_LABELS: Record<string, Record<string, { label: string; color: string; icon: string }>> = {
  gratuito: {
    mensal: { label: "Gratuito", color: "bg-gray-100 text-gray-700 border-gray-200", icon: "🆓" },
    anual:  { label: "Gratuito", color: "bg-gray-100 text-gray-700 border-gray-200", icon: "🆓" },
  },
  destaque: {
    mensal: { label: "Destaque — R$59,90/mês", color: "bg-orange-50 text-orange-700 border-orange-200", icon: "⭐" },
    anual:  { label: "Destaque Anual — R$49,90/mês (cobrado R$598,80/ano)", color: "bg-orange-50 text-orange-700 border-orange-200", icon: "⭐" },
  },
  premium: {
    mensal: { label: "Premium — R$89,90/mês", color: "bg-amber-50 text-amber-800 border-amber-300", icon: "🏆" },
    anual:  { label: "Premium Anual — R$79,90/mês (cobrado R$958,80/ano)", color: "bg-amber-50 text-amber-800 border-amber-300", icon: "🏆" },
  },
};

export default function Cadastro() {
  const LEGAL_CONFIG = useLegalConfig();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const planoParam = params.get("plano") || "gratuito";
  const cicloParam = params.get("ciclo") === "anual" ? "anual" : "mensal";
  const isPaidPlan = planoParam === "destaque" || planoParam === "premium";
  const planInfo = (PLAN_LABELS[planoParam] ?? PLAN_LABELS["gratuito"])[cicloParam];

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [zone, setZone] = useState("");

  const [cnpjStatus, setCnpjStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [cnpjName, setCnpjName] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [numero, setNumero] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");

  const [termos, setTermos] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(r => r.json())
      .then(d => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  async function validateCnpj(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 14) { setCnpjStatus("idle"); return; }
    setCnpjStatus("loading");
    try {
      const resp = await fetch(`${API}/api/auth/validate-cnpj?cnpj=${digits}`);
      const data = await resp.json();
      if (data.valid) {
        setCnpjStatus("valid");
        setCnpjName(data.name || "");
      } else {
        setCnpjStatus("invalid");
        setCnpjName(data.reason || "CNPJ inválido");
      }
    } catch {
      setCnpjStatus("valid");
      setCnpjName("");
    }
  }

  async function fetchCep(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) { setCepStatus("idle"); return; }
    setCepStatus("loading");
    try {
      const resp = await fetch(`${API}/api/lojista/cep/${digits}`);
      const data = await resp.json();
      if (resp.ok && (data.street || data.neighborhood)) {
        setStreet(data.street || "");
        setNeighborhood(data.neighborhood || "");
        setCepStatus("found");
      } else {
        setCepStatus("notfound");
      }
    } catch {
      setCepStatus("notfound");
    }
  }

  const step1Valid = name.trim() && email.trim() && /\S+@\S+\.\S+/.test(email) && password.length >= 8 && password === passwordConfirm;
  const step2Valid = businessName.trim() && razaoSocial.trim() && cnpj.replace(/\D/g, "").length === 14 && phone.replace(/\D/g, "").length >= 10 && categorySlug && zone;
  const step3Valid = cep.replace(/\D/g, "").length === 8 && numero.trim();
  const step4Valid = termos;

  const steps = ["Sua conta", "Seu negócio", "Endereço", "Confirmação"];
  const pwStr = passwordStrength(password);

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent bg-gray-50";

  async function handleSubmit() {
    setError("");
    setFieldError({});
    setSubmitting(true);
    try {
      const resp = await csrfFetch(`${API}/api/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          businessName: businessName.trim(),
          razaoSocial: razaoSocial.trim(),
          nomeFantasia: nomeFantasia.trim() || undefined,
          cnpj: cnpj.trim(),
          phone: phone.trim(),
          categorySlug,
          zone,
          cep: cep.trim(),
          acceptedTermsVersion: LEGAL_CONFIG.TERMS_VERSION,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const code = data.code as string | undefined;
        if (data.field === "razaoSocial") {
          setFieldError({ razaoSocial: data.error });
          setStep(2);
          return;
        }
        setError(code && ERROR_MESSAGES[code] ? ERROR_MESSAGES[code] : data.error || "Erro ao processar cadastro. Tente novamente.");
        return;
      }

      if (isPaidPlan && data.token) {
        localStorage.setItem("hub_lojista_token", data.token);
        try {
          const cfgResp = await fetch(`${API}/api/stripe/config`);
          const cfg = await cfgResp.json();
          const priceId = planoParam === "destaque"
            ? (cicloParam === "anual" ? cfg.prices.base_annual : cfg.prices.base_monthly)
            : (cicloParam === "anual" ? cfg.prices.premium_annual : cfg.prices.premium_monthly);
          if (priceId) {
            const checkoutResp = await fetch(`${API}/api/stripe/checkout`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${data.token}`,
              },
              body: JSON.stringify({ priceId }),
            });
            const checkoutData = await checkoutResp.json();
            if (checkoutData.url) {
              window.location.href = checkoutData.url;
              return;
            }
          }
        } catch {
        }
      }

      setSuccess(true);
    } catch {
      setError("Erro ao processar cadastro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#3a2512] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <div className="bg-white rounded-2xl p-10 shadow-xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-3">Cadastro realizado!</h2>
            <p className="text-gray-600 mb-2">
              Você já pode acessar o painel e configurar seu negócio.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Seu negócio ficará visível no diretório em <strong className="text-gray-700">10 dias</strong> — tempo para você completar o perfil. Confirmação enviada para <span className="font-semibold text-gray-700">{email}</span>.
            </p>
            {isPaidPlan && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-sm text-left">
                <p className="font-semibold text-orange-800 mb-1">Próximo passo: ativar seu plano</p>
                <p className="text-orange-700">Acesse o painel e clique em "Plano" para assinar o plano {planoParam === "destaque" ? "Destaque" : "Premium"}.</p>
              </div>
            )}
            <Link href="/lojista/login" className="inline-block bg-[#d97706] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#b45309] transition-colors">
              Acessar o painel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3a2512] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </div>
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <span className="font-extrabold text-2xl text-[#d97706]">Hub</span>
            <span className="font-extrabold text-2xl text-white ml-1">Londrina</span>
          </a>
          <h1 className="text-white font-bold text-xl mt-3">Cadastrar meu negócio</h1>
          <p className="text-white/50 text-sm mt-1">Preencha os dados abaixo em 4 passos simples.</p>
        </div>

        {/* Plano selecionado */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold mb-4 ${planInfo.color}`}>
          <span>{planInfo.icon}</span>
          <span>Plano selecionado: <strong>{planInfo.label}</strong></span>
          {isPaidPlan && <span className="ml-auto text-xs font-normal opacity-70">Pagamento após o cadastro</span>}
        </div>

        <div className="flex items-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i + 1 <= step ? "bg-[#d97706]" : "bg-white/20"}`} />
              <p className={`text-[10px] mt-1 text-center ${i + 1 <= step ? "text-[#d97706]" : "text-white/30"}`}>{s}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Passo 1 — Sua conta</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome completo *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha *</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={inputClass}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i < pwStr.level + 1 && password.length >= 8 ? pwStr.color : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-bold ${password.length < 8 ? "text-red-500" : "text-gray-500"}`}>{pwStr.label}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirmar senha *</label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Repita a senha" className={inputClass} />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Passo 2 — Seu negócio</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do negócio *</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Ex: Padaria do João" className={inputClass} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">Razão Social *</label>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="hidden group-hover:block absolute left-0 top-5 z-20 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl">
                      Nome oficial registrado na Receita Federal.<br/>Ex: João Silva Restaurante LTDA
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={razaoSocial}
                  onChange={e => { setRazaoSocial(e.target.value); setFieldError(prev => ({ ...prev, razaoSocial: "" })); }}
                  placeholder="Ex: João Silva Restaurante LTDA"
                  className={`${inputClass} ${fieldError.razaoSocial ? "border-red-400 ring-1 ring-red-300" : ""}`}
                />
                {fieldError.razaoSocial && (
                  <p className="text-xs text-red-500 mt-1">{fieldError.razaoSocial}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">Nome Fantasia</label>
                  <span className="text-xs text-gray-400">(opcional)</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="hidden group-hover:block absolute left-0 top-5 z-20 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl">
                      Nome pelo qual seu negócio é conhecido pelo público.<br/>Ex: Restaurante do João
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={e => setNomeFantasia(e.target.value)}
                  placeholder="Ex: Restaurante do João (se diferente da razão social)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CNPJ *</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => { setCnpj(maskCnpj(e.target.value)); setCnpjStatus("idle"); }}
                  onBlur={() => validateCnpj(cnpj)}
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  className={inputClass}
                />
                {cnpjStatus === "loading" && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Validando CNPJ...</div>
                )}
                {cnpjStatus === "valid" && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> CNPJ válido {cnpjName && `— ${cnpjName}`}</p>
                )}
                {cnpjStatus === "invalid" && (
                  <p className="text-xs text-red-500 mt-1">CNPJ inválido ✗ {cnpjName && `— ${cnpjName}`}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone com DDD *</label>
                <input type="text" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} placeholder="(XX) XXXXX-XXXX" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Categoria *</label>
                <select value={categorySlug} onChange={e => setCategorySlug(e.target.value)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {categories.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Zona *</label>
                <div className="grid grid-cols-5 gap-2">
                  {ZONES.map(z => (
                    <button
                      key={z.value}
                      type="button"
                      onClick={() => setZone(z.value)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${zone === z.value ? "text-white" : "text-gray-600 border-gray-200 bg-gray-50 hover:border-gray-300"}`}
                      style={zone === z.value ? { backgroundColor: z.color, borderColor: z.color } : {}}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Passo 3 — Endereço</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">CEP *</label>
                <input
                  type="text"
                  value={cep}
                  onChange={e => { setCep(maskCep(e.target.value)); setCepStatus("idle"); }}
                  onBlur={() => fetchCep(cep)}
                  placeholder="XXXXX-XXX"
                  className={inputClass}
                />
                {cepStatus === "loading" && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Buscando endereço...</div>
                )}
                {cepStatus === "found" && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Endereço encontrado</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rua</label>
                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número *</label>
                  <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="123" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bairro</label>
                  <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cidade</label>
                  <input type="text" value="Londrina" disabled className={`${inputClass} bg-gray-100 text-gray-500`} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Estado</label>
                  <input type="text" value="PR" disabled className={`${inputClass} bg-gray-100 text-gray-500`} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Passo 4 — Confirmação</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Negócio:</span><span className="font-semibold text-gray-800">{businessName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">CNPJ:</span><span className="font-semibold text-gray-800">{cnpj}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Categoria:</span><span className="font-semibold text-gray-800">{categories.find(c => c.slug === categorySlug)?.name || categorySlug}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Zona:</span><span className="font-semibold text-gray-800">{ZONES.find(z => z.value === zone)?.label || zone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Endereço:</span><span className="font-semibold text-gray-800">{street ? `${street}, ${numero}` : cep}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bairro:</span><span className="font-semibold text-gray-800">{neighborhood || "—"}</span></div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer mt-4" data-testid="checkbox-termos-consent">
                <input
                  type="checkbox"
                  checked={termos}
                  onChange={e => setTermos(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-[#d97706] focus:ring-[#d97706]"
                />
                <span className="text-sm text-gray-600">
                  Li e aceito os{" "}
                  <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-[#d97706] underline font-semibold">
                    Termos de Uso
                  </a>{" "}
                  e a{" "}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#d97706] underline font-semibold">
                    Política de Privacidade
                  </a>{" "}
                  do {LEGAL_CONFIG.PLATFORM_NAME}, ciente de que meus dados serão tratados conforme a LGPD.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mt-4">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 gap-3">
            {step > 1 ? (
              <button type="button" onClick={() => { setStep(step - 1); setError(""); }} className={`px-5 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl ${BTN_ELEVATION}`}>
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Voltar
              </button>
            ) : <div />}
            {step < 4 ? (
              <button
                type="button"
                onClick={() => { setStep(step + 1); setError(""); }}
                disabled={
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid) ||
                  (step === 3 && !step3Valid)
                }
                className={`px-5 py-3 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                Próximo <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !step4Valid}
                className={`px-6 py-3 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {submitting ? <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" /> Enviando...</> : "Cadastrar meu negócio"}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Já tem conta?{" "}
            <Link href="/lojista/login" className="text-[#d97706] font-semibold hover:underline">
              Entrar no painel
            </Link>
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "🆓", label: "100% gratuito", sub: "para começar" },
            { icon: "📅", label: "Visível em 10 dias", sub: "no diretório público" },
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
