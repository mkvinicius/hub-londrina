import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Instagram, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import { LojistaLayout } from "./LojistaLayout";
import { LockedFeature } from "@/components/LockedFeature";
import { getProfile, updateInstagramPosts } from "@/lib/lojista-api";

const MAX_POSTS = 12;

// Mesma validação canônica do backend (instagram-posts route): parse via URL,
// força HTTPS, host exato e shortcode estrito. Retorna a URL canônica ou null.
function canonicalize(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let u: URL;
  try { u = new URL(trimmed); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase();
  if (h !== "instagram.com" && h !== "www.instagram.com") return null;
  const m = u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/`;
}

interface Profile {
  planType: string;
  instagramPosts?: string[] | null;
}

export default function LojistaInstagram() {
  const { data: profile, isLoading, refetch } = useQuery<Profile>({
    queryKey: ["/api/lojista/profile"],
    queryFn: getProfile,
  });

  const [posts, setPosts] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.instagramPosts) setPosts(profile.instagramPosts);
  }, [profile]);

  const isPremium = profile?.planType === "premium";

  function addUrl() {
    const canon = canonicalize(draft);
    if (!canon) {
      setError("URL inválida. Use links como https://www.instagram.com/p/ABC123/");
      return;
    }
    if (posts.includes(canon)) {
      setError("Esse link já foi adicionado");
      return;
    }
    if (posts.length >= MAX_POSTS) {
      setError(`Limite de ${MAX_POSTS} posts atingido`);
      return;
    }
    setPosts([...posts, canon]);
    setDraft("");
    setError("");
  }

  function removeUrl(idx: number) {
    setPosts(posts.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateInstagramPosts(posts);
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <LojistaLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E1306C] via-[#F77737] to-[#FCAF45] flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-2xl text-[#3a2512]">Instagram no Perfil</h1>
            <p className="text-sm text-gray-500">Adicione até {MAX_POSTS} posts/reels que aparecerão na aba Instagram do seu perfil público.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <div className="h-6 bg-gray-100 rounded w-1/3 mb-4 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
          </div>
        ) : !isPremium ? (
          <LockedFeature planRequired="premium" currentPlan={profile?.planType || "free"} message="A aba Instagram é exclusiva do plano Premium">
            <div />
          </LockedFeature>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-700">
                {posts.length} / {MAX_POSTS} posts
              </span>
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 text-sm font-bold">
                  <Check className="w-4 h-4" /> Salvo!
                </span>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                placeholder="https://www.instagram.com/p/..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20 outline-none text-sm"
                disabled={posts.length >= MAX_POSTS}
              />
              <button
                onClick={addUrl}
                disabled={posts.length >= MAX_POSTS || !draft.trim()}
                className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-5 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <p className="text-xs text-gray-500 mb-4">
              Aceita links públicos de posts, reels ou IGTV. O conteúdo é renderizado pelo embed oficial do Instagram (sem precisar de API key).
            </p>

            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Instagram className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Nenhum post adicionado ainda.</p>
              </div>
            ) : (
              <ul className="space-y-2 mb-4">
                {posts.map((url, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <Instagram className="w-4 h-4 text-[#E1306C] flex-shrink-0" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-gray-700 truncate hover:text-[#d97706]"
                    >
                      {url}
                    </a>
                    <button
                      onClick={() => removeUrl(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </LojistaLayout>
  );
}
