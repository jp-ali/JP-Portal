import { authenticate, getAdminProfilePhoto, updateAdminProfilePhoto } from "../services/authService.js";
import { clearSessionCookie, createSession, setSessionCookie } from "../services/session.js";

export async function login(request, response, next) {
  try {
    const { identifier, password } = request.body || {};
    if (typeof identifier !== "string" || typeof password !== "string" || !identifier.trim() || !password || identifier.length > 320 || password.length > 1024) {
      return response.status(400).json({ error: "Email or phone and password are required" });
    }
    const result = await authenticate(identifier.trim(), password);
    if (!result) return response.status(401).json({ error: "Invalid email/phone or password" });
    setSessionCookie(response, createSession(result.claims, process.env.SESSION_SECRET), result.claims.role);
    return response.json({ user: result.profile });
  } catch (error) {
    next(error);
  }
}

export function me(request, response) {
  response.json({ user: request.user });
}

export function logout(_request, response) {
  clearSessionCookie(response);
  response.status(204).end();
}

export async function readAdminPhoto(_request, response, next) {
  try { response.json({ profilePhoto: await getAdminProfilePhoto() }); }
  catch (error) { next(error); }
}

export async function saveAdminPhoto(request, response, next) {
  try { response.json({ profilePhoto: await updateAdminProfilePhoto(request.body?.photo) }); }
  catch (error) { next(error); }
}

export async function deleteAdminPhoto(_request, response, next) {
  try { response.json({ profilePhoto: await updateAdminProfilePhoto(null) }); }
  catch (error) { next(error); }
}
