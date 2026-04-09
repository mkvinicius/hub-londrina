import { useEffect, useState, useCallback } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { lojistaFetch, getProfile } from "@/lib/lojista-api";
import { Star, MessageSquare, CheckCircle2, Copy, RefreshCw } from "lucide-react";

interface Review {
  id: number;
  businessId: number;
  author: string;
  rating: number;
  text: string;
  verified: boolean;
  ownerResponse: string | null;
  createdAt: string;
}

interface Profile {
  id: number;
  name: string;
  planType: string;
  reviewsCount: number;
  rating: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= rating ? "fill-[#d97706] text-[#d97706]" : "fill-gray-200 text-gray-200"}`} />
      ))}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function LojistaAvaliacoes() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<number | null>(null);
  const [responseText, setResponseText] = useState<Record<number, string>>({});
  const [savingResponse, setSavingResponse] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        getProfile(),
        lojistaFetch("/api/lojista/reviews"),
      ]);
      setProfile(p);
      setReviews(r.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canRespond = profile?.planType !== "free";
  const bemAvaliado = (profile?.rating ?? 0) >= 4.7 && (profile?.reviewsCount ?? 0) >= 10;
  const toSelo = Math.max(0, 10 - (profile?.reviewsCount ?? 0));

  const reviewLink = profile
    ? `${window.location.origin}/negocio/${profile.id}?review=1`
    : "";

  function copyLink() {
    navigator.clipboard.writeText(reviewLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function saveResponse(reviewId: number) {
    const text = responseText[reviewId];
    if (!text?.trim()) return;
    setSavingResponse(reviewId);
    try {
      await lojistaFetch(`/api/lojista/reviews/${reviewId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: text.trim() }),
      });
      setResponding(null);
      fetchData();
    } catch (e: any) {
      alert(e.message || "Erro ao salvar resposta");
    } finally {
      setSavingResponse(null);
    }
  }

  async function removeResponse(reviewId: number) {
    if (!confirm("Remover resposta?")) return;
    await lojistaFetch(`/api/lojista/reviews/${reviewId}/respond`, { method: "DELETE" });
    fetchData();
  }

  if (loading) {
    return (
      <LojistaLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
      </LojistaLayout>
    );
  }

  return (
    <LojistaLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Avaliações</h1>
          <p className="text-sm text-gray-500 mt-1">{reviews.length} avaliações recebidas</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-3xl font-black text-gray-800 mb-1">{profile?.rating?.toFixed(1) || "—"}</div>
          <StarRating rating={Math.round(profile?.rating ?? 0)} />
          <div className="text-xs text-gray-400 mt-2">{reviews.length} avaliações</div>
        </div>
        <div className={`bg-white rounded-2xl border shadow-sm p-5 ${bemAvaliado ? "border-emerald-300 bg-emerald-50" : "border-gray-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className={`w-5 h-5 ${bemAvaliado ? "text-emerald-500" : "text-gray-300"}`} />
            <span className={`text-sm font-bold ${bemAvaliado ? "text-emerald-700" : "text-gray-500"}`}>
              {bemAvaliado ? "Bem Avaliado ✓" : "Selo Bem Avaliado"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {bemAvaliado
              ? "Seu negócio tem o selo Bem Avaliado!"
              : `Nota ≥ 4.7 + 10 avaliações. ${toSelo > 0 ? `Você está a ${toSelo} avaliações!` : "Aumente sua nota."}`}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Link para pedir avaliação</div>
          <div className="flex gap-2">
            <input
              readOnly
              value={reviewLink}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-500 truncate"
            />
            <button
              onClick={copyLink}
              className="px-3 py-2 rounded-lg bg-[#d97706] text-white hover:bg-[#b45309] transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">Compartilhe com seus clientes pelo WhatsApp</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Você ainda não recebeu avaliações.</p>
          <p className="text-gray-400 text-xs mt-1">Compartilhe o link acima com seus clientes!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => {
            const colors = ["bg-pink-100 text-pink-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700"];
            const color = colors[review.id % colors.length];
            const initials = review.author.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
            const isResponding = responding === review.id;

            return (
              <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${color}`}>
                      {initials}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        {review.author}
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
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
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{review.text}</p>
                )}

                {review.ownerResponse && !isResponding && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">Sua resposta:</p>
                    <p className="text-sm text-amber-800 leading-relaxed">{review.ownerResponse}</p>
                    {canRespond && (
                      <button
                        onClick={() => removeResponse(review.id)}
                        className="text-xs text-red-500 hover:text-red-700 mt-2 font-medium"
                      >
                        Remover resposta
                      </button>
                    )}
                  </div>
                )}

                {canRespond && !review.ownerResponse && !isResponding && (
                  <button
                    onClick={() => setResponding(review.id)}
                    className="flex items-center gap-2 text-xs font-bold text-[#d97706] hover:text-[#b45309] transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Responder
                  </button>
                )}

                {isResponding && (
                  <div className="mt-2">
                    <textarea
                      value={responseText[review.id] || ""}
                      onChange={e => setResponseText(prev => ({ ...prev, [review.id]: e.target.value }))}
                      placeholder="Escreva sua resposta..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => saveResponse(review.id)}
                        disabled={savingResponse === review.id || !responseText[review.id]?.trim()}
                        className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {savingResponse === review.id ? "Salvando..." : "Publicar resposta"}
                      </button>
                      <button
                        onClick={() => setResponding(null)}
                        className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!canRespond && (
                  <p className="text-xs text-gray-400 mt-2">
                    Resposta a avaliações disponível no plano Destaque ou superior.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </LojistaLayout>
  );
}
