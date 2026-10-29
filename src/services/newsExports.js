import { ensureExcelReady } from "./excelLoader.js";
import { mergedReportSheet } from "./mergedReportSheet.js";

const fileName = (title) => String(title || "News_Report").replace(/[^a-z0-9_-]+/gi, "_");
const downloadDate = () => new Date().toLocaleDateString("en-GB");

export async function exportNewsExcel(title, rows) {
  const XLSX = await ensureExcelReady();
  if (!XLSX) throw new Error("Excel exporter could not load.");
  const sheet = mergedReportSheet(XLSX, rows, title);
  sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 34 }, { wch: 29 }, { wch: 18 }, { wch: 65 }, { wch: 15 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "News");
  XLSX.writeFile(book, `${fileName(title)}_${downloadDate().replaceAll("/", "-")}.xlsx`);
}

export async function exportNewsPDF(title, rows) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const width = pdf.internal.pageSize.getWidth();
  const headings = Object.keys(rows[0] || { "Sr.": "", Type: "", "Marketer(s)": "", "Date Range": "", "Sent Date": "", Message: "", Status: "" });
  autoTable(pdf, {
    startY: 82,
    head: [headings],
    body: rows.map((row) => headings.map((heading) => String(row[heading] ?? ""))),
    theme: "grid",
    headStyles: { fillColor: [122, 15, 43], textColor: 255, fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [252, 247, 248] },
    styles: { fontSize: 8, cellPadding: 6, overflow: "linebreak", valign: "top", halign: "center" },
    margin: { left: 22, right: 22, top: 82, bottom: 44 },
    didDrawPage: ({ pageNumber }) => {
      const height = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(122, 15, 43);
      pdf.rect(0, 0, width, 68, "F");
      pdf.rect(0, height - 31, width, 31, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.text("JAVED PUBLISHERS", width / 2, 26, { align: "center" });
      pdf.setFontSize(11);
      pdf.text(title, width / 2, 47, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Downloaded: ${downloadDate()}`, width - 24, 60, { align: "right" });
      pdf.text("Developed by Ali Ashfaq", width / 2, height - 18, { align: "center" });
      pdf.text(`Page ${pageNumber}`, width - 24, height - 18, { align: "right" });
    }
  });
  pdf.save(`${fileName(title)}_${downloadDate().replaceAll("/", "-")}.pdf`);
}
