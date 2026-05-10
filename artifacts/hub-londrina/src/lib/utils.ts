import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Resolve URLs de mídia armazenadas no backend.
// Uploads são salvos como `/storage/objects/...` (relativo ao API server).
// URLs absolutas (http/https) são devolvidas como vieram.
const _API_BASE = (import.meta as any).env?.VITE_API_URL || "";
export function imgSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return `${_API_BASE}/api${url}`;
  return url;
}
