export function creditedAttendanceDays(days, month, todayKey, holidays = []) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return 0;
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const currentMonth = String(todayKey || "").slice(0, 7);
  const cutoff = month < currentMonth ? lastDay : month === currentMonth ? Math.min(lastDay, Number(String(todayKey).slice(8, 10)) || 0) : 0;
  const credited = new Set();
  const leaveDates = new Set((days || []).filter((row) => row?.status === "leave").map((row) => row.date));
  const holidayDates = new Set(holidays.map((row) => typeof row === "string" ? row : row?.date));
  for (let day = 1; day <= cutoff; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    if ((new Date(year, monthNumber - 1, day).getDay() === 0 || holidayDates.has(date)) && !leaveDates.has(date)) credited.add(date);
  }
  for (const row of days || []) {
    if (typeof row?.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !row.date.startsWith(`${month}-`) || Number(row.date.slice(8)) < 1 || row.date > `${month}-${String(cutoff).padStart(2, "0")}`) continue;
    if (leaveDates.has(row.date)) continue;
    if (row.startMarked || row.status === "started" || row.status === "completed") credited.add(row.date);
  }
  return credited.size;
}
