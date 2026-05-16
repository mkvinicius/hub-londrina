// API helpers para endpoints públicos (Task #35 e seguintes).
import { csrfFetch } from "./csrf";

const API_BASE = import.meta.env.VITE_API_URL || "";

export interface PublicFaq {
  id: number;
  category: "consumidor" | "lojista" | "lgpd";
  question: string;
  answer: string;
  sortOrder: number;
}

export async function fetchPublicFaqs(category?: string): Promise<PublicFaq[]> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`${API_BASE}/api/faqs${qs}`);
  if (!res.ok) throw new Error("Falha ao carregar FAQs");
  const j = await res.json();
  return j.data ?? [];
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<void> {
  const res = await csrfFetch(`${API_BASE}/api/contact-messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
}
