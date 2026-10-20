import { readSessionCookie, setSessionCookie, verifySession } from "../services/session.js";
import { profileFromClaims } from "../services/authService.js";

export async function requireAuth(request, response, next) {
  try {
    const token = readSessionCookie(request);
    const claims = verifySession(token, process.env.SESSION_SECRET);
    if (!claims) return response.status(401).json({ error: "Authentication required" });
    const profile = await profileFromClaims(claims);
    if (!profile) return response.status(401).json({ error: "Account is no longer active" });
    request.user = profile;
    if (claims.role === "admin") setSessionCookie(response, token, "admin");
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") return response.status(403).json({ error: "Admin access required" });
  next();
}
