const API_BASE = import.meta.env.VITE_API_URL || "";

const LOJISTA_STORAGE_KEYS = {
  token: "hub_lojista_token",
} as const;

export function getLojistaToken(): string | null {
  return localStorage.getItem(LOJISTA_STORAGE_KEYS.token);
}

function getToken(): string | null {
  return localStorage.getItem(LOJISTA_STORAGE_KEYS.token);
}

export function setToken(token: string) {
  localStorage.setItem(LOJISTA_STORAGE_KEYS.token, token);
}

export function clearToken() {
  (Object.values(LOJISTA_STORAGE_KEYS) as string[]).forEach(key => localStorage.removeItem(key));
}

// Sprint 4.6 — captura ?impersonate=<token> da URL e aplica o token de lojista,
// limpando o query param. Executa uma única vez no carregamento do módulo.
(function consumeImpersonateToken() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("impersonate");
    if (token) {
      setToken(token);
      url.searchParams.delete("impersonate");
      const newUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash;
      window.history.replaceState({}, "", newUrl);
    }
  } catch {
    // noop
  }
})();

export function isLojistaAuthenticated(): boolean {
  return !!getToken();
}

export async function lojistaFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  if (res.status === 401) {
    clearToken();
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    window.location.href = `${base}/lojista/login`;
    throw new Error("Não autorizado");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export async function registerLojista(data: {
  businessName: string;
  ownerName: string;
  email: string;
  password: string;
  categorySlug: string;
  zone: string;
}) {
  const res = await fetch(`${API_BASE}/api/lojista/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Erro ao criar conta");
  }
  const result = await res.json();
  setToken(result.token);
  return result;
}

export async function lojistaLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/lojista/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Erro no login");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

export async function getProfile() {
  return lojistaFetch("/lojista/profile");
}

export async function updateProfile(data: Record<string, unknown>) {
  return lojistaFetch("/lojista/profile", { method: "PATCH", body: JSON.stringify(data) });
}

export async function uploadLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return lojistaFetch("/lojista/upload/logo", { method: "POST", body: formData });
}

export async function uploadBanner(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return lojistaFetch("/lojista/upload/banner", { method: "POST", body: formData });
}

export async function uploadPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return lojistaFetch("/lojista/upload/photo", { method: "POST", body: formData });
}

export async function deletePhoto(index: number) {
  return lojistaFetch(`/lojista/photos/${index}`, { method: "DELETE" });
}

export async function lookupCep(cep: string) {
  return lojistaFetch(`/lojista/cep/${cep}`);
}

export async function updateLocation(data: { cep?: string; street: string; number: string; neighborhood: string }) {
  return lojistaFetch("/lojista/location", { method: "PATCH", body: JSON.stringify(data) });
}

export async function getProducts() {
  return lojistaFetch("/lojista/products");
}

export async function createProduct(data: Record<string, unknown>) {
  return lojistaFetch("/lojista/products", { method: "POST", body: JSON.stringify(data) });
}

export async function updateProduct(id: number, data: Record<string, unknown>) {
  return lojistaFetch(`/lojista/products/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteProduct(id: number) {
  return lojistaFetch(`/lojista/products/${id}`, { method: "DELETE" });
}

export async function reorderProducts(items: Array<{ id: number; sortOrder: number }>) {
  return lojistaFetch("/lojista/products/reorder", { method: "PATCH", body: JSON.stringify(items) });
}

export async function getMetrics() {
  return lojistaFetch("/lojista/metrics");
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return lojistaFetch("/lojista/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// Sprint 4.3 — exclusão de conta (LGPD)
export async function deleteAccount(password: string): Promise<{ success: boolean; message: string }> {
  return lojistaFetch("/lojista/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}

export async function getStripeConfig() {
  const res = await fetch(`${API_BASE}/api/stripe/config`);
  return res.json();
}

export async function createCheckoutSession(priceId: string): Promise<{ url: string }> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ priceId }),
  });
  if (res.status === 401) {
    clearToken();
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    window.location.href = `${base}/lojista/login`;
    throw new Error("Não autorizado");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    const err: any = new Error(body.error || `Erro ${res.status}`);
    err.code = body.code;
    err.redirectToPortal = body.redirectToPortal === true;
    throw err;
  }
  return res.json();
}

export async function createPortalSession(): Promise<{ url: string }> {
  return lojistaFetch("/stripe/portal", { method: "POST" });
}

export async function getSubscription() {
  return lojistaFetch("/stripe/subscription");
}

export async function getSubscriptions() {
  return lojistaFetch("/lojista/subscriptions");
}

export async function getCategoryBoostPositions() {
  return lojistaFetch("/lojista/boosts/category-positions");
}

export async function createCategoryBoostCheckout(position: number): Promise<{ url: string }> {
  return lojistaFetch("/lojista/boosts/category-checkout", {
    method: "POST",
    body: JSON.stringify({ position }),
  });
}

// B3 — Histórico de faturas Stripe
export interface StripeInvoice {
  id: string;
  number: string | null;
  created: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: number;
  periodEnd: number;
}
export async function getInvoices(): Promise<{ data: StripeInvoice[] }> {
  return lojistaFetch("/stripe/invoices");
}

// B4 — Tickets de suporte (lojista)
export interface SupportTicket {
  id: number;
  businessId: number;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export async function getSupportTickets(): Promise<{ data: SupportTicket[] }> {
  return lojistaFetch("/lojista/support");
}
export async function createSupportTicket(input: {
  subject: string;
  message: string;
  priority?: string;
}): Promise<{ data: SupportTicket }> {
  return lojistaFetch("/lojista/support", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
