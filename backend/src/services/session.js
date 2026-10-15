import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "school_visit_session";
const SESSION_SECONDS = 8 * 60 * 60;

function signature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSession(claims, secret, now = Date.now()) {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  const value = Buffer.from(JSON.stringify({ ...claims, exp: now + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${value}.${signature(value, secret)}`;
}

export function verifySession(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const [value, mac, extra] = token.split(".");
  if (!value || !mac || extra) return null;
  const expected = Buffer.from(signature(value, secret));
  const received = Buffer.from(mac);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const claims = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!Number.isFinite(claims.exp) || claims.exp <= now) return null;
    if (claims.role === "admin" && claims.sub === "admin") return claims;
    if (claims.role === "marketer" && typeof claims.sub === "string" && claims.sub.length) return claims;
  } catch (_) {}
  return null;
}

export function readSessionCookie(request) {
  const cookies = (request.headers.cookie || "").split(";");
  const item = cookies.find((part) => part.trim().startsWith(`${COOKIE_NAME}=`));
  return item ? item.trim().slice(COOKIE_NAME.length + 1) : "";
}

export function setSessionCookie(response, token) {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: SESSION_SECONDS * 1000
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api"
  });
}
