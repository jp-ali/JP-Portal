const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Login service timed out. Check the connection and try again.");
    }
    throw new Error("Cannot reach the login service. Check your connection and the website address.");
  } finally {
    clearTimeout(timeout);
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (body?.error) throw new Error(body.error);
    if (response.status === 404) {
      throw new Error("Login service not found (404). This website address has no /api login route. Check the app URL and API server.");
    }
    throw new Error(`Login service error (${response.status}). Check the website address and try again.`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("Login service returned an invalid response. Check the app URL and try again.");
  }
  return body;
}

export async function login(identifier, password) {
  const user = (await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) })).user;
  if (!user || !["admin", "marketer"].includes(user.role)) {
    throw new Error("Login service did not return an account. Check the app URL and try again.");
  }
  return user;
}

export async function getSession() {
  return (await request("/auth/me")).user;
}

export async function logout() {
  return request("/auth/logout", { method: "POST" });
}
