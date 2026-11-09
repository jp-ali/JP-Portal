export function canSeeSchool(data, user) {
  if (user.role === "admin") return true;
  if (data?.source === "manual-trainer") return user.role === "trainer" && data.addedByTrainerId === user.trainerId;
  if (data?.source !== "manual-marketer") return true;
  const owner = String(data.addedByMarketerEmail || "").trim().toLowerCase();
  return Boolean(owner && owner === String(user.email || "").trim().toLowerCase());
}
