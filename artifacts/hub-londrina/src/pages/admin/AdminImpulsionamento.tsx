import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import { Zap, RefreshCw, Crown, Flame, Trash2, Plus, X, Clock, Users, Rocket } from "lucide-react";

const BTN_ELEVATION = "shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all";

interface BoostBusiness {
  id: number;
  name: string;
  planType: string;
  region: string;
  category: string;
}

interface MonthlyBoost {
  id: number;
  position: number | null;
  business: BoostBusiness;
  monthlyBid: number;
  status: string;
  expiresAt: string | null;
  startsAt: string | null;
  createdAt: string;
}

interface AvulsoBoost {
  id: number;
  business: BoostBusiness;
  monthlyBid: number;
  status: string;
  expiresAt: string | null;
  startsAt: string | null;
  createdAt: string;
}

interface WaitlistBoost {
  id: number;
  business: BoostBusiness;
  monthlyBid: number;
  boostType: string;
  status: string;
  createdAt: string;
}

interface ListBusiness {
  id: number;
  name: string;
  region: string;
  categorySlug: string;
}

const POSITION_BIDS: Record<number, number> = { 1: 149, 2: 119, 3: 99, 4: 79, 5: 59 };

const AVULSO_OPTIONS = [
  { days: 7, label: "7 dias", price: "R$29", value: 29 },
  { days: 15, label: "15 dias", price: "R$49", value: 49 },
  { days: 30, label: "30 dias", price: "R$79", value: 79 },
];

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysRemaining(d: string | null): string {
  if (!d) return "—";
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "Expirado";
  return `${diff} dia${diff > 1 ? "s" : ""}`;
}

