import { useCallback, useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, RotateCcw, RotateCw, ZoomIn, ImagePlus, Check, RefreshCcw } from "lucide-react";

const TO_RADIANS = Math.PI / 180;

/**
 * Motor de edição de imagem reutilizável (recorte interativo + zoom + rotação).
 * Usado em TODA tela que sobe imagem (admin e lojista). A saída é sempre um
 * Blob JPEG já recortado/rotacionado no aspect pedido — o backend (Sharp) só
 * faz o redimensionamento final para a dimensão canônica de cada superfície.
 */

function buildCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
  scale: number,
  rotate: number,
  mime = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const rotateRads = rotate * TO_RADIANS;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image,
    0, 0, image.naturalWidth, image.naturalHeight,
    0, 0, image.naturalWidth, image.naturalHeight,
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Falha ao gerar a imagem"))), mime, quality);
  });
}

export interface ImageEditorDialogProps {
  /** dataURL da imagem a editar (null = fechado). */
  src: string | null;
  /** proporção do recorte (ex.: 3/1, 1, 4/3, 1200/280). undefined = recorte livre (logos). */
  aspect?: number;
  title?: string;
  /** texto de ajuda (ex.: "Dimensão recomendada 1200×400px"). */
  hint?: string;
  /** estado de envio controlado externamente. */
  uploading?: boolean;
  confirmLabel?: string;
  /** mime de saída. JPEG (padrão) p/ fotos; PNG p/ logos (preserva transparência). */
  outputType?: "image/jpeg" | "image/png";
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

export function ImageEditorDialog({
  src,
  aspect,
  title = "Ajustar imagem",
  hint,
  uploading = false,
  confirmLabel = "Salvar imagem",
  outputType = "image/jpeg",
  onCancel,
  onConfirm,
}: ImageEditorDialogProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const resetTransforms = useCallback(() => {
    setScale(1);
    setRotate(0);
  }, []);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    imgRef.current = e.currentTarget;
    setScale(1);
    setRotate(0);
    const initial = aspect
      ? centerCrop(
          makeAspectCrop({ unit: "%", width: 90 }, aspect, naturalWidth, naturalHeight),
          naturalWidth,
          naturalHeight,
        )
      : centerCrop({ unit: "%", width: 90, height: 90, x: 0, y: 0 }, naturalWidth, naturalHeight);
    setCrop(initial);
    setCompletedCrop(null);
  }

  async function handleConfirm() {
    const img = imgRef.current;
    const c = completedCrop;
    if (!img || !c || !c.width || !c.height) {
      setError("Selecione uma área para recortar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const blob = await buildCroppedBlob(img, c, scale, rotate, outputType);
      await onConfirm(blob);
    } catch (err: any) {
      setError(err?.message || "Erro ao processar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  if (!src) return null;
  const working = busy || uploading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button
            onClick={onCancel}
            disabled={working}
            className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-auto">
          {hint && <p className="text-xs text-gray-500 mb-3">{hint}</p>}
          <div className="flex justify-center bg-gray-900/5 rounded-xl p-2">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={c => setCompletedCrop(c)}
              aspect={aspect}
              keepSelection
              className="max-h-[50vh]"
            >
              <img
                src={src}
                alt="Imagem para ajuste"
                onLoad={onImageLoad}
                style={{ transform: `scale(${scale}) rotate(${rotate}deg)`, maxHeight: "50vh" }}
              />
            </ReactCrop>
          </div>

          {/* Controles avançados: zoom + rotação */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <ZoomIn className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-600 w-14 flex-shrink-0">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={scale}
                onChange={e => setScale(Number(e.target.value))}
                className="flex-1 accent-[#d97706]"
              />
              <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{scale.toFixed(1)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <RotateCw className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-600 w-14 flex-shrink-0">Girar</span>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotate}
                onChange={e => setRotate(Number(e.target.value))}
                className="flex-1 accent-[#d97706]"
              />
              <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{rotate}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRotate(r => (r - 90 < -180 ? r - 90 + 360 : r - 90))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 90°
              </button>
              <button
                onClick={() => setRotate(r => (r + 90 > 180 ? r + 90 - 360 : r + 90))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <RotateCw className="w-3.5 h-3.5" /> 90°
              </button>
              <button
                onClick={resetTransforms}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <RefreshCcw className="w-3.5 h-3.5" /> Resetar
              </button>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={working}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={working || !completedCrop?.width}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {working ? "Enviando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ImageUploadButtonProps {
  /** proporção do recorte. undefined = recorte livre (logos). */
  aspect?: number;
  /** chamado com o Blob já recortado; deve fazer o upload e atualizar o estado. */
  onUpload: (blob: Blob) => void | Promise<void>;
  label?: string;
  title?: string;
  hint?: string;
  confirmLabel?: string;
  className?: string;
  disabled?: boolean;
  /** mime de saída. JPEG (padrão) p/ fotos; PNG p/ logos (preserva transparência). */
  outputType?: "image/jpeg" | "image/png";
  /** aceita também SVG/PNG sem perda? Padrão: imagens comuns. */
  accept?: string;
}

/**
 * Botão completo: escolhe arquivo → abre o editor avançado → recorta → faz upload.
 * Encapsula todo o ciclo para que cada tela use 1 linha.
 */
export function ImageUploadButton({
  aspect,
  onUpload,
  label = "Enviar imagem",
  title = "Ajustar imagem",
  hint,
  confirmLabel = "Salvar imagem",
  className,
  disabled = false,
  outputType = "image/jpeg",
  accept = "image/png,image/jpeg,image/webp",
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function handleConfirm(blob: Blob) {
    setUploading(true);
    try {
      await onUpload(blob);
      setSrc(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onPick} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={
          className ||
          "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#d97706] hover:bg-[#b45309] rounded-xl disabled:opacity-50 shadow-sm"
        }
      >
        <ImagePlus className="w-4 h-4" />
        {label}
      </button>
      <ImageEditorDialog
        src={src}
        aspect={aspect}
        title={title}
        hint={hint}
        confirmLabel={confirmLabel}
        uploading={uploading}
        outputType={outputType}
        onCancel={() => setSrc(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
