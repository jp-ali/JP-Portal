import { dateForImport } from "./reportImport.js";

export const visitImportFields = [
  { key: "date", label: "Visit Date", required: true, aliases: [/^date$/i, /date.*visit|visit.*date/i, /visited\s*on/i] },
  { key: "schoolName", label: "School", required: true, aliases: [/school/i, /institute/i, /institution/i] },
  { key: "cityName", label: "City", aliases: [/city/i] },
  { key: "areaName", label: "Area", aliases: [/area/i, /location/i] },
  { key: "principalName", label: "Principal / Contact", aliases: [/principal/i, /contact\s*(person|name)/i] },
  { key: "phone", label: "Phone", aliases: [/phone/i, /mobile/i, /contact\s*(no|number)/i] },
  { key: "purpose", label: "Purpose", aliases: [/purpose/i, /reason/i] },
  { key: "session", label: "Session", aliases: [/session/i] },
  { key: "branches", label: "Branches", aliases: [/branch/i] },
  { key: "strength", label: "Strength", aliases: [/strength/i, /students/i] },
  { key: "visitTime", label: "Visit Time", aliases: [/visit\s*time/i, /^time$/i] },
  { key: "notes", label: "Notes", aliases: [/note/i, /remark/i, /comment/i] }
];

export function suggestVisitColumns(headings) {
  return Object.fromEntries(visitImportFields.map(({ key, aliases }) => [key, headings.find(({ label }) => aliases.some((alias) => alias.test(label)))?.index ?? ""]));
}

export function validVisitDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(`${date}T12:00:00+05:00`))
    && new Date(`${date}T12:00:00+05:00`).toISOString().slice(0, 10) === date;
}

export function rowsForVisitImport(preview, columns) {
  const rows = preview.rows.map((source, index) => {
    const value = (key) => columns[key] === "" || columns[key] === undefined ? "" : String(source[Number(columns[key])] ?? "").trim();
    const rawDate = value("date");
    const date = rawDate ? dateForImport(rawDate, "") : "";
    const schoolName = value("schoolName");
    return {
      sourceRow: index + preview.headingRow + 2,
      date,
      schoolName,
      cityName: value("cityName"),
      areaName: value("areaName"),
      principalName: value("principalName"),
      phone: value("phone"),
      purpose: value("purpose"),
      session: value("session"),
      branches: value("branches"),
      strength: value("strength"),
      visitTime: value("visitTime"),
      notes: value("notes"),
      error: !rawDate || !validVisitDate(date) ? "Valid visit date required" : !schoolName ? "School required" : ""
    };
  }).filter((row) => row.date || row.schoolName || row.cityName || row.areaName || row.principalName || row.phone || row.notes);
  return rows;
}
