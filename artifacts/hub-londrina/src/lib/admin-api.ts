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

// B4 — Tickets de suporte (admin)
export interface AdminSupportTicket {
  id: number;
  businessId: number;
  businessName: string | null;
  ownerEmail: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export async function listSupportTickets(params: { status?: string; priority?: string } = {}): Promise<{ data: AdminSupportTicket[] }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);
  return adminFetch(`/api/admin/support${qs.toString() ? `?${qs.toString()}` : ""}`);
}
export async function updateSupportTicket(
  id: number,
  patch: { adminResponse?: string; status?: string; priority?: string },
): Promise<{ data: AdminSupportTicket }> {
  return adminFetch(`/api/admin/support/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
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

// ===== R11 — Vitrine de Produtos (admin) =====
export interface AdminVitrinePending {
  id: number;
  name: string;
  videoUrl: string | null;
  videoStatus: string;
  videoRejectionReason: string | null;
  businessId: number;
  businessName: string | null;
}
export interface AdminVitrineBoost {
  id: number;
  businessId: number;
  productId: number | null;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  businessName: string | null;
  productName: string | null;
}
export async function getAdminVitrinePending(): Promise<{ data: AdminVitrinePending[] }> {
  return adminFetch("/api/admin/vitrine/pending");
}
export async function getAdminVitrineBoosts(): Promise<{ data: AdminVitrineBoost[] }> {
  return adminFetch("/api/admin/vitrine/boosts");
}
export async function approveVitrineVideo(productId: number) {
  return adminFetch(`/api/admin/products/${productId}/video/approve`, { method: "POST" });
}
export async function rejectVitrineVideo(productId: number, reason: string) {
  return adminFetch(`/api/admin/products/${productId}/video/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ===== Task #31 — Patrocinadores e Apoiadores =====
export interface AdminPartner {
  id: number;
  name: string;
  tier: "master" | "apoiador";
  logoUrl: string;
  businessId: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  businessName: string | null;
}

export async function listAdminPartners(): Promise<{ data: AdminPartner[] }> {
  return adminFetch("/api/admin/partners");
}

export async function createAdminPartner(input: {
  name: string;
  tier: "master" | "apoiador";
  logoUrl: string;
  businessId?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<{ data: AdminPartner }> {
  return adminFetch("/api/admin/partners", { method: "POST", body: JSON.stringify(input) });
}

export async function updateAdminPartner(
  id: number,
  patch: Partial<{
    name: string;
    tier: "master" | "apoiador";
    logoUrl: string;
    businessId: number | null;
    isActive: boolean;
    sortOrder: number;
  }>,
): Promise<{ data: AdminPartner }> {
  return adminFetch(`/api/admin/partners/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteAdminPartner(id: number): Promise<{ success: true }> {
  return adminFetch(`/api/admin/partners/${id}`, { method: "DELETE" });
}

export async function uploadPartnerLogo(file: File): Promise<{ logoUrl: string }> {
  const token = getAdminToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/upload/partner-logo`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

// ===== Task #35 — Contato (mensagens) =====
export interface AdminContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  adminNotes: string | null;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminContactMessagesList {
  data: AdminContactMessage[];
  total: number;
  page: number;
  limit: number;
  newCount: number;
  grandTotal: number;
}

export async function listContactMessages(
  params: { status?: string; page?: number; limit?: number } = {},
): Promise<AdminContactMessagesList> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  return adminFetch(`/api/admin/contact-messages${qs.toString() ? `?${qs}` : ""}`);
}

export async function updateContactMessage(
  id: number,
  patch: { status?: string; adminNotes?: string },
): Promise<{ data: AdminContactMessage }> {
  const { csrfFetch } = await import("./csrf");
  const token = getAdminToken();
  const res = await csrfFetch(`${API_BASE}/api/admin/contact-messages/${id}`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export async function deleteContactMessage(id: number): Promise<{ success: true }> {
  const { csrfFetch } = await import("./csrf");
  const token = getAdminToken();
  const res = await csrfFetch(`${API_BASE}/api/admin/contact-messages/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

// ===== Task #35 — FAQs =====
export interface AdminFaq {
  id: number;
  category: "consumidor" | "lojista" | "lgpd";
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function listAdminFaqs(): Promise<{ data: AdminFaq[] }> {
  return adminFetch("/api/admin/faqs");
}

export async function createAdminFaq(input: {
  category: "consumidor" | "lojista" | "lgpd";
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ data: AdminFaq }> {
  const { csrfFetch } = await import("./csrf");
  const token = getAdminToken();
  const res = await csrfFetch(`${API_BASE}/api/admin/faqs`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export async function updateAdminFaq(
  id: number,
  patch: Partial<{
    category: "consumidor" | "lojista" | "lgpd";
    question: string;
    answer: string;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<{ data: AdminFaq }> {
  const { csrfFetch } = await import("./csrf");
  const token = getAdminToken();
  const res = await csrfFetch(`${API_BASE}/api/admin/faqs/${id}`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}

export async function deleteAdminFaq(id: number): Promise<{ success: true }> {
  const { csrfFetch } = await import("./csrf");
  const token = getAdminToken();
  const res = await csrfFetch(`${API_BASE}/api/admin/faqs/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json();
}
