import { useEffect, useState } from "react";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, uploadLogo, uploadBanner, uploadPhoto, deletePhoto } from "@/lib/lojista-api";
import { Upload, Trash2, ImageIcon } from "lucide-react";

export default function LojistaFotos() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getProfile().then(setProfile).finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  const apiBase = import.meta.env.VITE_API_URL || "";
  function imgSrc(url: string) {
    if (!url) return "";
    return url.startsWith("/") ? `${apiBase}/api${url}` : url;
  }

  const planLimits: Record<string, number> = { free: 1, destaque: 10, premium: 999 };
  const maxPhotos = planLimits[profile.planType] || 1;
  const photos = profile.photos || [];

  async function handleUpload(type: "logo" | "banner" | "photo", file: File) {
    setUploading(type);
    setMsg("");
    try {
      if (type === "logo") {
        const result = await uploadLogo(file);
        setProfile((p: any) => ({ ...p, logoUrl: result.logoUrl }));
      } else if (type === "banner") {
        const result = await uploadBanner(file);
        setProfile((p: any) => ({ ...p, bannerUrl: result.bannerUrl }));
      } else {
        const result = await uploadPhoto(file);
        setProfile((p: any) => ({ ...p, photos: [...(p.photos || []), result.photoUrl] }));
      }
      setMsg("Upload realizado!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setUploading(null);
    }
  }

  async function handleDeletePhoto(idx: number) {
    if (!confirm("Remover esta foto?")) return;
    try {
      const result = await deletePhoto(idx);
      setProfile((p: any) => ({ ...p, photos: result.photos }));
      setMsg("Foto removida");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    }
  }

  function FileInput({ type, accept }: { type: "logo" | "banner" | "photo"; accept?: string }) {
    return (
      <label className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-sm disabled:opacity-50">
        <Upload className="w-4 h-4" />
        {uploading === type ? "Enviando..." : "Enviar"}
        <input
          type="file"
          accept={accept || "image/*"}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(type, file);
            e.target.value = "";
          }}
          disabled={uploading !== null}
        />
      </label>
    );
  }

  return (
    <LojistaLayout>
      <h1 className="text-2xl font-black text-gray-800 mb-6">Fotos</h1>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Logo</h2>
            <FileInput type="logo" />
          </div>
          <div className="flex justify-center">
            {profile.logoUrl ? (
              <img src={imgSrc(profile.logoUrl)} alt="Logo" className="w-32 h-32 rounded-full object-cover border-4 border-gray-200" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-gray-200">
                <ImageIcon className="w-12 h-12 text-gray-300" />
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Banner</h2>
            <FileInput type="banner" />
          </div>
          <div className="flex justify-center">
            {profile.bannerUrl ? (
              <img src={imgSrc(profile.bannerUrl)} alt="Banner" className="w-full aspect-video rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-full aspect-video rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                <ImageIcon className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Galeria de Fotos</h2>
            <p className="text-sm text-gray-500">{photos.length}/{maxPhotos === 999 ? "∞" : maxPhotos} fotos usadas ({profile.planType})</p>
          </div>
          {photos.length < maxPhotos && <FileInput type="photo" />}
        </div>
        {photos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ImageIcon className="w-16 h-16 mx-auto mb-3" />
            <p>Nenhuma foto adicionada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((url: string, idx: number) => (
              <div key={idx} className="relative group">
                <img src={imgSrc(url)} alt={`Foto ${idx + 1}`} className="w-full aspect-square rounded-xl object-cover border border-gray-200" />
                <button
                  onClick={() => handleDeletePhoto(idx)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </LojistaLayout>
  );
}
