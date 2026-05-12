import { useEffect, useState, useRef } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { LojistaLayout } from "./LojistaLayout";
import { getProfile, getProducts, createProduct, updateProduct, deleteProduct, getLojistaToken, uploadVitrineVideo, dismissDeactivationNotice, dismissHiddenPhotosNotice } from "@/lib/lojista-api";
import { Plus, Trash2, Edit2, X, Check, Upload, Link2, Video, Clock, AlertTriangle, ArrowLeft, ArrowRight, Star } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

// Limites de fotos por plano (espelha PRODUCT_IMAGE_LIMITS no backend).
const IMAGE_LIMITS: Record<string, number> = { free: 0, destaque: 5, premium: 8 };

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  images: string[] | null;
  video360Url: string | null;
  whatsappLink: string | null;
  isActive: boolean;
  sortOrder: number;
  videoUrl: string | null;
  videoStatus: "none" | "pending" | "approved" | "rejected" | null;
  videoRejectionReason: string | null;
  instagramReelUrl: string | null;
  quantity: number | null;
}

export default function LojistaProdutos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", mediaUrl: "", mediaType: "image", whatsappLink: "", videoUrl: "", instagramReelUrl: "", quantity: "", images: [] as string[], video360Url: "" });
  const [video360Uploading, setVideo360Uploading] = useState(false);
  const video360FileRef = useRef<HTMLInputElement>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [vitrineUploading, setVitrineUploading] = useState(false);
  const vitrineFileRef = useRef<HTMLInputElement>(null);

  // Crop modal (galeria de fotos do produto) — abre quando o usuário escolhe um arquivo,
  // recorta em 4:3 antes do upload. Mantém o limite por plano (free=0, destaque=5, premium=8).
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropFileName, setCropFileName] = useState<string>("");
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [mediaMode, setMediaMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getProfile(), getProducts()])
      .then(([p, r]) => {
        setProfile(p);
        setProducts(r.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LojistaLayout><div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div></LojistaLayout>;
  }

  // Limites de produtos por plano: Gratuito=0, Base/Destaque=6, Premium=10.
  // Plano Gratuito não pode criar novos produtos, mas pode editar/excluir
  // os que foram migrados do antigo upload de fotos.
  const PRODUCT_LIMITS: Record<string, number> = { free: 0, destaque: 6, premium: 10 };
  const productLimit = PRODUCT_LIMITS[profile?.planType] ?? 0;
  const activeCount = products.filter(p => p.isActive).length;
  const reachedLimit = activeCount >= productLimit;
  const isFree = profile?.planType === "free";
  const autoDeactivated = profile?._productsAutoDeactivated ?? 0;
  // Task #12 — fotos da galeria do negócio que foram ocultadas em downgrade.
  // Limites: free=1, destaque=10, premium=999.
  const photosAutoHidden = profile?._photosAutoHidden ?? 0;
  const PHOTO_LIMITS_BY_PLAN: Record<string, number> = { free: 1, destaque: 10, premium: 999 };
  const photoLimit = PHOTO_LIMITS_BY_PLAN[profile?.planType] ?? 1;

  async function handleDismissNotice() {
    try {
      await dismissDeactivationNotice();
      setProfile((prev: any) => prev ? { ...prev, _productsAutoDeactivated: 0 } : prev);
    } catch {
      // best-effort: o aviso reaparece no próximo refresh do profile
    }
  }

  async function handleDismissPhotosNotice() {
    try {
      await dismissHiddenPhotosNotice();
      setProfile((prev: any) => prev ? { ...prev, _photosAutoHidden: 0 } : prev);
    } catch {
      // best-effort
    }
  }

  function resetForm() {
    setForm({ name: "", description: "", price: "", mediaUrl: "", mediaType: "image", whatsappLink: "", videoUrl: "", instagramReelUrl: "", quantity: "", images: [], video360Url: "" });
    setShowForm(false);
    setEditId(null);
    setMediaMode("url");
    setUploadPreview(null);
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price || "",
      mediaUrl: p.mediaUrl || "",
      mediaType: p.mediaType || "image",
      whatsappLink: p.whatsappLink || "",
      videoUrl: p.videoUrl || "",
      instagramReelUrl: p.instagramReelUrl || "",
      quantity: p.quantity != null ? String(p.quantity) : "",
      images: Array.isArray(p.images) ? p.images : [],
      video360Url: p.video360Url || "",
    });
    setEditId(p.id);
    setShowForm(true);
    setMediaMode("url");
    setUploadPreview(p.mediaUrl || null);
  }

  // Abre o modal de crop quando o usuário escolhe um arquivo para a galeria.
  // O upload real só acontece depois de "Recortar e enviar".
  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (galleryFileRef.current) galleryFileRef.current.value = "";
    if (!file) return;
    const limit = IMAGE_LIMITS[profile?.planType] ?? 0;
    if (form.images.length >= limit) {
      setMsg(`Erro: limite de ${limit} fotos atingido para o plano ${profile?.planType}.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMsg("Erro: galeria aceita apenas imagens (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg(`Erro: ${file.name} acima de 10MB.`);
      return;
    }
    setMsg("");
    setCropFileName(file.name);
    setCrop(undefined);
    setCompletedCrop(null);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function onCropImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    cropImgRef.current = e.currentTarget;
    const initial = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, 4 / 3, naturalWidth, naturalHeight),
      naturalWidth,
      naturalHeight,
    );
    setCrop(initial);
  }

  function closeCrop() {
    setCropSrc(null);
    setCropFileName("");
    setCrop(undefined);
    setCompletedCrop(null);
    cropImgRef.current = null;
  }

  // Converte o recorte em Blob (JPEG q=0.92) e envia via /lojista/upload/product-media.
  async function confirmCropAndUpload() {
    const img = cropImgRef.current;
    const c = completedCrop;
    if (!img || !c || !c.width || !c.height) {
      setMsg("Selecione uma área para recortar.");
      return;
    }
    setGalleryUploading(true);
    setMsg("");
    try {
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(c.width * scaleX));
      canvas.height = Math.max(1, Math.round(c.height * scaleY));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponível");
      ctx.drawImage(
        img,
        c.x * scaleX, c.y * scaleY, c.width * scaleX, c.height * scaleY,
        0, 0, canvas.width, canvas.height,
      );
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Falha ao gerar imagem")), "image/jpeg", 0.92);
      });
      const token = getLojistaToken();
      const fd = new FormData();
      const baseName = (cropFileName || "foto").replace(/\.[^.]+$/, "") + ".jpg";
      fd.append("file", blob, baseName);
      const res = await fetch(`${API_BASE}/api/lojista/upload/product-media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha no upload");
      if (data.mediaType === "image" && data.mediaUrl) {
        setForm(f => ({ ...f, images: [...f.images, data.mediaUrl] }));
      }
      closeCrop();
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setGalleryUploading(false);
    }
  }

  function removeImage(index: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  function moveImage(index: number, dir: -1 | 1) {
    setForm(f => {
      const arr = [...f.images];
      const j = index + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[index], arr[j]] = [arr[j], arr[index]];
      return { ...f, images: arr };
    });
  }

  function makeCover(index: number) {
    setForm(f => {
      if (index <= 0 || index >= f.images.length) return f;
      const arr = [...f.images];
      const [picked] = arr.splice(index, 1);
      arr.unshift(picked);
      return { ...f, images: arr };
    });
  }

  // Upload do vídeo 360° (somente Premium). Aceita MP4 até 50MB.
  async function handleVideo360Upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/mp4") && !file.name.toLowerCase().endsWith(".mp4")) {
      setMsg("Erro: vídeo 360° deve ser MP4.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setMsg("Erro: vídeo 360° deve ter até 50 MB.");
      return;
    }
    setVideo360Uploading(true);
    setMsg("");
    try {
      const token = getLojistaToken();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/lojista/upload/product-media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");
      setForm(f => ({ ...f, video360Url: data.mediaUrl }));
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setVideo360Uploading(false);
      if (video360FileRef.current) video360FileRef.current.value = "";
    }
  }

  async function handleVitrineVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/mp4") && !file.name.toLowerCase().endsWith(".mp4")) {
      setMsg("Erro: somente arquivos MP4 são aceitos no vídeo da Vitrine.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMsg("Erro: vídeo da Vitrine deve ter até 20 MB.");
      return;
    }
    setVitrineUploading(true);
    setMsg("");
    try {
      const { videoUrl } = await uploadVitrineVideo(file);
      setForm(f => ({ ...f, videoUrl }));
      setMsg("Vídeo enviado! Será revisado pela equipe Hub Londrina antes de aparecer na Vitrine.");
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setVitrineUploading(false);
      if (vitrineFileRef.current) vitrineFileRef.current.value = "";
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setMsg(`Arquivo muito grande. Máximo: ${isVideo ? "50MB" : "10MB"}`);
      return;
    }

    setUploading(true);
    setMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getLojistaToken();
      const res = await fetch(`${API_BASE}/api/lojista/upload/product-media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");
      setForm(f => ({ ...f, mediaUrl: data.mediaUrl, mediaType: data.mediaType }));
      if (data.mediaType === "image") setUploadPreview(data.mediaUrl);
      else setUploadPreview(null);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    setMsg("");
    try {
      if (editId) {
        const result = await updateProduct(editId, form);
        setProducts(ps => ps.map(p => p.id === editId ? result : p));
        setMsg("Produto atualizado!");
      } else {
        const result = await createProduct(form);
        setProducts(ps => [...ps, result]);
        setMsg("Produto criado!");
      }
      resetForm();
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Excluir este produto?")) return;
    try {
      await deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      setMsg("Produto excluído");
      setTimeout(() => setMsg(""), 3000);
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`);
    }
  }

  async function handleToggle(p: Product) {
    try {
      const result = await updateProduct(p.id, { isActive: !p.isActive });
      setProducts(ps => ps.map(x => x.id === p.id ? result : x));
      setMsg("");
    } catch (err: any) {
      // Task #8 — backend rejeita reativação se o limite do plano foi atingido.
      setMsg(`Erro: ${err.message}`);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706] focus:border-transparent";

  return (
    <LojistaLayout>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black text-gray-800">Produtos</h1>
        {!showForm && (
          <button
            onClick={() => { if (!reachedLimit) { resetForm(); setShowForm(true); } }}
            disabled={reachedLimit}
            title={reachedLimit ? `Limite de ${productLimit} produtos atingido. Faça upgrade para Premium.` : ""}
            className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-4 py-2.5 rounded-xl transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        )}
      </div>
      {autoDeactivated > 0 && (
        <div className="mb-4 p-4 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-bold mb-1">
              {autoDeactivated} produto{autoDeactivated === 1 ? "" : "s"} foi{autoDeactivated === 1 ? "" : "ram"} desativado{autoDeactivated === 1 ? "" : "s"} após mudança de plano
            </p>
            <p>
              Seu plano atual permite até <strong>{productLimit}</strong> produto{productLimit === 1 ? "" : "s"} ativo{productLimit === 1 ? "" : "s"}.
              Os mais recentes foram ocultados do perfil público, mas continuam salvos abaixo. Clique em <strong>Inativo</strong> para reativar
              {productLimit === 0 ? " (requer upgrade do plano)" : " — desative outro antes se já estiver no limite"}.
            </p>
          </div>
          <button
            onClick={handleDismissNotice}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs px-2 py-1 rounded-md hover:bg-amber-100"
          >
            Dispensar
          </button>
        </div>
      )}
      {photosAutoHidden > 0 && (
        <div className="mb-4 p-4 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-bold mb-1">
              {photosAutoHidden} foto{photosAutoHidden === 1 ? "" : "s"} da galeria do negócio foi{photosAutoHidden === 1 ? "" : "ram"} ocultada{photosAutoHidden === 1 ? "" : "s"} após mudança de plano
            </p>
            <p>
              Seu plano atual permite até <strong>{photoLimit === 999 ? "ilimitadas" : photoLimit}</strong> foto{photoLimit === 1 ? "" : "s"} na galeria.
              As mais recentes foram ocultadas do perfil público, mas os arquivos continuam guardados.
              {photoLimit < 999 && " Faça upgrade para Premium se quiser exibir todas novamente."}
            </p>
          </div>
          <button
            onClick={handleDismissPhotosNotice}
            className="text-amber-700 hover:text-amber-900 font-bold text-xs px-2 py-1 rounded-md hover:bg-amber-100"
          >
            Dispensar
          </button>
        </div>
      )}
      <p className="text-sm text-gray-500 mb-6">
        {activeCount}/{productLimit} produtos ativos
        {products.length !== activeCount && (
          <> · {products.length - activeCount} inativo{products.length - activeCount === 1 ? "" : "s"}</>
        )}
        {isFree && (
          <> · <a href="/lojista/plano" className="text-[#d97706] font-bold hover:underline">Faça upgrade</a> para cadastrar produtos (Base: 6 · Premium: 10)</>
        )}
        {profile?.planType === "destaque" && (
          <> · <a href="/lojista/plano" className="text-[#d97706] font-bold hover:underline">Upgrade para Premium</a> para cadastrar mais</>
        )}
      </p>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">{editId ? "Editar Produto" : "Novo Produto"}</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Preço (R$)</label>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="49.90" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade disponível</label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="Ex: 10 (deixe em branco se ilimitado)"
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">Aparece para o cliente no perfil público.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Sem descrição" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Mídia do Produto</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMediaMode("upload")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${mediaMode === "upload" ? "bg-[#d97706] text-white border-[#d97706]" : "bg-white text-gray-600 border-gray-300 hover:border-[#d97706]"}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Fazer upload
                </button>
                <button
                  type="button"
                  onClick={() => setMediaMode("url")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${mediaMode === "url" ? "bg-[#d97706] text-white border-[#d97706]" : "bg-white text-gray-600 border-gray-300 hover:border-[#d97706]"}`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  URL externa
                </button>
              </div>

              {mediaMode === "upload" ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,video/mp4"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-500 hover:border-[#d97706] hover:text-[#d97706] transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                    <span className="text-sm font-medium">
                      {uploading ? "Enviando..." : "Clique para selecionar arquivo"}
                    </span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP (máx 10MB) · MP4 (máx 50MB)</span>
                  </button>
                  {uploadPreview && (
                    <img src={uploadPreview} alt="Preview" className="mt-3 w-full max-h-48 rounded-xl object-cover border border-gray-200" />
                  )}
                  {form.mediaUrl && form.mediaType === "video" && (
                    <p className="mt-2 text-xs text-green-600 font-medium">✓ Vídeo enviado com sucesso</p>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={form.mediaUrl}
                    onChange={e => setForm(f => ({ ...f, mediaUrl: e.target.value }))}
                    placeholder="https://..."
                    className={inputCls + " flex-1"}
                  />
                  <select
                    value={form.mediaType}
                    onChange={e => setForm(f => ({ ...f, mediaType: e.target.value }))}
                    className="border border-gray-300 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]"
                  >
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
              )}
            </div>
            <div className="md:col-span-2 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  Galeria de fotos
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold cursor-help"
                    title="Tamanho recomendado: 800x600px (4:3). JPG, PNG ou WebP. Máx 10MB por foto. Você pode recortar antes de enviar. A primeira foto vira a capa do card."
                    aria-label="Ajuda sobre fotos da galeria"
                  >?</span>
                  {profile?.planType && profile.planType !== "free" && (
                    <span className="ml-1 text-xs font-medium text-gray-500">
                      ({form.images.length}/{IMAGE_LIMITS[profile.planType] ?? 0})
                    </span>
                  )}
                </label>
                {profile?.planType !== "free" && (
                  <button
                    type="button"
                    onClick={() => galleryFileRef.current?.click()}
                    disabled={galleryUploading || form.images.length >= (IMAGE_LIMITS[profile?.planType] ?? 0)}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:border-[#d97706] text-gray-700 hover:text-[#d97706] font-bold px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {galleryUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Adicionar foto
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={galleryFileRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handleGalleryUpload}
                className="hidden"
              />
              {profile?.planType === "free" ? (
                <p className="text-xs text-gray-500">
                  Disponível a partir do plano <a href="/lojista/plano" className="text-[#d97706] font-bold hover:underline">Destaque</a> (5 fotos) ou Premium (8 fotos).
                </p>
              ) : form.images.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Adicione até {IMAGE_LIMITS[profile?.planType] ?? 0} fotos. A primeira é a capa exibida no card.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {form.images.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full aspect-square object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 bg-[#d97706] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          <Star className="w-2.5 h-2.5" /> Capa
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 py-1">
                        <button type="button" title="Mover para esquerda" onClick={() => moveImage(i, -1)} disabled={i === 0} className="text-white disabled:opacity-30 hover:text-[#FF9800]"><ArrowLeft className="w-3.5 h-3.5" /></button>
                        {i !== 0 && (
                          <button type="button" title="Tornar capa" onClick={() => makeCover(i)} className="text-white hover:text-[#FF9800]"><Star className="w-3.5 h-3.5" /></button>
                        )}
                        <button type="button" title="Mover para direita" onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="text-white disabled:opacity-30 hover:text-[#FF9800]"><ArrowRight className="w-3.5 h-3.5" /></button>
                        <button type="button" title="Remover" onClick={() => removeImage(i)} className="text-white hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-[#FF9800]" />
                <label className="text-sm font-bold text-gray-700">Vídeo 360° do produto</label>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Premium</span>
              </div>
              {profile?.planType !== "premium" ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2">
                  Exclusivo do plano Premium. <a href="/lojista/plano" className="font-bold underline">Ver planos</a>.
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    MP4 mostrando o produto em 360° (até 50 MB). Aparece no perfil público com botão "Ver em 360°".
                  </p>
                  <input
                    type="file"
                    ref={video360FileRef}
                    accept="video/mp4"
                    onChange={handleVideo360Upload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => video360FileRef.current?.click()}
                      disabled={video360Uploading}
                      className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-[#FF9800] text-gray-700 hover:text-[#FF9800] font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {video360Uploading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {video360Uploading ? "Enviando..." : (form.video360Url ? "Trocar vídeo 360°" : "Enviar vídeo 360° MP4")}
                    </button>
                    {form.video360Url && (
                      <>
                        <a href={form.video360Url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FF9800] font-bold hover:underline">
                          Ver vídeo 360°
                        </a>
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, video360Url: "" }))}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Link WhatsApp</label>
              <input value={form.whatsappLink} onChange={e => setForm(f => ({ ...f, whatsappLink: e.target.value }))} placeholder="https://wa.me/5543..." className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Reel do Instagram (opcional)</label>
              <input
                value={form.instagramReelUrl}
                onChange={e => setForm(f => ({ ...f, instagramReelUrl: e.target.value }))}
                placeholder="https://www.instagram.com/reel/..."
                className={inputCls}
              />
              <p className="text-xs text-gray-500 mt-1">
                Se preenchido, o card do produto na vitrine vira um botão "Ver no Instagram" que abre o Reel em nova aba.
              </p>
            </div>

            {profile?.planType === "premium" && (
              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="w-4 h-4 text-[#FF9800]" />
                  <label className="text-sm font-bold text-gray-700">Vídeo da Vitrine (opcional)</label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  MP4 vertical de até 20 MB / 60s. Após o upload, nossa equipe revisa antes do
                  vídeo entrar na rotação aleatória da home (até 12 vagas).
                </p>

                {(() => {
                  const editing = editId ? products.find(p => p.id === editId) : null;
                  const status = editing?.videoStatus ?? (form.videoUrl ? "pending" : "none");
                  const reason = editing?.videoRejectionReason;
                  if (status === "approved") return (
                    <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" /> Aprovado — está rodando na Vitrine
                    </div>
                  );
                  if (status === "pending") return (
                    <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5" /> Aguardando aprovação do admin
                    </div>
                  );
                  if (status === "rejected") return (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs">
                      <div className="flex items-center gap-1.5 font-bold mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Vídeo rejeitado</div>
                      {reason && <div className="text-red-600">{reason}</div>}
                      <div className="text-red-600 mt-1">Faça upload de um novo vídeo para reenviar.</div>
                    </div>
                  );
                  return null;
                })()}

                <input
                  type="file"
                  ref={vitrineFileRef}
                  accept="video/mp4"
                  onChange={handleVitrineVideoUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => vitrineFileRef.current?.click()}
                    disabled={vitrineUploading}
                    className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-[#FF9800] text-gray-700 hover:text-[#FF9800] font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {vitrineUploading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {vitrineUploading ? "Enviando..." : (form.videoUrl ? "Trocar vídeo" : "Enviar vídeo MP4")}
                  </button>
                  {form.videoUrl && (
                    <>
                      <a href={form.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FF9800] font-bold hover:underline">
                        Ver vídeo enviado
                      </a>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, videoUrl: "" }))}
                        className="text-xs text-red-500 font-bold hover:underline"
                      >
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving || !form.name} className="flex items-center gap-2 bg-[#d97706] hover:bg-[#b45309] text-white font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
              <Check className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button onClick={resetForm} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      {products.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center text-gray-400">
          <p className="text-lg mb-2">Nenhum produto cadastrado</p>
          <p className="text-sm">Clique em "Novo Produto" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4 ${!p.isActive ? "opacity-60" : ""}`}>
              {p.mediaUrl && p.mediaType === "image" && (
                <img src={p.mediaUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-500 truncate">{p.description}</p>}
              </div>
              {p.videoUrl && p.videoStatus && p.videoStatus !== "none" && (
                <span
                  title={p.videoStatus === "rejected" ? p.videoRejectionReason || "Vídeo rejeitado" : undefined}
                  className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                    p.videoStatus === "approved" ? "bg-green-100 text-green-700"
                    : p.videoStatus === "pending" ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                  }`}
                >
                  <Video className="w-3 h-3" />
                  {p.videoStatus === "approved" ? "Vitrine" : p.videoStatus === "pending" ? "Aguardando" : "Rejeitado"}
                </span>
              )}
              {p.price && (
                <span className="text-lg font-bold text-[#d97706] whitespace-nowrap">R$ {p.price}</span>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {p.isActive ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-[#d97706]"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crop da galeria de produtos — abre ao escolher um arquivo. */}
      {cropSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => { if (!galleryUploading) closeCrop(); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <div>
                <h3 className="font-bold text-gray-800">Recortar imagem</h3>
                <p className="text-xs text-gray-500">Arraste para ajustar. Proporção sugerida 4:3 (você pode mudar pelas alças).</p>
              </div>
              <button
                onClick={closeCrop}
                disabled={galleryUploading}
                className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-40"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4">
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                onComplete={(c) => setCompletedCrop(c)}
                minWidth={50}
                minHeight={50}
                keepSelection
              >
                <img
                  src={cropSrc}
                  alt="Pré-visualização para recorte"
                  onLoad={onCropImageLoad}
                  style={{ maxHeight: "65vh", maxWidth: "100%" }}
                />
              </ReactCrop>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
              <button
                onClick={closeCrop}
                disabled={galleryUploading}
                className="px-4 py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmCropAndUpload}
                disabled={galleryUploading || !completedCrop?.width}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {galleryUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Recortar e enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </LojistaLayout>
  );
}
