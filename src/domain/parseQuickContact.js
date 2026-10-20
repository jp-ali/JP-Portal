const labels = [
  [/^(?:name|contact(?: person)?)\s*[:\-]\s*(.+)$/i, "name"],
  [/^(?:city|location)\s*[:\-]\s*(.+)$/i, "city"],
  [/^(?:company(?: name)?|institute|institution|school(?: name)?)\s*[:\-]\s*(.+)$/i, "institute"],
  [/^(?:whats\s*app(?: number)?|whatsapp(?: number)?|phone(?: number)?|mobile(?: number)?|contact number|number)\s*[:\-]\s*(.+)$/i, "number"],
  [/^(?:remarks?|notes?)\s*[:\-]\s*(.+)$/i, "remarks"]
];

export function parseQuickContact(raw) {
  const row = { name: "", number: "", city: "", institute: "", remarks: "" };
  for (const line of String(raw || "").split(/\r?\n|;/).map((value) => value.trim()).filter(Boolean)) {
    const labeled = labels.find(([pattern]) => pattern.test(line));
    if (labeled) {
      row[labeled[1]] = line.match(labeled[0])[1].trim();
    } else if (!row.name && !/^\+?[\d\s().-]{7,}$/.test(line)) {
      row.name = line;
    } else if (!row.number && /^\+?[\d\s().-]{7,}$/.test(line)) {
      row.number = line;
    } else {
      row.remarks = [row.remarks, line].filter(Boolean).join("; ");
    }
  }
  return row;
}
