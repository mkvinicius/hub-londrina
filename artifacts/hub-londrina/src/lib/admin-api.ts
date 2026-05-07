const API_BASE = import.meta.env.VITE_API_URL || "";

const ADMIN_STORAGE_KEYS = {
  token: "hub_admin_token",
} as const;

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_STORAGE_KEYS.token);
}

function getToken(): string | null {
  return localStorage.getItem(ADMIN_STORAGE_KEYS.token);
}

export function setToken(token: string) {
  localStorage.setItem(ADMIN_STORAGE_KEYS.token, token);
}

export function clearToken() {
  (Object.values(ADMIN_STORAGE_KEYS) as string[]).forEach(key => localStorage.removeItem(key));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
    window.location.href = `${base}/admin/login`;
    throw new Error("Não autorizado");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export async function login(password: string) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Erro no login");
  }
  const { token } = await res.json();
  setToken(token);
  return token;
}

export async function getStats() {
  return adminFetch("/api/admin/stats");
}

export async function getBusinesses(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return adminFetch(`/api/admin/businesses${qs ? `?${qs}` : ""}`);
}

export async function updateBusiness(id: number, data: Record<string, unknown>) {
  return adminFetch(`/api/admin/businesses/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteBusiness(id: number) {
  return adminFetch(`/api/admin/businesses/${id}`, { method: "DELETE" });
}

export async function getCategories() {
  return adminFetch("/api/admin/categories");
}

export async function createCategory(data: { name: string; slug: string; icon?: string; color?: string }) {
  return adminFetch("/api/admin/categories", { method: "POST", body: JSON.stringify(data) });
}

export async function updateCategory(id: number, data: Record<string, unknown>) {
  return adminFetch(`/api/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteCategory(id: number) {
  return adminFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
}

// Sprint 4.2 — Audit Log
export interface AdminAction {
  id: number;
  adminId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export async function getAuditLog(params: { targetType?: string; adminId?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.targetType) qs.set("targetType", params.targetType);
  if (params.adminId !== undefined) qs.set("adminId", String(params.adminId));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  return adminFetch(`/api/admin/audit-log${suffix}`) as Promise<{ data: AdminAction[]; count: number }>;
}

// Sprint 4.4 — Reviews moderation
export interface AdminReview {
  id: number;
  businessId: number;
  businessName: string | null;
  author: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  verified: boolean;
  ownerResponse: string | null;
}

export async function getAdminReviews(params: { businessId?: number; rating?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.businessId !== undefined) qs.set("businessId", String(params.businessId));
  if (params.rating !== undefined) qs.set("rating", String(params.rating));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : "";
  return adminFetch(`/api/admin/reviews${suffix}`) as Promise<{ data: AdminReview[]; count: number }>;
}

export async function deleteAdminReview(id: number) {
  return adminFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
}

// Sprint 4.6 — Impersonate lojista
export async function impersonateLojista(businessId: number): Promise<{ token: string; businessId: number; email: string; expiresIn: number }> {
  return adminFetch(`/api/admin/impersonate/${businessId}`, { method: "POST" });
}
