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

// Mapeamento de slug de categoria → rótulo legível para exibição ao usuário.
// Nunca exibir o slug cru nos cards ou badges — sempre usar esta função.
const CATEGORY_LABELS: Record<string, string> = {
  "pet-shops": "Pet Shops",
  "saloes": "Salões",
  "saude": "Saúde",
  "restaurantes": "Restaurantes",
  "mercados": "Mercados",
  "academias": "Academias",
  "cafeterias": "Cafeterias",
  "farmacias": "Farmácias",
  "servicos": "Serviços",
  "padarias": "Padarias",
  "clinicas": "Clínicas",
  "oficinas": "Oficinas",
  "eletronicos": "Eletrônicos",
  "moda": "Moda",
  "beleza": "Beleza",
};

export function formatCategorySlug(slug: string): string {
  if (!slug) return "";
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  // Fallback genérico: remove hífens e capitaliza cada palavra
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
