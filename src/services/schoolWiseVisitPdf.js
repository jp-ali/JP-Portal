const value = (item) => String(item?.str || "").trim();
const x = (item) => item.transform[4];
const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function usDate(raw) {
  const match = raw.match(datePattern);
  if (!match) return raw;
  const [, month, day, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year) && parsed.getUTCMonth() + 1 === Number(month) && parsed.getUTCDate() === Number(day)
    ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    : raw;
}

function append(current, addition) {
  return [current, addition].filter(Boolean).join(" ").trim();
}

export function schoolWiseVisitPdfMatrix(pages) {
  const heading = pages.flat().some((line) => {
    const labels = line.map(value);
    return labels.includes("Date") && labels.includes("Sub#") && labels.includes("Visit Type")
      && labels.includes("Contact Person") && labels.includes("Phone No.") && labels.includes("Strength");
  });
  if (!heading) return null;

  const records = [];
  let schoolName = "";
  let areaName = "";
  let expectingArea = false;
  let current = null;
  for (const page of pages) for (const line of page) {
    const items = line.filter((item) => value(item));
    const first = value(items[0]);
    if (!first || /^Page \d+ of \d+$/i.test(first)) continue;

    if (/^\d{1,4}$/.test(first) && x(items[0]) < 65 && items.some((item) => x(item) >= 180)) {
      schoolName = items.filter((item) => x(item) >= 180).map(value).join(" ").trim();
      areaName = "";
      expectingArea = true;
      current = null;
      continue;
    }
    if (expectingArea) {
      areaName = items.filter((item) => x(item) >= 180 && x(item) < 410).map(value).join(" ").trim();
      expectingArea = false;
      if (areaName) continue;
    }
    if (datePattern.test(first) && x(items[0]) < 80) {
      if (!schoolName) continue;
      current = { date: usDate(first), schoolName, areaName, contact: "", phone: "", strength: "", visitType: "", activityType: "", notes: "" };
      for (const item of items.slice(1)) {
        const position = x(item);
        if (position >= 405) current.notes = append(current.notes, value(item));
        else if (position >= 360) current.strength = append(current.strength, value(item));
        else if (position >= 295) current.phone = append(current.phone, value(item));
        else if (position >= 215) current.contact = append(current.contact, value(item));
        else if (position >= 160) current.activityType = append(current.activityType, value(item));
        else if (position >= 110) current.visitType = append(current.visitType, value(item));
      }
      records.push(current);
      continue;
    }
    if (!current || first.startsWith("Marketer:") || first === "School Wise Visit Summary") continue;
    for (const item of items) {
      const position = x(item);
      if (position >= 405) current.notes = append(current.notes, value(item));
      else if (position >= 215 && position < 295) current.contact = append(current.contact, value(item));
      else if (position >= 110 && position < 160) current.visitType = append(current.visitType, value(item));
    }
  }
  if (!records.length) return null;
  return [
    ["Visit Date", "School Name", "Area", "Principal / Contact", "Phone", "Purpose", "Strength", "Notes"],
    ...records.map((record) => [
      record.date, record.schoolName.slice(0, 200), record.areaName.slice(0, 200),
      record.contact.slice(0, 200), record.phone.slice(0, 200),
      [record.visitType, record.activityType].filter(Boolean).join(" / ").slice(0, 200),
      record.strength.slice(0, 200), record.notes.slice(0, 2000)
    ])
  ];
}
