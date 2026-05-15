import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, updateProfile, lookupCep, updateLocation, lojistaFetch, getLojistaToken, clearToken } from "@/lib/lojista-api";
import { Save, Search, MapPin, Lock, Info, Download, ShieldAlert, Loader2 } from "lucide-react";
import { useLegalConfig } from "@/lib/legal-config";
import { csrfFetch } from "@/lib/csrf";

const PAYMENT_OPTIONS = ["Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito", "Vale refeição"];
const FALLBACK_ZONES = [
  { slug: "centro", name: "Centro" },
  { slug: "norte", name: "Zona Norte" },
  { slug: "sul", name: "Zona Sul" },
  { slug: "leste", name: "Zona Leste" },
  { slug: "oeste", name: "Zona Oeste" },
];

export default function LojistaPerfil() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [zones, setZones] = useState<{ slug: string; name: string }[]>(FALLBACK_ZONES);
  const [tagInput, setTagInput] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [locSaving, setLocSaving] = useState(false);
  const [locMsg, setLocMsg] = useState("");

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "";
    Promise.all([
      getProfile(),
      fetch(`${apiBase}/api/categories`).then(r => r.json()),
      fetch(`${apiBase}/api/zones`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([p, cats, zns]) => {
      setProfile(p);
      setCategories(cats.data || []);
      const list = (zns.data || [])
        .filter((z: any) => z.active !== false)
        .map((z: any) => ({ slug: z.slug, name: z.name }));
      if (list.length) setZones(list);
    }).finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  const isFree = profile.planType === "free";
  const isPremium = profile.planType === "premium";

  function update(key: string, value: any) {
    setProfile((p: any) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = {
        name: profile.name,
        description: profile.description,
        phone: profile.phone,
        whatsapp: profile.whatsapp,
        hours: profile.hours,
        cnpj: profile.cnpj,
        ownerName: profile.ownerName,
        ownerPhone: profile.ownerPhone,
        zone: profile.zone,
        categorySlug: profile.categorySlug,
        paymentMethods: profile.paymentMethods || [],
        tags: profile.tags || [],
        razaoSocial: profile.razaoSocial || undefined,
        nomeFantasia: profile.nomeFantasia || undefined,
      };
      if (!isFree) {
        payload.instagram = profile.instagram;
        payload.website = profile.website;
      }
      if (isPremium) {
        payload.videoUrl = profile.videoUrl;
      }
      const result = await updateProfile(payload);
      setProfile(result);
      setMsg("Perfil salvo com sucesso!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      const code = err?.code || err?.body?.code;
      const field = err?.field || err?.body?.field;
      if (code === "PLAN_REQUIRED") {
        const plan = err?.body?.requiredPlan || err?.requiredPlan || "superior";
        setMsg(`Erro: este recurso exige o plano ${plan}. Acesse "Plano & Assinatura" para fazer upgrade.`);
      } else if (field) {
        setMsg(`Erro no campo "${field}": ${err?.body?.message || err.message}`);
      } else {
        setMsg(`Erro: ${err.message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCepLookup() {
    if (!profile.cep) return;
    setCepLoading(true);
    try {
      const data = await lookupCep(profile.cep);
      update("street", data.street);
      update("neighborhood", data.neighborhood);
      update("city", data.city);
      update("state", data.state);
    } catch (err: any) {
      setLocMsg(`Erro: ${err.message}`);
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSaveLocation() {
    setLocSaving(true);
    setLocMsg("");
    try {
      const result = await updateLocation({
        cep: profile.cep,
        street: profile.street,
        number: profile.number,
        neighborhood: profile.neighborhood,
      });
      if (result.lat) {
        update("lat", result.lat);
        update("lng", result.lng);
      }
      update("address", result.address);
      setLocMsg("Localização salva!");
      setTimeout(() => setLocMsg(""), 3000);
    } catch (err: any) {
      const field = err?.field || err?.body?.field;
      if (field) {
        setLocMsg(`Erro no campo "${field}": ${err?.body?.message || err.message}`);
      } else {
        setLocMsg(`Erro: ${err.message}`);
      }
    } finally {
      setLocSaving(false);
    }
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !(profile.tags || []).includes(tag)) {
      update("tags", [...(profile.tags || []), tag]);
    }
    setTagInput("");
  }

  function removeTag(idx: number) {
    update("tags", (profile.tags || []).filter((_: string, i: number) => i !== idx));
  }

  function togglePayment(method: string) {
    const current = profile.paymentMethods || [];
    if (current.includes(method)) {
      update("paymentMethods", current.filter((m: string) => m !== method));
    } else {
      update("paymentMethods", [...current, method]);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent";
  const lockedInputCls = `${inputCls} bg-gray-100 opacity-60 cursor-not-allowed`;

  return (
    <LojistaLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-800">Perfil do Negócio</h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Dados Jurídicos</h2>
          <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            A razão social deve ser idêntica ao cadastro na Receita Federal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Razão Social <span className="text-red-500">*</span>
              </label>
              <input
                value={profile.razaoSocial || ""}
                onChange={e => update("razaoSocial", e.target.value)}
                placeholder="Nome conforme Receita Federal"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Nome Fantasia
                <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                value={profile.nomeFantasia || ""}
                onChange={e => update("nomeFantasia", e.target.value)}
                placeholder="Nome pelo qual é conhecido"
                className={inputCls}
              />
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-4">Dados da Empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do negócio</label>
              <input value={profile.name || ""} onChange={e => update("name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">CNPJ</label>
              <input value={profile.cnpj || ""} onChange={e => update("cnpj", e.target.value)} placeholder="00.000.000/0000-00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome do responsável</label>
              <input value={profile.ownerName || ""} onChange={e => update("ownerName", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Telefone</label>
              <input value={profile.phone || ""} onChange={e => update("phone", e.target.value)} placeholder="(43) 3322-1100" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp</label>
              <input value={profile.whatsapp || ""} onChange={e => update("whatsapp", e.target.value)} placeholder="5543999999999" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Telefone do responsável</label>
              <input value={profile.ownerPhone || ""} onChange={e => update("ownerPhone", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
              <select value={profile.categorySlug || ""} onChange={e => update("categorySlug", e.target.value)} className={inputCls}>
                {categories.map((c: any) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Zona</label>
              <select value={profile.zone || ""} onChange={e => update("zone", e.target.value)} className={inputCls}>
                {zones.map(z => <option key={z.slug} value={z.slug}>{z.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
            <textarea value={profile.description || ""} onChange={e => update("description", e.target.value)} rows={4} className={inputCls} />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(profile.tags || []).map((tag: string, i: number) => (
                <span key={i} className="bg-[#d97706]/10 text-[#d97706] px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  {tag}
                  <button onClick={() => removeTag(i)} className="text-[#d97706] hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Adicionar tag..." className={inputCls} />
              <button onClick={addTag} type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold">+</button>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Formas de pagamento</label>
            <div className="flex flex-wrap gap-3">
              {PAYMENT_OPTIONS.map(method => (
                <label key={method} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(profile.paymentMethods || []).includes(method)}
                    onChange={() => togglePayment(method)}
                    className="w-4 h-4 rounded border-gray-300 text-[#d97706] focus:ring-[#d97706]"
                  />
                  <span className="text-sm text-gray-700">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Horários</h2>
          <textarea
            value={profile.hours || ""}
            onChange={e => update("hours", e.target.value)}
            rows={3}
            placeholder="Ex: Seg-Sex: 8h–18h | Sáb: 9h–14h"
            className={inputCls}
          />
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Localização</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">CEP</label>
              <div className="flex gap-2">
                <input value={profile.cep || ""} onChange={e => update("cep", e.target.value)} placeholder="86010-010" className={inputCls} />
                <button onClick={handleCepLookup} disabled={cepLoading} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1 whitespace-nowrap disabled:opacity-50">
                  <Search className="w-4 h-4" />
                  {cepLoading ? "..." : "Buscar"}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Rua</label>
              <input value={profile.street || ""} onChange={e => update("street", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Número</label>
              <input value={profile.number || ""} onChange={e => update("number", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Bairro</label>
              <input value={profile.neighborhood || ""} onChange={e => update("neighborhood", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Cidade / Estado</label>
              <input value={`${profile.city || "Londrina"} / ${profile.state || "PR"}`} disabled className={`${inputCls} bg-gray-50`} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleSaveLocation} disabled={locSaving} className="flex items-center gap-2 bg-[#6F4E37] hover:bg-[#5a3f2d] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
              <MapPin className="w-4 h-4" />
              {locSaving ? "Salvando..." : "Salvar localização e calcular coordenadas"}
            </button>
            {locMsg && <span className={`text-sm font-medium ${locMsg.startsWith("Erro") ? "text-red-600" : "text-green-600"}`}>{locMsg}</span>}
          </div>
          {profile.lat && profile.lng && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(profile.lng) - 0.005},${Number(profile.lat) - 0.003},${Number(profile.lng) + 0.005},${Number(profile.lat) + 0.003}&layer=mapnik&marker=${profile.lat},${profile.lng}`}
                width="100%"
                height="300"
                className="border-0"
              />
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Links e Redes Sociais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                Instagram
                {isFree && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3 h-3" /> Destaque+</span>}
              </label>
              <input
                value={profile.instagram || ""}
                onChange={e => update("instagram", e.target.value)}
                placeholder="@seunegocio"
                disabled={isFree}
                className={isFree ? lockedInputCls : inputCls}
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                Website
                {isFree && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3 h-3" /> Destaque+</span>}
              </label>
              <input
                value={profile.website || ""}
                onChange={e => update("website", e.target.value)}
                placeholder="https://..."
                disabled={isFree}
                className={isFree ? lockedInputCls : inputCls}
              />
            </div>
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                URL do Vídeo
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold cursor-help"
                  title="Cole o link do YouTube ou Vimeo. O vídeo aparece na vitrine da home (Premium). Duração recomendada: até 60 segundos."
                  aria-label="Ajuda sobre URL do vídeo"
                >?</span>
                {!isPremium && <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3 h-3" /> Premium</span>}
              </label>
              <input
                value={profile.videoUrl || ""}
                onChange={e => update("videoUrl", e.target.value)}
                placeholder="https://youtube.com/... ou https://vimeo.com/..."
                disabled={!isPremium}
                className={!isPremium ? lockedInputCls : inputCls}
              />
            </div>
          </div>
        </section>

        <LgpdSection />
      </div>
    </LojistaLayout>
  );
}

function LgpdSection() {
  const LEGAL_CONFIG = useLegalConfig();
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const apiBase = import.meta.env.VITE_API_URL || "";

  async function handleExport() {
    setExporting(true);
    try {
      const token = getLojistaToken();
      const resp = await fetch(`${apiBase}/api/lojista/account/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Falha ao exportar dados");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = resp.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m?.[1] || `hub-londrina-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Não foi possível exportar seus dados. Tente novamente em instantes.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleteError("");
    if (deleteConfirm.trim().toUpperCase() !== "EXCLUIR") {
      setDeleteError('Digite EXCLUIR (em maiúsculas) para confirmar.');
      return;
    }
    if (!deletePassword) {
      setDeleteError("Informe sua senha atual.");
      return;
    }
    setDeleting(true);
    try {
      const token = getLojistaToken();
      const resp = await csrfFetch(`${apiBase}/api/lojista/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setDeleteError(data.error || "Não foi possível excluir a conta.");
        return;
      }
      clearToken();
      window.location.href = "/?conta_excluida=1";
    } catch {
      setDeleteError("Erro de rede. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="section-lgpd">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Seus dados (LGPD)</h2>
      <p className="text-sm text-gray-500 mb-5">
        Direitos garantidos pela Lei Geral de Proteção de Dados.{" "}
        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-[#d97706] underline">
          Ver Política de Privacidade
        </a>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-[#d97706] mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-sm">Exportar meus dados</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Baixe um arquivo JSON com todos os dados pessoais e do seu negócio (perfil, produtos, avaliações, métricas, assinaturas).
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="text-xs font-bold text-white bg-[#6F4E37] hover:bg-[#5a3f2c] px-4 py-2 rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
                data-testid="button-export-data"
              >
                {exporting ? <><Loader2 className="w-3 h-3 animate-spin" /> Exportando...</> : <><Download className="w-3 h-3" /> Baixar JSON</>}
              </button>
            </div>
          </div>
        </div>

        <div className="border border-red-200 rounded-xl p-4 bg-red-50/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-800 text-sm">Excluir minha conta</h3>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Anonimiza imediatamente seus dados pessoais e remove o negócio do diretório. Documentos são apagados após {LEGAL_CONFIG.RETENTION_MONTHS} meses (auditoria fiscal). Esta ação é <strong>irreversível</strong>.
              </p>
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="text-xs font-bold text-red-600 border border-red-300 hover:bg-red-100 px-4 py-2 rounded-lg inline-flex items-center gap-2"
                  data-testid="button-show-delete"
                >
                  <ShieldAlert className="w-3 h-3" /> Excluir minha conta
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="Sua senha atual"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                    data-testid="input-delete-password"
                  />
                  <input
                    type="text"
                    placeholder='Digite EXCLUIR para confirmar'
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                    data-testid="input-delete-confirm"
                  />
                  {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
                      data-testid="button-confirm-delete"
                    >
                      {deleting ? <><Loader2 className="w-3 h-3 animate-spin" /> Excluindo...</> : "Confirmar exclusão"}
                    </button>
                    <button
                      onClick={() => { setShowDelete(false); setDeletePassword(""); setDeleteConfirm(""); setDeleteError(""); }}
                      className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Dúvidas sobre seus dados? Contate o Encarregado (DPO):{" "}
        <a href={`mailto:${LEGAL_CONFIG.DPO_EMAIL}`} className="text-[#d97706] underline">{LEGAL_CONFIG.DPO_EMAIL}</a>.
      </p>
    </section>
  );
}
