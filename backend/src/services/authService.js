import { findMarketerById, findMarketerByIdentifier } from "../models/marketerModel.js";
import { portalStore } from "../config/portalStore.js";
import { verifyPassword } from "./passwordVerifier.js";

const adminPhotoRef = () => portalStore().collection("admin_profiles").doc("primary");

export async function getAdminProfilePhoto() {
  const snapshot = await adminPhotoRef().get();
  return snapshot.data()?.profilePhoto || null;
}

export async function updateAdminProfilePhoto(photo) {
  if (photo !== null && (typeof photo !== "string" || photo.length > 200000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo))) {
    const error = new Error("Invalid profile photo. Upload a JPEG image under 150 KB.");
    error.status = 400;
    throw error;
  }
  await adminPhotoRef().set({ profilePhoto: photo }, { merge: true });
  return photo;
}

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
    profilePhoto: record.profilePhoto || null,
    whatsappGroupName: record.whatsappGroupName || "",
    whatsappGroupLink: record.whatsappGroupLink || ""
  };
}

export async function authenticate(identifier, password, repository = { findMarketerByIdentifier }) {
  const email = process.env.ADMIN_EMAIL || "admin@portal.com";
  const normalizedIdentifier = identifier.trim();
  if (normalizedIdentifier.toLowerCase() === email.toLowerCase()) {
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) throw new Error("ADMIN_PASSWORD_HASH is not configured");
    if (!(await verifyPassword(password, hash))) return null;
    return { claims: { sub: "admin", role: "admin" }, profile: { email, name: process.env.ADMIN_NAME || "Muhammad Ali Ashfaq", role: "admin" } };
  }
  const marketer = await repository.findMarketerByIdentifier(normalizedIdentifier)
    || (normalizedIdentifier.includes("@") && normalizedIdentifier !== normalizedIdentifier.toLowerCase()
      ? await repository.findMarketerByIdentifier(normalizedIdentifier.toLowerCase()) : null);
  if (!marketer) return null;
  if (!marketer.passwordHash || !(await verifyPassword(password, marketer.passwordHash))) return null;
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
