const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      ...options
    });
  } catch {
    throw new Error("Cannot reach the login service. Check your connection and the website address.");
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.error) throw new Error(body.error);
    if (response.status === 404) {
      throw new Error("Login service not found (404). This website address has no /api login route. Check the app URL and API server.");
    }
    throw new Error(`Login service error (${response.status}). Check the website address and try again.`);
  }
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
