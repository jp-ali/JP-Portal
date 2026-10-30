export function canSeeSchool(data, user) {
  if (user.role === "admin" || data?.source !== "manual-marketer") return true;
  const owner = String(data.addedByMarketerEmail || "").trim().toLowerCase();
  return Boolean(owner && owner === String(user.email || "").trim().toLowerCase());
}
