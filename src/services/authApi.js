const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    ...options
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}

export async function login(identifier, password) {
  return (await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) })).user;
}

export async function getSession() {
  return (await request("/auth/me")).user;
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}
