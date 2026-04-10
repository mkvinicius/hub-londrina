const API_BASE = import.meta.env.VITE_API_URL || "";

let cachedToken: string | null = null;
let tokenExpiry = 0;

export async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const res = await fetch(`${API_BASE}/api/auth/csrf-token`, { credentials: "include" });
  const { csrfToken } = await res.json();
  cachedToken = csrfToken;
  tokenExpiry = now + 55 * 60 * 1000;
  return csrfToken;
}

export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const csrfToken = await getCsrfToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      "X-CSRF-Token": csrfToken,
    },
    credentials: "include",
  });
}
