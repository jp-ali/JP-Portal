import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { postgresPool } from "../config/postgres.js";

const cookieName = "school_visit_session";
const lifetimeSeconds = 12 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return value;
}

export async function createJwtSession(claims, db = postgresPool()) {
  if (!["admin", "marketer"].includes(claims.role) || typeof claims.sub !== "string" || !claims.sub) {
    throw new Error("Invalid account claims");
  }
  const tokenId = randomUUID();
  const token = jwt.sign({ role: claims.role }, secret(), {
    algorithm: "HS256",
    subject: claims.sub,
    jwtid: tokenId,
    issuer: "school-visit-portal",
    audience: "school-visit-portal",
    expiresIn: lifetimeSeconds
  });
  await db.query(
    "INSERT INTO portal_sessions(token_id, account_id, role, expires_at) VALUES ($1, $2, $3, now() + interval '12 hours')",
    [tokenId, claims.sub, claims.role]
  );
  return token;
}

export async function verifyJwtSession(token, db = postgresPool()) {
  if (!token) return null;
  let claims;
  try {
    claims = jwt.verify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "school-visit-portal",
      audience: "school-visit-portal"
    });
  } catch { return null; }
  if (!["admin", "marketer"].includes(claims.role) || !claims.sub || !claims.jti) return null;
  const { rows } = await db.query(
    "SELECT 1 FROM portal_sessions WHERE token_id = $1 AND account_id = $2 AND role = $3 AND revoked_at IS NULL AND expires_at > now()",
    [claims.jti, claims.sub, claims.role]
  );
  return rows.length ? { sub: claims.sub, role: claims.role, jti: claims.jti } : null;
}

export async function revokeJwtSession(token, db = postgresPool()) {
  if (!token) return;
  try {
    const claims = jwt.verify(token, secret(), {
      algorithms: ["HS256"], issuer: "school-visit-portal", audience: "school-visit-portal"
    });
    if (claims.jti) await db.query("UPDATE portal_sessions SET revoked_at = now() WHERE token_id = $1", [claims.jti]);
  } catch { /* Already invalid or expired. */ }
}

export function readSessionCookie(request) {
  const entry = (request.headers.cookie || "").split(";").find((part) => part.trim().startsWith(`${cookieName}=`));
  return entry ? entry.trim().slice(cookieName.length + 1) : "";
}

export function setSessionCookie(response, token) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api",
    maxAge: lifetimeSeconds * 1000
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(cookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api"
  });
}
