export const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", type: "date" },
  { key: "name", label: "Name", type: "text" },
  { key: "number", label: "Number", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "institute", label: "Institute", type: "text" },
  { key: "remarks", label: "Remarks", type: "remarks" }
];

export const reportColumns = (report) => Array.isArray(report?.columns) && report.columns.length ? report.columns : DEFAULT_COLUMNS;

export function columnsFromHeadings(headings) {
  const labels = headings.split(/[,\n]+/).map((value) => value.trim()).filter(Boolean);
  const used = new Set(["date", "marketer"]);
  const columns = [];
  for (const label of labels.slice(0, 18)) {
    if (/^date$/i.test(label) || /^marketer$/i.test(label)) continue;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "column";
    let key = /^[a-z]/.test(base) ? base : `field_${base}`;
    let suffix = 2;
    while (used.has(key)) key = `${base}_${suffix++}`.slice(0, 39);
    used.add(key);
    columns.push({ key, label: label.slice(0, 60), type: /^remarks?$/i.test(label) ? "remarks" : /date/i.test(label) ? "date" : "text" });
  }
  return columns;
}

export const rowValue = (row, column, report) => row?.[column.key] ?? (column.type === "date" ? report.date : "");

export const blankRow = (report) => Object.fromEntries(reportColumns(report).map((column) => [column.key, column.type === "date" ? report.date : ""]));

export function parseCustomReportText(raw, columns, baseParser) {
  const parsed = baseParser(raw);
  for (const line of String(raw || "").split(/\r?\n|;/)) {
    const match = line.match(/^\s*([^:]+):\s*(.+)$/);
    if (!match) continue;
    const label = match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    const column = columns.find((item) => item.label.toLowerCase().replace(/[^a-z0-9]+/g, "") === label);
    if (column && column.type !== "date" && column.type !== "marketer") parsed[column.key] = match[2].trim();
  }
  return parsed;
}
