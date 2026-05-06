const API_BASE = import.meta.env.VITE_API_URL || "";

export function getAdminToken(): string | null {
  return localStorage.getItem("hub_admin_token");
}

function getToken(): string | null {
  return localStorage.getItem("hub_admin_token");
}

export function setToken(token: string) {
  localStorage.setItem("hub_admin_token", token);
}

export function clearToken() {
  localStorage.removeItem("hub_admin_token");
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
