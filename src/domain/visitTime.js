export function visitTimeForDisplay(visit) {
  const recordedTime = typeof visit?.visitTime === "string" ? visit.visitTime.trim() : visit?.visitTime;
  if (recordedTime) return recordedTime;
  if (visit?.importSource === "admin") return null;
  return visit?.createdAt?.toDate ? visit.createdAt.toDate() : null;
}
