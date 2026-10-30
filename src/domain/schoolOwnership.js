import { entityHash, makeSchoolId } from "./catalog.js";

export const normalizeSchoolOwner = (email) => String(email || "").trim().toLowerCase();

export function canSeeSchool(school, user) {
  if (!school || school.source !== "manual-marketer" || user?.role === "admin") return true;
  return Boolean(normalizeSchoolOwner(user?.email)
    && normalizeSchoolOwner(school.addedByMarketerEmail) === normalizeSchoolOwner(user.email));
}

export function makeMarketerSchoolId(areaId, name, email) {
  return `${makeSchoolId(areaId, name)}__owner-${entityHash(normalizeSchoolOwner(email))}`;
}
