const headers = ["Name", "Number", "City", "Institute", "Remarks"];
const keys = ["name", "number", "city", "institute", "remarks"];
const filename = (title) => String(title || "Custom_Report").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60);

export function exportCustomReportExcel(report, rows) {
  if (!window.XLSX) throw new Error("Excel exporter is still loading. Please try again.");
  const XLSX = window.XLSX;
  const sheet = XLSX.utils.aoa_to_sheet([
    [report.title],
    [`Date: ${report.date}`],
    headers,
    ...rows.map((row) => keys.map((key) => row[key] || ""))
  ]);
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
  sheet["!cols"] = [22, 22, 18, 30, 48].map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: `A3:E${Math.max(3, rows.length + 3)}` };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Report");
  XLSX.writeFile(book, `${filename(report.title)}_${report.date}.xlsx`);
}

export async function exportCustomReportPDF(report, rows) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  pdf.setFillColor(122, 15, 43);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 66, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(17);
  pdf.text(report.title, 30, 30);
  pdf.setFontSize(10);
  pdf.text(`Date: ${report.date}`, 30, 49);
  autoTable(pdf, {
    startY: 78,
    head: [headers],
    body: rows.map((row) => keys.map((key) => row[key] || "")),
    theme: "grid",
    headStyles: { fillColor: [122, 15, 43], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [252, 247, 248] },
    styles: { fontSize: 9, cellPadding: 7, overflow: "linebreak", valign: "top" },
    margin: { left: 30, right: 30, top: 30 },
    didDrawPage: ({ pageNumber }) => {
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      pdf.text(`Page ${pageNumber}`, pdf.internal.pageSize.getWidth() - 60, pdf.internal.pageSize.getHeight() - 20);
    }
  });
  pdf.save(`${filename(report.title)}_${report.date}.pdf`);
}
