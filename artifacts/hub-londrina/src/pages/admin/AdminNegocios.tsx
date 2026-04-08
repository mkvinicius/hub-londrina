import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { getBusinesses, updateBusiness, deleteBusiness, adminFetch } from "@/lib/admin-api";
import { Search, Trash2, Eye, EyeOff, X, Phone, MessageCircle, MapPin, Mail, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface Business {
  id: number;
  name: string;
  description: string;
  region: string;
  planType: string;
  clicks: number;
  whatsappClicks: number;
  isVisible: boolean;
  verified: boolean;
  phone: string;
  whatsapp: string;
  address: string;
  rating: number;
  reviewsCount: number;
  categorySlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  logoUrl: string;
  bannerUrl: string;
  instagram: string;
  website: string;
  createdAt: string;
}

interface BusinessDetail extends Business {
  products: { id: number; name: string; price: string; isActive: boolean }[];
  lojista: { id: number; email: string } | null;
  clickBreakdown: { type: string; count: number }[];
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-gray-100 text-gray-600",
    destaque: "bg-amber-100 text-amber-700",
    premium: "bg-emerald-100 text-emerald-700",
  };
  const labels: Record<string, string> = { free: "Gratuito", destaque: "Destaque", premium: "Premium" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${styles[plan] || styles.free}`}>
      {labels[plan] || plan}
    </span>
  );
}

function DetailModal({ businessId, onClose, onRefresh }: { businessId: number; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(`/api/admin/businesses/${businessId}`)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8" onClick={e => e.stopPropagation()}>
          <div className="w-6 h-6 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{detail.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <PlanBadge plan={detail.planType} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${detail.isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {detail.isVisible ? "Visível" : "Oculto"}
              </span>
              {detail.verified && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-100 text-blue-700">Verificado</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {detail.description && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Descrição</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{detail.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">Região</div>
              <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#d97706]" />
                {detail.region || "—"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">Categoria</div>
              <div className="text-sm font-medium text-gray-700 capitalize">{detail.categorySlug?.replace(/-/g, " ") || "—"}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">Avaliação</div>
              <div className="text-sm font-medium text-gray-700">⭐ {detail.rating?.toFixed(1)} ({detail.reviewsCount} avaliações)</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">Criado em</div>
              <div className="text-sm font-medium text-gray-700">
                {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("pt-BR") : "—"}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Contato</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {detail.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {detail.phone}
                </div>
              )}
              {detail.whatsapp && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MessageCircle className="w-3.5 h-3.5 text-green-500" /> {detail.whatsapp}
                </div>
              )}
              {detail.ownerEmail && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {detail.ownerEmail}
                </div>
              )}
              {detail.ownerPhone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {detail.ownerPhone} (dono)
                </div>
              )}
              {detail.instagram && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ExternalLink className="w-3.5 h-3.5 text-pink-500" /> @{detail.instagram}
                </div>
              )}
            </div>
          </div>

          {detail.ownerName && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Responsável</h4>
              <p className="text-sm text-gray-700 font-medium">{detail.ownerName}</p>
              {detail.lojista && (
                <p className="text-xs text-gray-400 mt-0.5">Login: {detail.lojista.email}</p>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Métricas</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <div className="text-xl font-black text-blue-600">{detail.clicks}</div>
                <div className="text-[10px] text-blue-500 font-medium">Cliques Perfil</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <div className="text-xl font-black text-green-600">{detail.whatsappClicks}</div>
                <div className="text-[10px] text-green-500 font-medium">WhatsApp</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <div className="text-xl font-black text-purple-600">{detail.products?.length || 0}</div>
                <div className="text-[10px] text-purple-500 font-medium">Produtos</div>
              </div>
            </div>
          </div>

          {detail.products && detail.products.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Produtos ({detail.products.length})</h4>
              <div className="space-y-1.5">
                {detail.products.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                    <span className={`font-medium ${p.isActive ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{p.name}</span>
                    <span className="text-gray-500 font-mono text-xs">R$ {p.price}</span>
                  </div>
                ))}
                {detail.products.length > 8 && (
                  <p className="text-xs text-gray-400 text-center">+ {detail.products.length - 8} produtos</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminNegocios() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [regions, setRegions] = useState<string[]>([]);

  useEffect(() => {
    adminFetch("/api/admin/stats")
      .then((stats: { byRegion?: { name: string }[] }) => {
        setRegions((stats.byRegion || []).map(r => r.name));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;
      if (filterRegion) params.region = filterRegion;
      if (filterPlan) params.planType = filterPlan;
      const res = await getBusinesses(params);
      setBusinesses(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRegion, filterPlan]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleVisibility(biz: Business) {
    await updateBusiness(biz.id, { isVisible: !biz.isVisible });
    fetchData();
  }

  async function changePlan(biz: Business, planType: string) {
    await updateBusiness(biz.id, { planType });
    fetchData();
  }

  async function handleDelete(biz: Business) {
    if (!confirm(`Excluir "${biz.name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteBusiness(biz.id);
    fetchData();
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Negócios</h1>
          <p className="text-sm text-gray-500 mt-1">{total} negócios cadastrados</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => { setFilterRegion(e.target.value); setPage(1); }}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value="">Todas as regiões</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={filterPlan}
            onChange={(e) => { setFilterPlan(e.target.value); setPage(1); }}
            className="bg-gray-50 rounded-xl px-4 py-2 text-sm border-0 outline-none"
          >
            <option value="">Todos os planos</option>
            <option value="free">Gratuito</option>
            <option value="destaque">Destaque</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Negócio</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Região</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Plano</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase text-right">Cliques</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase text-right">WhatsApp</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>
              ) : businesses.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum negócio encontrado.</td></tr>
              ) : (
                businesses.map((biz) => (
                  <tr
                    key={biz.id}
                    className="border-t border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(biz.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{biz.name}</div>
                      {biz.ownerEmail && <div className="text-[11px] text-gray-400 mt-0.5">{biz.ownerEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{biz.region || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={biz.planType}
                        onChange={(e) => { e.stopPropagation(); changePlan(biz, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer ${
                          biz.planType === "premium" ? "bg-emerald-100 text-emerald-700" :
                          biz.planType === "destaque" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <option value="free">Gratuito</option>
                        <option value="destaque">Destaque</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-600">{biz.clicks}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{biz.whatsappClicks}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(biz); }}
                        className={`p-1.5 rounded-lg transition-colors ${biz.isVisible ? "text-emerald-600 hover:bg-emerald-50" : "text-gray-400 hover:bg-gray-100"}`}
                        title={biz.isVisible ? "Visível — clique para ocultar" : "Oculto — clique para ativar"}
                      >
                        {biz.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(biz); }}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} negócios</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-600 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <DetailModal
          businessId={selectedId}
          onClose={() => setSelectedId(null)}
          onRefresh={fetchData}
        />
      )}
    </AdminLayout>
  );
}
