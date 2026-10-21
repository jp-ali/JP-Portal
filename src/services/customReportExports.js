import { reportColumns, rowValue } from "../domain/customReportSchema.js";

const filename = (title) => String(title || "Custom_Report").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60);
const downloadDate = () => new Date().toLocaleDateString("en-GB");
const display = (row, column, report, marketers) => {
  const value = rowValue(row, column, report);
  return column.type === "marketer" ? marketers.find((item) => [item.id, item.email, item.name].some((identity) => identity && String(identity).toLowerCase() === String(value).toLowerCase()))?.name || value : value;
};
const contiguousGroups = (rows, getKey) => {
  const groups = [];
  rows.forEach((row, index) => {
    const key = getKey(row);
    if (groups.at(-1)?.key === key) groups.at(-1).end = index;
    else groups.push({ key, start: index, end: index });
  });
  return groups;
};
const dateGroups = (rows, report) => contiguousGroups(rows, (row) => `${report.verificationLayout ? `${row.verificationGroup}\u0000` : ""}${row.date || report.date}`);
const personGroups = (rows) => contiguousGroups(rows, (row) => row.verificationGroup);

export function exportCustomReportExcel(report, rows, marketers = []) {
  if (!window.XLSX) throw new Error("Excel exporter is still loading. Please try again.");
  const XLSX = window.XLSX;
  const columns = reportColumns(report);
  const last = columns.length - 1;
  const dateRow = Array(columns.length).fill("");
  dateRow[last] = `Downloaded: ${downloadDate()}`;
  const sheet = XLSX.utils.aoa_to_sheet([
    [report.title],
    dateRow,
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => display(row, column, report, marketers)))
  ]);
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: last } }];
  const dateColumn = columns.findIndex((column) => column.key === "date");
  if (dateColumn >= 0) dateGroups(rows, report).forEach(({ start, end }) => {
    if (end > start) merges.push({ s: { r: start + 3, c: dateColumn }, e: { r: end + 3, c: dateColumn } });
  });
  if (report.verificationLayout) personGroups(rows).forEach(({ start, end }) => {
    if (end > start) for (const key of ["verificationGroupSr", "verificationMarketerName"]) {
      const column = columns.findIndex((item) => item.key === key);
      if (column >= 0) merges.push({ s: { r: start + 3, c: column }, e: { r: end + 3, c: column } });
    }
  });
  sheet["!merges"] = merges;
  sheet["!cols"] = columns.map((column) => ({ wch: column.type === "remarks" ? 45 : column.type === "date" ? 16 : Math.max(18, Math.min(34, column.label.length + 10)) }));
  sheet["!autofilter"] = { ref: `A3:${XLSX.utils.encode_col(last)}${Math.max(3, rows.length + 3)}` };
  sheet["!rows"] = [{ hpt: 32 }, { hpt: 24 }, { hpt: 28 }];
  for (const address of Object.keys(sheet)) {
    if (address.startsWith("!")) continue;
    sheet[address].s = { ...sheet[address].s, alignment: { horizontal: "center", vertical: "top", wrapText: true } };
  }
  if (sheet.A1) sheet.A1.s.font = { bold: true, color: { rgb: "7A0F2B" } };
  const dateCell = `${XLSX.utils.encode_col(last)}2`;
  if (sheet[dateCell]) sheet[dateCell].s = { alignment: { horizontal: "right", vertical: "top" }, font: { color: { rgb: "7A0F2B" } } };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Report");
  XLSX.writeFile(book, `${filename(report.title)}_${downloadDate().replaceAll("/", "-")}.xlsx`);
}

export async function exportCustomReportPDF(report, rows, marketers = []) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const columns = reportColumns(report);
  const pdf = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(122, 15, 43);
  pdf.rect(0, 0, width, 70, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(report.title, width / 2, 29, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(`Downloaded: ${downloadDate()}`, width - 24, 49, { align: "right" });
  const body = rows.map((row) => columns.map((column) => display(row, column, report, marketers)));
  const dateIndex = columns.findIndex((column) => column.key === "date");
  if (dateIndex >= 0) dateGroups(rows, report).forEach(({ start, end }) => {
    if (end > start) {
      body[start][dateIndex] = { content: body[start][dateIndex], rowSpan: end - start + 1, styles: { valign: "top", halign: "center" } };
      for (let index = start + 1; index <= end; index++) body[index].splice(dateIndex, 1);
    }
  });
  if (report.verificationLayout) for (const key of ["verificationMarketerName", "verificationGroupSr"]) {
    const column = columns.findIndex((item) => item.key === key);
    if (column < 0) continue;
    personGroups(rows).forEach(({ start, end }) => {
      if (end > start) {
        body[start][column] = { content: body[start][column], rowSpan: end - start + 1, styles: { valign: "top", halign: "center" } };
        for (let index = start + 1; index <= end; index++) body[index].splice(column, 1);
      }
    });
  }
  autoTable(pdf, {
    startY: 80,
    head: [columns.map((column) => column.label)],
    body,
    theme: "grid",
    headStyles: { fillColor: [122, 15, 43], textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [252, 247, 248] },
    styles: { fontSize: columns.length > 8 ? 6.5 : 8.5, cellPadding: 5, overflow: "linebreak", valign: "top", halign: "center" },
    margin: { left: 22, right: 22, top: 30, bottom: 42 },
    didDrawPage: ({ pageNumber }) => {
      const bottom = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(122, 15, 43); pdf.rect(0, bottom - 31, width, 31, "F");
      pdf.setFontSize(8); pdf.setTextColor(255, 255, 255);
      pdf.text("Created by Ali Ashfaq", width / 2, bottom - 18, { align: "center" });
      pdf.text(`Page ${pageNumber}`, width - 24, bottom - 18, { align: "right" });
    }
  });
  pdf.save(`${filename(report.title)}_${downloadDate().replaceAll("/", "-")}.pdf`);
}
