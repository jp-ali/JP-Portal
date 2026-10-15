import bcrypt from "bcryptjs";
import { findMarketerById, findMarketerByIdentifier, migrateLegacyPassword } from "../models/marketerModel.js";

export function marketerProfile(record) {
  return {
    email: record.email,
    name: record.name || record.email?.split("@")[0] || "Marketer",
    role: "marketer",
    marketerId: record.id,
    assignedCityIds: Array.isArray(record.assignedCityIds) ? record.assignedCityIds : [],
    assignedAreaIds: Array.isArray(record.assignedAreaIds) ? record.assignedAreaIds : [],
    assignedSchoolIds: Array.isArray(record.assignedSchoolIds) ? record.assignedSchoolIds : [],
    subordinateMarketerIds: Array.isArray(record.subordinateMarketerIds) ? record.subordinateMarketerIds.filter(Boolean) : [],
    designation: record.designation || "Regional Manager",
    assignedKms: Number(record.assignedKms || 0),
    whatsappGroupName: record.whatsappGroupName || "",
    whatsappGroupLink: record.whatsappGroupLink || ""
  };
}

export async function authenticate(identifier, password, repository = { findMarketerByIdentifier, migrateLegacyPassword }) {
  const email = process.env.ADMIN_EMAIL || "admin@portal.com";
  if (identifier === email) {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) throw new Error("ADMIN_PASSWORD_HASH is not configured");
    if (!(await bcrypt.compare(password, hash))) return null;
    return { claims: { sub: "admin", role: "admin" }, profile: { email, name: process.env.ADMIN_NAME || "Muhammad Ali Ashfaq", role: "admin" } };
  }
  const marketer = await repository.findMarketerByIdentifier(identifier);
  if (!marketer) return null;
  let valid = false;
  if (marketer.passwordHash) valid = await bcrypt.compare(password, marketer.passwordHash);
  else if (typeof marketer.password === "string") valid = marketer.password === password;
  if (!valid) return null;
  if (!marketer.passwordHash && process.env.ENABLE_LEGACY_PASSWORD_MIGRATION === "true") {
    await repository.migrateLegacyPassword(marketer.id, await bcrypt.hash(password, 12));
  }
  return { claims: { sub: marketer.id, role: "marketer" }, profile: marketerProfile(marketer) };
}

export async function profileFromClaims(claims) {
  if (claims.role === "admin") {
    if (claims.sub !== "admin") return null;
    return { email: process.env.ADMIN_EMAIL || "admin@portal.com", name: process.env.ADMIN_NAME || "Muhammad Ali Ashfaq", role: "admin" };
  }
  const marketer = await findMarketerById(claims.sub);
  return marketer ? marketerProfile(marketer) : null;
}
