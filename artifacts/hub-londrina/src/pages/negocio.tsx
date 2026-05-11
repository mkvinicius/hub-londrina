import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { csrfFetch } from "@/lib/csrf";
import { imgSrc } from "@/lib/utils";
import {
  MapPin, Star, Share2, Heart, CheckCircle2, Phone,
  MessageCircle, Clock, Navigation, ArrowLeft, ExternalLink, Send,
  Instagram
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import {
  useGetBusinessById, useListBusinesses,
  type Review, type Business
} from "@workspace/api-client-react";
import { BusinessCard } from "@/components/BusinessCard";
import { useSeo } from "@/lib/seo";
import { getAutoBadges } from "@/lib/badges";

// B2 — vídeo da vitrine: só toca quando ≥50% visível na viewport.
// Reduz CPU/battery em listas grandes e em tabs em background.
function VitrineVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: ambientes sem IO (SSR/jsdom) — tenta tocar uma vez.
      video.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

interface PublicProduct {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  whatsappLink: string | null;
  videoUrl: string | null;
  videoStatus: string | null;
  instagramReelUrl: string | null;
  quantity: number | null;
}

function BusinessProdutos({
  businessId,
  businessName,
  whatsapp,
}: {
  businessId: number;
  businessName: string;
  whatsapp: string | null | undefined;
}) {
  const BASE = (import.meta as any).env?.VITE_API_URL || "";
  const { data, isLoading } = useQuery<{ data: PublicProduct[] }>({
    queryKey: ["/api/businesses", businessId, "products"],
    queryFn: () => fetch(`${BASE}/api/businesses/${businessId}/products`).then(r => r.json()),
    enabled: Number.isFinite(businessId),
  });

  const products = data?.data ?? [];
  const [selected, setSelected] = useState<PublicProduct | null>(null);

  const waBase = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, "")}` : null;
  const waHrefFor = (item: PublicProduct) => {
    // Prioriza link sanitizado do produto; senão monta a partir do whatsapp do negócio.
    const safeLink = (() => {
      if (!item.whatsappLink) return null;
      try {
        const u = new URL(item.whatsappLink);
        if (u.protocol !== "https:") return null;
        const h = u.hostname.toLowerCase();
        return (h === "wa.me" || h === "api.whatsapp.com" || h === "whatsapp.com") ? u.toString() : null;
      } catch { return null; }
    })();
    if (safeLink) return safeLink;
    if (!waBase) return null;
    const qtyTxt = item.quantity != null ? ` (quantidade: ${item.quantity})` : "";
    return `${waBase}?text=${encodeURIComponent(`Olá! Tenho interesse em *${item.name}*${qtyTxt} que vi no Hub Londrina (${businessName}).`)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100">Produtos</h2>
        {products.length > 0 && (
          <span className="text-xs text-gray-400 font-medium">Toque para ver detalhes</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" style={{ height: 200 }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Este negócio ainda não cadastrou produtos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="text-left rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="aspect-square w-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                {p.mediaUrl ? (
                  <img
                    src={imgSrc(p.mediaUrl)}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
                )}
              </div>
              <div className="p-3">
                <p className="font-bold text-sm text-[#3a2512] dark:text-gray-100 line-clamp-2 leading-tight">{p.name}</p>
                {p.price && (
                  <p className="text-[#d97706] font-black text-sm mt-1">R$ {p.price}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selected && (
            <>
              <div className="aspect-square w-full bg-gray-100 dark:bg-gray-800">
                {selected.mediaUrl ? (
                  <img src={imgSrc(selected.mediaUrl)} alt={selected.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
                )}
              </div>
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-[#3a2512] dark:text-gray-100">{selected.name}</DialogTitle>
                  <DialogDescription className="sr-only">Detalhes do produto {selected.name}</DialogDescription>
                </DialogHeader>
                {selected.price && (
                  <p className="text-[#d97706] font-black text-2xl mt-2">R$ {selected.price}</p>
                )}
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-line">
                  {selected.description?.trim() || "Sem descrição"}
                </p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-4">
                  Quantidade disponível:{" "}
                  <span className="font-black text-[#3a2512] dark:text-white">
                    {selected.quantity != null ? selected.quantity : "Sob consulta"}
                  </span>
                </p>
                {(() => {
                  const href = waHrefFor(selected);
                  if (!href) return (
                    <p className="mt-5 text-sm text-gray-400 italic">WhatsApp não disponível para este produto.</p>
                  );
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#25D366] via-[#1ebe57] to-[#159a45] text-white font-black px-4 py-3 rounded-xl shadow-[0_6px_16px_-4px_rgba(34,197,94,0.55)] hover:brightness-110 transition-all"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Comprar pelo WhatsApp
                    </a>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Renderiza embeds do Instagram via blockquote oEmbed.
// IMPORTANTE: este componente só é montado quando o negócio é Premium E tem
// posts publicados (gating em negocio.tsx). Não há CTA de upgrade aqui — esse
// aviso vive no painel do lojista (/lojista/instagram), nunca exposto ao público.
function InstagramTab({ posts }: { posts: string[] }) {
  // Defesa em profundidade: filtra qualquer URL malformada antes de entregar ao
  // embed.js de terceiro. Backend já valida/canoniza, mas dados legados ou
  // resposta corrompida não devem virar input arbitrário do script.
  const safePosts = posts.filter((url) => {
    if (typeof url !== "string") return false;
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return false;
      const h = u.hostname.toLowerCase();
      if (h !== "instagram.com" && h !== "www.instagram.com") return false;
      return /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname);
    } catch { return false; }
  });

  useEffect(() => {
    if (safePosts.length === 0) return;
    const SCRIPT_ID = "instagram-embed-script";
    const ig = (window as any).instgrm;
    if (ig?.Embeds?.process) {
      ig.Embeds.process();
      return;
    }
    if (document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.src = "https://www.instagram.com/embed.js";
    document.body.appendChild(s);
  }, [safePosts]);

  if (safePosts.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100">Instagram</h2>
        <span className="text-xs text-gray-400 font-medium">{safePosts.length} {safePosts.length === 1 ? "post" : "posts"}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {safePosts.map((url, i) => (
          <div key={`${url}-${i}`} className="overflow-hidden">
            <blockquote
              className="instagram-media"
              data-instgrm-permalink={url}
              data-instgrm-version="14"
              style={{ background: "#FFF", border: 0, margin: 0, padding: 0, width: "100%" }}
            >
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#d97706] text-sm font-bold">
                Ver no Instagram
              </a>
            </blockquote>
          </div>
        ))}
      </div>
    </div>
  );
}

function BusinessVitrine({
  businessId,
  businessName,
  whatsapp,
}: {
  businessId: number;
  businessName: string;
  whatsapp: string | null | undefined;
}) {
  const BASE = (import.meta as any).env?.VITE_API_URL || "";
  const { data, isLoading } = useQuery<{ data: PublicProduct[] }>({
    queryKey: ["/api/businesses", businessId, "products"],
    queryFn: () => fetch(`${BASE}/api/businesses/${businessId}/products`).then(r => r.json()),
    enabled: Number.isFinite(businessId),
  });

  const products = data?.data ?? [];
  const waBase = whatsapp ? `https://wa.me/55${whatsapp.replace(/\D/g, "")}` : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100">Vitrine de Produtos</h2>
        {products.length > 0 && (
          <span className="text-xs text-gray-400 font-medium">Peça pelo WhatsApp</span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" style={{ height: 240 }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">Este negócio ainda não cadastrou produtos na vitrine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {products.map((item) => {
            const showVideo = item.videoUrl && item.videoStatus === "approved";
            const poster = item.mediaUrl || "";
            const reelUrl = (() => {
              if (!item.instagramReelUrl) return null;
              try {
                const u = new URL(item.instagramReelUrl);
                if (u.protocol !== "https:" && u.protocol !== "http:") return null;
                const h = u.hostname.toLowerCase();
                return (h === "instagram.com" || h === "www.instagram.com") ? u.toString() : null;
              } catch { return null; }
            })();
            // Defensive guard: só aceita https://wa.me/* ou api.whatsapp.com/*.
            // Backend já sanitiza, mas validamos no cliente também para rejeitar dados antigos.
            const safeLink = (() => {
              if (!item.whatsappLink) return null;
              try {
                const u = new URL(item.whatsappLink);
                if (u.protocol !== "https:") return null;
                const h = u.hostname.toLowerCase();
                return (h === "wa.me" || h === "api.whatsapp.com" || h === "whatsapp.com") ? u.toString() : null;
              } catch { return null; }
            })();
            const waHref = safeLink
              || (waBase
                ? `${waBase}?text=${encodeURIComponent(`Olá! Vi o produto *${item.name}* da *${businessName}* no Hub Londrina e tenho interesse.`)}`
                : null);
            return (
              <div key={item.id} className="relative rounded-xl overflow-hidden group cursor-pointer bg-gray-200 dark:bg-gray-700" style={{ height: 240, boxShadow: "0 4px 16px rgba(0,0,0,0.14)" }}>
                {showVideo ? (
                  <VitrineVideo src={item.videoUrl!} poster={poster} />
                ) : poster ? (
                  <img src={poster} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
                )}
                {reelUrl && !showVideo && (
                  <a
                    href={reelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Ver Reel no Instagram"
                    className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-[#E1306C] via-[#F77737] to-[#FCAF45] text-white shadow-lg hover:scale-110 transition-transform"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.0) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1.5">
                  <p className="text-white font-black text-sm leading-tight line-clamp-2">{item.name}</p>
                  {item.price && <p className="text-white font-bold text-base leading-tight">R$ {item.price}</p>}
                  {reelUrl ? (
                    <a
                      href={reelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#E1306C] to-[#F77737] hover:opacity-90 text-white font-bold text-[11px] rounded-full py-1.5 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Instagram className="h-3 w-3" />
                      Ver no Instagram
                    </a>
                  ) : waHref ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden flex items-center justify-center gap-1.5 bg-gradient-to-b from-[#25D366] via-[#1ebe57] to-[#159a45] text-white font-bold text-[11px] rounded-full py-2 ring-1 ring-inset ring-white/25 shadow-[0_6px_16px_-4px_rgba(34,197,94,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_10px_22px_-6px_rgba(34,197,94,0.7),inset_0_1px_0_rgba(255,255,255,0.4)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
                      <MessageCircle className="h-3 w-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] relative" />
                      <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">Pedir no WhatsApp</span>
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(max)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < Math.round(rating) ? "fill-[#d97706] text-[#d97706]" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function getRatingDistribution(reviews: Review[]) {
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    dist[r.rating] = (dist[r.rating] ?? 0) + 1;
  }
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    pct: Math.round(((dist[stars] ?? 0) / total) * 100),
  }));
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diff < 1) return "Hoje";
  if (diff < 7) return `Há ${diff} dia${diff > 1 ? "s" : ""}`;
  if (diff < 30) return `Há ${Math.floor(diff / 7)} semana${Math.floor(diff / 7) > 1 ? "s" : ""}`;
  return `Há ${Math.floor(diff / 30)} ${Math.floor(diff / 30) > 1 ? "meses" : "mês"}`;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

async function submitReview(businessId: number, data: { author: string; rating: number; text: string }) {
  const res = await csrfFetch(`${API_BASE}/api/businesses/${businessId}/review`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Erro ao enviar avaliação");
  }
  return res.json();
}

function ReviewForm({ businessId, onSuccess }: { businessId: number; onSuccess: () => void }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Selecione uma nota"); return; }
    if (!author.trim()) { setError("Informe seu nome"); return; }
    setError("");
    setLoading(true);
    try {
      await submitReview(businessId, { author: author.trim(), rating, text: text.trim() });
      setSuccess(true);
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar avaliação");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <p className="font-bold text-emerald-700">Avaliação enviada! Obrigado.</p>
        <p className="text-xs text-emerald-600 mt-1">Sua avaliação já aparece na lista.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mt-6">
      <h3 className="font-bold text-[#3a2512] dark:text-gray-100 mb-4">Deixar avaliação</h3>
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Sua nota</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110"
            >
              <Star className={`h-8 w-8 ${(hovered || rating) >= s ? "fill-[#d97706] text-[#d97706]" : "fill-gray-200 text-gray-200"}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <input
          type="text"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          placeholder="Seu nome"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          required
        />
      </div>
      <div className="mb-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Comentário (opcional)"
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading || !rating || !author.trim()}
        className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {loading ? "Enviando..." : "Publicar avaliação"}
      </button>
    </form>
  );
}

export default function Negocio() {
  const [, params] = useRoute("/negocio/:id");
  const [, navigate] = useLocation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewKey, setReviewKey] = useState(0);
  const id = params?.id ? parseInt(params.id, 10) : 0;
  useEffect(() => {
    if (!id || !Number.isFinite(id)) navigate("/");
  }, []);
  const [activeTab, setActiveTab] = useState("produtos");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("review") !== "1") return;
    setActiveTab("avaliacoes");
    const t = setTimeout(() => {
      const el = document.getElementById("review-form");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const { data: business, isLoading, isError, refetch } = useGetBusinessById(id);
  const { data: similarData } = useListBusinesses({
    category: business?.categorySlug,
  });

  const reviews: Review[] = (business?.reviews ?? []) as Review[];
  const ratingDist = getRatingDistribution(reviews);
  const similar: Business[] = (similarData?.data ?? []).filter((b: Business) => b.id !== id).slice(0, 4);

  // SEO: meta tags + JSON-LD LocalBusiness para o Google entender que é um
  // estabelecimento físico em Londrina/PR. Aumenta chances de aparecer no
  // "Pacote Local" do Google (mapa + 3 negócios) e em rich results.
  const b: any = business || null;
  const seoTitle = b ? `${b.name} — ${b.categoryName || "Negócio Local"} em Londrina/PR | Hub Londrina` : "Hub Londrina";
  const seoDesc = b
    ? `${b.name}${b.region ? ` na ${b.region}` : ""} em Londrina/PR. ${b.description ? b.description.slice(0, 140) : "Veja telefone, WhatsApp, fotos, avaliações e localização."}`
    : "";
  const seoImage = imgSrc(b?.bannerUrl || b?.photoUrl) || "/opengraph.jpg";
  const jsonLd = b ? {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://www.hublondrina.com.br/negocio/${b.id}`,
    name: b.name,
    description: b.description || undefined,
    image: seoImage.startsWith("http") ? seoImage : `https://www.hublondrina.com.br${seoImage}`,
    url: `https://www.hublondrina.com.br/negocio/${b.id}`,
    telephone: b.phone || b.whatsapp || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address || undefined,
      addressLocality: "Londrina",
      addressRegion: "PR",
      addressCountry: "BR",
    },
    aggregateRating: b.reviewsCount && b.reviewsCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: b.rating,
      reviewCount: b.reviewsCount,
    } : undefined,
  } : null;
  useSeo({
    title: seoTitle,
    description: seoDesc,
    canonicalPath: id ? `/negocio/${id}` : "/",
    ogImage: seoImage,
    jsonLd,
  });

  // B2: vídeos da vitrine usam <VitrineVideo> com IntersectionObserver dedicado.

  if (isLoading) {
    return (
      <Layout>
        <div className="pt-16">
          <div className="h-[320px] bg-gray-200 animate-pulse" />
          <div className="max-w-7xl mx-auto px-4 py-10">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-56 mb-4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !business) {
    return (
      <Layout>
        <div className="pt-40 text-center container mx-auto px-4">
          <h1 className="font-black text-3xl text-[#3a2512] mb-4">Negócio não encontrado</h1>
          <p className="text-gray-500 mb-8">Este negócio não existe ou foi removido.</p>
          <Button onClick={() => navigate("/busca")} className="bg-[#d97706] hover:bg-[#b45309] text-white rounded-xl">
            Voltar para a busca
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="pb-20 bg-[#FBF7F2] dark:bg-gray-900 min-h-screen transition-colors">
        {/* Hero — banner full-bleed com Voltar/Favoritar flutuando sobre a foto.
            Removido strip marrom redundante (nome do negócio já aparece logo abaixo). */}
        <div className="bg-white dark:bg-gray-800 shadow-sm">
          {/* Banner com badges flutuantes — FULL-BLEED (sem max-w-7xl) pra
              cobrir a tela inteira. Badges/logo ancoram nas bordas da foto. */}
          <div className="relative w-full">
            {/* Voltar — botão flutuante com fundo escuro e backdrop-blur pra contraste em qualquer foto */}
            <button
              onClick={() => navigate("/busca")}
              aria-label="Voltar"
              className="absolute top-3 left-3 md:top-5 md:left-5 z-20 flex items-center gap-1.5 bg-black/55 hover:bg-black/70 text-white text-sm font-bold pl-2.5 pr-3.5 py-2 rounded-full backdrop-blur-md ring-1 ring-white/20 shadow-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            {/* Favoritar — flutuante no canto superior direito */}
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              aria-label="Favoritar"
              className={`absolute top-3 right-3 md:top-5 md:right-5 z-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md ring-1 shadow-lg transition-colors ${
                isFavorite
                  ? "bg-rose-500 text-white ring-white/30"
                  : "bg-black/55 hover:bg-black/70 text-white ring-white/20"
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-white" : ""}`} />
            </button>


            {(() => {
              // Capa: lojista sobe banner em "Fotos" (bannerUrl). Fallback para photoUrl (capa antiga).
              const heroImg = imgSrc((business as any).bannerUrl || business.photoUrl);
              return (
                <div className="w-full h-[220px] sm:h-[300px] md:h-[380px] lg:h-[420px] overflow-hidden">
                  {heroImg ? (
                    <img src={heroImg} alt={business.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#6F4E37] to-[#d97706]" />
                  )}
                </div>
              );
            })()}

            {/* Rating — canto inferior direito do banner pra liberar o topo direito pro favoritar */}
            <div className="absolute bottom-3 right-3 md:bottom-5 md:right-5 bg-white/95 backdrop-blur px-2.5 py-1 rounded-full flex items-center gap-1 text-xs font-black text-[#3a2512] shadow-sm">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {business.rating}
              <span className="font-medium opacity-60 text-[10px]">({business.reviewsCount})</span>
            </div>

            {/* Logo flutuante na borda inferior esquerda — alinhado com o
                container max-w-7xl do conteúdo abaixo via inner wrapper. */}
            <div className="absolute -bottom-12 left-4 md:left-8 lg:left-[max(2rem,calc((100vw-80rem)/2+2rem))] z-10">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white shadow-md flex items-center justify-center border-[3px] border-white overflow-hidden">
                {(business as any).logoUrl ? (
                  <img
                    src={imgSrc((business as any).logoUrl)}
                    alt={`Logo ${business.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#6F4E37] to-[#3a2512] flex items-center justify-center text-white">
                    <span className="font-['Playfair_Display'] text-2xl font-bold">
                      {business.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Premium badge — sobre a divisa banner/conteúdo, ancorado à
                direita do banner (full-bleed) com offset pra não colidir com
                o rating no canto inferior. */}
            {business.planType === "premium" && (
              <div className="absolute -bottom-3 right-4 md:right-8 lg:right-[max(2rem,calc((100vw-80rem)/2+2rem))]">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full ring-1 ring-amber-100 shadow-sm">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Premium
                </span>
              </div>
            )}
          </div>

          {/* Identificação + descrição destacada */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-8">

            {/* Linha de meta-tags: categoria · localização · selos */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {business.category && (
                <span className="text-[10px] font-bold text-[#4CAF50] bg-[#4CAF50]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {business.category.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#FF9800]" />
                {business.region}, Londrina - PR
              </span>
              {business.verified && (
                <span
                  title="Selo manual: documentação aprovada pela equipe Hub Londrina."
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 cursor-help"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verificado
                </span>
              )}
              {getAutoBadges({
                rating: business.rating,
                reviewsCount: business.reviewsCount,
                createdAt: (business as any).createdAt,
              }).map((b) => {
                const Icon = b.icon;
                const tone =
                  b.tone === "blue" ? "text-blue-700 bg-blue-50 ring-blue-100" :
                  b.tone === "purple" ? "text-violet-700 bg-violet-50 ring-violet-100" :
                  b.tone === "green" ? "text-emerald-700 bg-emerald-50 ring-emerald-100" :
                  "text-teal-700 bg-teal-50 ring-teal-100";
                return (
                  <span
                    key={b.key}
                    title={b.tooltip}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ring-1 cursor-help ${tone}`}
                  >
                    <Icon className="w-3 h-3" />
                    {b.label}
                  </span>
                );
              })}
            </div>

            {/* Nome + mini stats de reputação em linha */}
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <h1 className="font-['Playfair_Display'] font-black text-3xl md:text-4xl text-[#3a2512] dark:text-gray-100 leading-tight">
                {business.name}
              </h1>
              {business.reviewsCount > 0 && (
                <div className="flex items-center gap-3 mb-1 pb-0.5">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= Math.round(Number(business.rating)) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
                      />
                    ))}
                    <span className="ml-1 text-sm font-black text-[#3a2512] dark:text-gray-200">{business.rating}</span>
                  </div>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {business.reviewsCount} {business.reviewsCount === 1 ? "avaliação" : "avaliações"}
                  </span>
                </div>
              )}
            </div>

            {/* Descrição redesenhada — borda esquerda com acento + aspas decorativas */}
            {business.description && (
              <div className="relative max-w-2xl">
                {/* Aspas decorativas */}
                <span
                  aria-hidden
                  className="absolute -top-3 -left-1 font-['Playfair_Display'] text-6xl leading-none text-[#d97706]/20 dark:text-[#d97706]/15 select-none pointer-events-none"
                >
                  "
                </span>
                <div className="pl-5 border-l-4 border-[#d97706]/40 dark:border-[#d97706]/30">
                  <p className="text-[15px] md:text-[16px] text-[#4a3020] dark:text-gray-300 leading-relaxed font-medium italic">
                    {business.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Bar — wrap natural em todas as larguras pra evitar overflow horizontal */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm sticky top-16 z-40 transition-colors">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {business.whatsapp && (
                <a
                  href={`https://wa.me/55${business.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button className="group relative overflow-hidden bg-gradient-to-b from-[#25D366] via-[#1ebe57] to-[#159a45] text-white rounded-xl px-4 sm:px-5 h-10 font-bold flex items-center gap-2 text-sm ring-1 ring-inset ring-white/25 shadow-[0_10px_24px_-6px_rgba(34,197,94,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgba(34,197,94,0.7),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-110 active:translate-y-0">
                    <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-transform duration-700 group-hover:translate-x-full" />
                    <MessageCircle className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative" />
                    <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">WhatsApp</span>
                  </Button>
                </a>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex-shrink-0">
                  <Button variant="outline" className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-4 h-10 font-semibold flex items-center gap-2 shadow-none text-sm">
                    <Phone className="h-4 w-4" />
                    Ligar
                  </Button>
                </a>
              )}
              {business.instagram && (
                <a
                  href={(() => {
                    const ig = business.instagram.trim();
                    if (ig.startsWith("http")) return ig;
                    return `https://instagram.com/${ig.replace(/^@/, "")}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-3 sm:px-4 h-10 font-semibold flex items-center gap-2 shadow-none text-sm">
                    <Instagram className="h-4 w-4" style={{ color: "#E1306C" }} />
                    <span className="hidden sm:inline">Ver no </span>Instagram
                  </Button>
                </a>
              )}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(business.address + ", Londrina, PR")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
              >
                <Button variant="outline" className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-4 h-10 font-semibold flex items-center gap-2 shadow-none text-sm">
                  <Navigation className="h-4 w-4" />
                  Rotas
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className={`border-gray-200 rounded-xl px-4 h-10 font-semibold text-sm flex items-center gap-2 shadow-none ${isFavorite ? "bg-red-50 text-red-500 border-red-200" : "text-[#3a2512] hover:bg-gray-50"}`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                Salvar
              </Button>
              <Button
                variant="outline"
                className="border-gray-200 text-[#3a2512] hover:bg-gray-50 rounded-xl px-4 h-10 font-semibold text-sm flex items-center gap-2 shadow-none"
                onClick={() => navigator.share?.({ title: business.name, url: window.location.href })}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left — Tabs */}
            <div className="lg:col-span-2 space-y-6">
              {(() => {
                return (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-1 rounded-xl w-full justify-start h-auto flex-wrap shadow-sm mb-6">
                  <TabsTrigger value="produtos" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Produtos
                  </TabsTrigger>
                  <TabsTrigger value="vitrine" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Vitrine
                  </TabsTrigger>
                  <TabsTrigger value="sobre" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Sobre
                  </TabsTrigger>
                  <TabsTrigger value="avaliacoes" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                    Avaliações ({reviews.length})
                  </TabsTrigger>
                  {/* Aba Instagram só aparece publicamente se o negócio é Premium E tem
                      posts publicados. O CTA de upgrade fica restrito ao painel do
                      lojista (LojistaInstagram.tsx) — não expomos status de plano
                      para visitantes. */}
                  {business.planType === "premium" && ((business as any).instagramPosts ?? []).length > 0 && (
                    <TabsTrigger value="instagram" className="rounded-lg px-5 py-2 font-bold text-sm data-[state=active]:bg-[#d97706] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                      Instagram
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="sobre" className="focus-visible:outline-none">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100 mb-4">Sobre o Negócio</h2>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">{business.description}</p>
                  </div>
                </TabsContent>

                <TabsContent value="produtos" className="focus-visible:outline-none">
                  <BusinessProdutos businessId={business.id} businessName={business.name} whatsapp={business.whatsapp} />
                </TabsContent>

                <TabsContent value="vitrine" className="focus-visible:outline-none">
                  <BusinessVitrine businessId={business.id} businessName={business.name} whatsapp={business.whatsapp} />
                </TabsContent>

                {business.planType === "premium" && ((business as any).instagramPosts ?? []).length > 0 && (
                  <TabsContent value="instagram" className="focus-visible:outline-none">
                    <InstagramTab posts={(business as any).instagramPosts ?? []} />
                  </TabsContent>
                )}

                <TabsContent value="avaliacoes" className="focus-visible:outline-none">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="font-black text-2xl text-[#3a2512] dark:text-gray-100 mb-6">Avaliações</h2>

                    {reviews.length > 0 && (
                      <div className="flex flex-col md:flex-row items-center gap-6 mb-8 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <span className="text-5xl font-black text-[#3a2512] dark:text-gray-100">{business.rating}</span>
                          <div className="my-2"><StarRating rating={business.rating} /></div>
                          <span className="text-xs text-gray-500 font-medium">{reviews.length} avaliações</span>
                        </div>
                        <div className="flex-1 w-full space-y-2">
                          {ratingDist.map((row) => (
                            <div key={row.stars} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                              <span className="w-3 text-right text-xs">{row.stars}</span>
                              <Star className="h-3.5 w-3.5 text-gray-300 fill-gray-300" />
                              <Progress value={row.pct} className="h-1.5 flex-1 bg-gray-200 [&>div]:bg-[#d97706]" />
                              <span className="w-7 text-right text-xs text-gray-400">{row.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reviews.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Ainda não há avaliações para este negócio.</p>
                    ) : (
                      <div className="space-y-5">
                        {reviews.map((review: Review) => {
                          const initials = review.author.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                          const colors = ["bg-pink-100 text-pink-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700"];
                          const color = colors[review.id % colors.length];
                          return (
                            <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-5 last:pb-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 border border-gray-100 dark:border-gray-700">
                                    <AvatarFallback className={`font-bold text-sm ${color}`}>{initials}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-[#3a2512] dark:text-gray-100 text-sm flex items-center gap-2">
                                      {review.author}
                                      {review.verified && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Verificado
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400">{formatDate(review.createdAt)}</div>
                                  </div>
                                </div>
                                <StarRating rating={review.rating} />
                              </div>
                              {review.text && (
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{review.text}</p>
                              )}
                              {review.ownerResponse && (
                                <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3">
                                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Resposta do estabelecimento:</p>
                                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{review.ownerResponse}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div id="review-form">
                      <ReviewForm
                        businessId={id}
                        onSuccess={() => { setReviewKey(k => k + 1); refetch(); }}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
                );
              })()}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-5">
              {/* Contact Info */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-black text-lg text-[#3a2512] dark:text-gray-100 mb-4">Informações</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#d97706]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4.5 w-4.5 text-[#d97706]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#3a2512] dark:text-gray-200 text-xs uppercase tracking-wider mb-1">Endereço</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{business.address}, {business.region}<br />Londrina - PR</p>
                    </div>
                  </div>

                  {business.hours && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#4CAF50]/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4.5 w-4.5 text-[#4CAF50]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#3a2512] dark:text-gray-200 text-xs uppercase tracking-wider mb-1">Horário</h4>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{business.hours}</p>
                      </div>
                    </div>
                  )}

                  {business.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Phone className="h-4.5 w-4.5 text-blue-600" />
                      </div>
                      <a href={`tel:${business.phone}`} className="text-sm font-medium text-[#3a2512] dark:text-gray-200 hover:text-[#d97706] transition-colors">
                        {business.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                <div
                  className="relative h-44 bg-gradient-to-br from-[#e8f5e9] to-[#dcedc8] flex flex-col items-center justify-center gap-3 cursor-pointer group"
                  onClick={() =>
                    window.open(
                      `https://maps.google.com/?q=${encodeURIComponent(business.address + ", " + business.region + ", Londrina, PR")}`,
                      "_blank"
                    )
                  }
                >
                  {/* Decorative grid */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: "linear-gradient(#7cb342 1px, transparent 1px), linear-gradient(90deg, #7cb342 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#d97706] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <MapPin className="h-6 w-6 text-white fill-white" />
                    </div>
                    <span className="text-sm font-bold text-[#3a2512] text-center px-4 leading-tight">
                      {business.address}
                    </span>
                    <span className="text-xs text-[#3a2512]/60 font-medium">{business.region}, Londrina - PR</span>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-100">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(business.address + ", " + business.region + ", Londrina, PR")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm font-bold text-[#d97706] hover:text-[#b45309] transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    Ver no Google Maps
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Similar Businesses — only for free plan */}
              {business.planType === 'free' && similar.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base text-[#3a2512]">Veja também</h3>
                    <button
                      onClick={() => navigate(`/busca?categoria=${business.categorySlug}`)}
                      className="text-xs text-[#d97706] font-bold hover:text-[#b45309] transition-colors"
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="space-y-3">
                    {similar.map((biz: Business) => (
                      <BusinessCard key={biz.id} business={biz} size="sm" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
