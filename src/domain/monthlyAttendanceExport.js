const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function buildMonthlyAttendanceReport(month, marketers, holidays = [], today = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(year, monthNumber, 0).getDate();
  const todayKey = dateKey(today);
  const holidayNames = new Map(holidays.map((row) => [row.date, row.name || "Gazetted holiday"]));
  const people = marketers.map((marketer) => {
    const byDate = new Map((marketer.days || []).filter((row) => row?.date?.startsWith(`${month}-`)).map((row) => [row.date, row]));
    const totals = { present: 0, absent: 0, leave: 0, sunday: 0, gazetted: 0, counted: 0, elapsed: 0 };
    const days = Array.from({ length: count }, (_, index) => {
      const day = index + 1;
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const weekday = new Date(year, monthNumber - 1, day).getDay();
      const row = byDate.get(date);
      const holiday = holidayNames.get(date) || "";
      let status = "future";
      if (date <= todayKey) {
        totals.elapsed += 1;
        if (row?.status === "leave") status = "leave";
        else if (row?.startMarked || row?.status === "present" || row?.status === "started" || row?.status === "completed") status = "present";
        else if (weekday === 0) status = "sunday";
        else if (holiday) status = "gazetted";
        else status = "absent";
        totals[status] += 1;
        if (["present", "sunday", "gazetted"].includes(status)) totals.counted += 1;
      }
      return { day, date, weekday, status, holiday, time: row?.startTime || row?.leaveTime || "" };
    });
    return { id: marketer.id || "", name: marketer.name || marketer.email || "Marketer", designation: marketer.designation || "", days, totals };
  });
  return { month, monthLabel: new Date(year, monthNumber - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }), holidays, people, dayCount: count };
}