export default function AdminImpulsionamento() {
  const [monthly, setMonthly] = useState<MonthlyBoost[]>([]);
  const [avulso, setAvulso] = useState<AvulsoBoost[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistBoost[]>([]);
  const [availablePositions, setAvailablePositions] = useState<number[]>([1, 2, 3, 4, 5]);
  const [businesses, setBusinesses] = useState<ListBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddMonthly, setShowAddMonthly] = useState<number | null>(null);
  const [showAddAvulso, setShowAddAvulso] = useState(false);
  const [showAddDirect, setShowAddDirect] = useState(false);
  const [addBusinessId, setAddBusinessId] = useState<number | "">("");
  const [addDays, setAddDays] = useState(7);
  const [directDays, setDirectDays] = useState(7);
  const [directBizId, setDirectBizId] = useState<number | "">("");
  const [directBizSearch, setDirectBizSearch] = useState("");
  const [bizSearch, setBizSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [boostRes, bizRes] = await Promise.all([
        adminFetch("/api/admin/boosts"),
        adminFetch("/api/admin/businesses?limit=200"),
      ]);
      setMonthly(boostRes.monthly || []);
      setAvulso(boostRes.avulso || []);
      setWaitlist(boostRes.waitlist || []);
      setAvailablePositions(boostRes.availablePositions || []);
      setBusinesses(bizRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const boostedIds = new Set([
    ...monthly.map(b => b.business.id),
    ...avulso.map(b => b.business.id),
    ...waitlist.map(b => b.business.id),
  ]);

  const availableBusinesses = businesses.filter(
    b => !boostedIds.has(b.id) &&
    (!bizSearch || b.name.toLowerCase().includes(bizSearch.toLowerCase()))
  );

  async function handleAddMonthly(position: number) {
    if (!addBusinessId) return;
    const bid = POSITION_BIDS[position];
    setSaving(true);
    try {
      await adminFetch("/api/admin/boosts", {
        method: "POST",
        body: JSON.stringify({
          businessId: addBusinessId,
          boostType: "monthly",
          monthlyBid: bid,
          price: bid,
        }),
      });
      setShowAddMonthly(null);
      setAddBusinessId("");
      setBizSearch("");
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao criar boost");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAvulso() {
    if (!addBusinessId) return;
    const opt = AVULSO_OPTIONS.find(o => o.days === addDays)!;
    setSaving(true);
    try {
      await adminFetch("/api/admin/boosts", {
        method: "POST",
        body: JSON.stringify({
          businessId: addBusinessId,
          boostType: "avulso",
          durationDays: addDays,
          price: opt.value,
        }),
      });
      setShowAddAvulso(false);
      setAddBusinessId("");
      setBizSearch("");
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao criar boost");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancelar este boost? Ele será marcado como expirado.")) return;
    try {
      await adminFetch(`/api/admin/boosts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "expired" }),
      });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao cancelar");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Remover boost? As posições serão recalculadas.")) return;
    try {
      await adminFetch(`/api/admin/boosts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao remover");
    }
  }

  const now = Date.now();
  const directActiveBoosted = businesses.filter(b => (b as any).boostedUntil && new Date((b as any).boostedUntil).getTime() > now);
  const directAvailable = businesses.filter(b =>
    !(b as any).boostedUntil || new Date((b as any).boostedUntil).getTime() <= now
  ).filter(b => !directBizSearch || b.name.toLowerCase().includes(directBizSearch.toLowerCase()));

  async function handleAddDirect() {
    if (!directBizId || !directDays) return;
    setSaving(true);
    try {
      await adminFetch(`/api/admin/businesses/${directBizId}/boost`, {
        method: "POST",
        body: JSON.stringify({ days: directDays }),
      });
      setShowAddDirect(false);
      setDirectBizId("");
      setDirectBizSearch("");
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao criar boost direto");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveDirect(bizId: number) {
    if (!confirm("Remover boost direto deste negócio?")) return;
    try {
      await adminFetch(`/api/admin/businesses/${bizId}/boost`, { method: "DELETE" });
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao remover boost direto");
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-[#d97706]" />
            Boost / Impulsionamento
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie as posições de destaque na busca</p>
        </div>
        <button
          onClick={() => fetchData()}
          className={`p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#d97706] ${BTN_ELEVATION}`}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* ── VAGAS MENSAIS ─────────────────────── */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Vagas Mensais — {5 - availablePositions.length}/5 ocupadas
        </h2>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(pos => {
              const boost = monthly.find(b => b.position === pos);
              return (
                <div key={pos} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 flex items-center justify-center bg-amber-50 rounded-xl font-black text-amber-700 text-sm">{pos}º</span>
                      <div>
                        <span className="font-semibold text-gray-800 text-sm">R${POSITION_BIDS[pos]}/mês</span>
                        <span className="text-[10px] text-gray-400 ml-2 hidden sm:inline">Mensal</span>
                      </div>
                    </div>
                    {boost ? (
                      <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">Ativo</span>
                    ) : (
                      <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Livre</span>
                    )}
                  </div>
                  {boost ? (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{boost.business.name}</p>
                        <p className="text-[10px] text-gray-400">{boost.business.region} · {boost.business.category}</p>
                      </div>
                      <button
                        onClick={() => handleCancel(boost.id)}
                        className={`flex-shrink-0 ml-3 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                      >
                        <Trash2 className="w-3 h-3 inline mr-1" />Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={() => { setShowAddMonthly(pos); setAddBusinessId(""); setBizSearch(""); }}
                        className={`px-3 py-1.5 text-xs font-bold text-[#d97706] bg-amber-50 hover:bg-amber-100 rounded-lg ${BTN_ELEVATION}`}
                      >
                        <Plus className="w-3 h-3 inline mr-1" />Adicionar negócio
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BOOSTS AVULSOS ─────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Boosts Avulsos Ativos
          </h2>
          <button
            onClick={() => { setShowAddAvulso(true); setAddBusinessId(""); setBizSearch(""); setAddDays(7); }}
            className={`px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl ${BTN_ELEVATION}`}
          >
            <Plus className="w-4 h-4 inline mr-1" />Adicionar Avulso
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Carregando...</div>
        ) : avulso.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Nenhum boost avulso ativo.</div>
        ) : (
          <div className="space-y-3">
            {avulso.map(b => {
              const dur = b.startsAt && b.expiresAt
                ? `${Math.ceil((new Date(b.expiresAt).getTime() - new Date(b.startsAt).getTime()) / (1000 * 60 * 60 * 24))} dias`
                : "—";
              const remaining = daysRemaining(b.expiresAt);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{b.business.name}</p>
                      <p className="text-[10px] text-gray-400">{b.business.region}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${remaining === "Expirado" ? "text-red-600 bg-red-50" : "text-amber-700 bg-amber-50"}`}>
                      {remaining}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 border-t border-gray-50 pt-2 mt-1">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Duração</p>
                      <p className="font-medium text-gray-700">{dur}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Início</p>
                      <p className="font-medium text-gray-700">{formatDate(b.startsAt)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold">Expira</p>
                      <p className="font-medium text-gray-700">{formatDate(b.expiresAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleDelete(b.id)}
                      className={`px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── LISTA DE ESPERA ─────────────────────── */}
      {waitlist.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Lista de Espera ({waitlist.length})
          </h2>
          <div className="space-y-3">
            {waitlist.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{w.business.name}</p>
                    <p className="text-[10px] text-gray-400">{w.business.region}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold text-amber-700">R${w.monthlyBid}/mês</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-50 pt-2 mt-1">
                  <p className="text-xs text-gray-400">Entrada: {formatDate(w.createdAt)}</p>
                  <button
                    onClick={() => handleDelete(w.id)}
                    className={`px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" />Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODALS ─────────────────────── */}
      {showAddMonthly !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Posição {showAddMonthly}º — R${POSITION_BIDS[showAddMonthly]}/mês
              </h3>
              <button onClick={() => setShowAddMonthly(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-amber-800">Posição {showAddMonthly}º — R${POSITION_BIDS[showAddMonthly]}/mês</p>
                <p className="text-xs text-amber-600 mt-1">O preço é fixo para esta posição.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Negócio</label>
                <input
                  type="text"
                  placeholder="Buscar negócio..."
                  value={bizSearch}
                  onChange={e => setBizSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-2"
                />
                <select
                  value={addBusinessId}
                  onChange={e => setAddBusinessId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  <option value="">Selecionar...</option>
                  {availableBusinesses.slice(0, 30).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.region})</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleAddMonthly(showAddMonthly)}
                disabled={saving || !addBusinessId}
                className={`w-full py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAvulso && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Novo Boost Avulso</h3>
              <button onClick={() => setShowAddAvulso(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Negócio</label>
                <input
                  type="text"
                  placeholder="Buscar negócio..."
                  value={bizSearch}
                  onChange={e => setBizSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-2"
                />
                <select
                  value={addBusinessId}
                  onChange={e => setAddBusinessId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  <option value="">Selecionar...</option>
                  {availableBusinesses.slice(0, 30).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.region})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Duração</label>
                <select
                  value={addDays}
                  onChange={e => setAddDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  {AVULSO_OPTIONS.map(o => (
                    <option key={o.days} value={o.days}>{o.label} ({o.price})</option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Início: <span className="font-semibold text-gray-700">Hoje</span></p>
              </div>
              <button
                onClick={handleAddAvulso}
                disabled={saving || !addBusinessId}
                className={`w-full py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {saving ? "Salvando..." : "Criar Boost Avulso"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOOST DIRETO ─────────────────────── */}
      <div className="mt-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-500" />
            Boost Direto — Manual
          </h2>
          <button
            onClick={() => setShowAddDirect(v => !v)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 ${BTN_ELEVATION}`}
          >
            {showAddDirect ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddDirect ? "Fechar" : "Adicionar Direto"}
          </button>
        </div>

        {showAddDirect && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-6 mb-4">
            <h3 className="text-sm font-bold text-purple-800 mb-3">Novo Boost Direto</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar negócio</label>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={directBizSearch}
                  onChange={e => setDirectBizSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Negócio</label>
                <select
                  value={directBizId}
                  onChange={e => setDirectBizId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
                >
                  <option value="">Selecionar...</option>
                  {directAvailable.slice(0, 30).map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.region})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Duração (dias)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={directDays}
                  onChange={e => setDirectDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                />
              </div>
              <button
                onClick={handleAddDirect}
                disabled={saving || !directBizId || !directDays}
                className={`w-full sm:w-auto py-2.5 px-6 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl disabled:opacity-50 ${BTN_ELEVATION}`}
              >
                {saving ? "Salvando..." : "Ativar Boost Direto"}
              </button>
            </div>
          </div>
        )}

        {directActiveBoosted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">Nenhum boost direto ativo.</div>
        ) : (
          <div className="space-y-3">
            {directActiveBoosted.map(b => {
              const expStr = (b as any).boostedUntil;
              const remaining = daysRemaining(expStr);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{b.name}</p>
                      <p className="text-[10px] text-gray-400">{b.region}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${remaining === "Expirado" ? "text-red-600 bg-red-50" : "text-purple-700 bg-purple-50"}`}>
                      {remaining}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 pt-2 mt-2">
                    <p className="text-xs text-gray-400">Expira: {formatDate(expStr)}</p>
                    <button
                      onClick={() => handleRemoveDirect(b.id)}
                      className={`px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg ${BTN_ELEVATION}`}
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />Remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
