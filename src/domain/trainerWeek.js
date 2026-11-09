export function weekDates(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) return [];
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.toISOString().slice(0, 10) !== from || end.toISOString().slice(0, 10) !== to) return [];
  if (start.getUTCDay() !== 1 || end.getUTCDay() === 0 || end.getTime() < start.getTime() || end.getTime() - start.getTime() > 5 * 86400000) return [];
  const dates = [];
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) dates.push(day.toISOString().slice(0, 10));
  return dates;
}

export const weekDay = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-PK", { weekday: "long", timeZone: "UTC" });
