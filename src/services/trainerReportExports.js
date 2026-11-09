import { ensureExcelReady } from "./excelLoader.js";

const labels = { details: "Trainer Details", attendance: "Trainer Attendance", weekly: "Weekly Action Plan", daily: "Daily Action Plan", "today-visits": "Today's Trainer Visits", visits: "All Trainer Visits", "today-expenses": "Today's Trainer Expenses", expenses: "All Trainer Expenses", "my-expenses": "My Expenses" };
const clean = (value) => String(value ?? "").replace(/[\r\n]+/g, " ").trim();
const display = (value) => clean(value) || "—";
const startTime = (value) => value ? new Date(value).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" }) : "—";
const stamp = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const fileName = (kind, extension) => `${labels[kind].replaceAll(" ", "_")}_${stamp()}.${extension}`;

export function trainerReportTable(kind, rows, { showTrainer = true, compactAttendance = false, splitWeeklyDates = false } = {}) {
  if (!labels[kind]) throw new Error("Unknown trainer report.");
  if (["today-expenses", "expenses", "my-expenses"].includes(kind)) return {
    title: labels[kind],
    headers: ["#", "Date", ...(showTrainer ? ["Trainer"] : []), "Category", "Description", "Amount (Rs.)", "Proof"],
    rows: rows.map((item, index) => [index + 1, display(item.date), ...(showTrainer ? [display(item.trainerName)] : []), item.category === "Other" ? `Other: ${display(item.otherCategory)}` : display(item.category), display(item.description), Number(item.amount || 0).toFixed(2), item.proofAvailable ? "Attached" : "—"])
  };
  if (kind === "today-visits" || kind === "visits") return {
    title: labels[kind],
    headers: ["#", "Date", ...(showTrainer ? ["Trainer"] : []), "Time", "City", "School Name", "Principal Name", "Phone", "Remarks"],
    rows: rows.map((item, index) => [index + 1, display(item.date), ...(showTrainer ? [display(item.trainerName)] : []), display(item.visitTime), display(item.cityName), display(item.schoolName), display(item.principalName), display(item.phone), display(item.notes)])
  };
  if (kind === "details") return {
    title: labels[kind],
    headers: ["#", "Name", "Email", "Phone", "Designation", "Status"],
    rows: rows.map((item, index) => [index + 1, display(item.name), display(item.email), display(item.phone), display(item.designation), item.active ? "Active" : "Inactive"])
  };
  const headers = ["#", "Date", ...(kind === "weekly" ? splitWeeklyDates ? ["From Date", "To Date"] : ["From - To"] : []), ...(showTrainer ? ["Trainer"] : []), ...(kind === "attendance" ? ["Status", "Start Time", ...(!compactAttendance ? ["Leave Reason"] : [])] : ["Area", "Purpose"])];
  const reportRows = kind === "weekly" ? rows.flatMap((item) => Array.isArray(item.days) ? item.days.map((day) => ({ ...day, fromDate: item.date, toDate: item.toDate || item.date, range: `${item.date} - ${item.toDate || item.date}`, trainerName: item.trainerName })) : [item]) : rows;
  return {
    title: labels[kind], headers,
    rows: reportRows.map((item, index) => [index + 1, display(item.date), ...(kind === "weekly" ? splitWeeklyDates ? [display(item.fromDate || item.date), display(item.toDate || item.date)] : [display(item.range || item.date)] : []), ...(showTrainer ? [display(item.trainerName)] : []), ...(kind === "attendance" ? [display(item.status), startTime(item.checkInAt), ...(!compactAttendance ? [display(item.remarks)] : [])] : [display(item.area), display(item.purpose)])])
  };
}

export function trainerWeeklyPDFTable(plans) {
  const body = [];
  const pdfCell = (value) => display(value).replace(/[^\x20-\x7E]/g, "-");
  for (const plan of plans) {
    const days = Array.isArray(plan.days) && plan.days.length ? plan.days : [plan];
    for (const [index, day] of days.entries()) {
      body.push([
        String(body.length + 1),
        ...(index === 0 ? [{ content: pdfCell(plan.trainerName), rowSpan: days.length, styles: { valign: "top" } }] : []),
        pdfCell(day.date), pdfCell(day.area), pdfCell(day.purpose)
      ]);
    }
  }
  const plan = plans.length === 1 ? plans[0] : null;
  return {
    title: labels.weekly,
    headers: ["#", "Trainer", "Date", "Area", "Purpose"],
    body,
    range: plan ? `From Date: ${display(plan.date)}     To Date: ${display(plan.toDate || plan.date)}` : `${plans.length} weekly plans`
  };
}

export async function downloadTrainerExcel(kind, rows, options) {
  const XLSX = await ensureExcelReady();
  if (!XLSX) throw new Error("Excel exporter could not load.");
  const { title, headers, rows: body } = trainerReportTable(kind, rows, options);
  const sheet = XLSX.utils.aoa_to_sheet([[title.toUpperCase()], [`JAVED PUBLISHERS  |  ${body.length} records`], headers, ...body]);
  sheet["!merges"] = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: headers.length - 1 } }));
  sheet["!cols"] = headers.map((header) => ({ wch: header === "Purpose" || header === "Remarks" ? 48 : header === "Email" ? 30 : header === "Name" || header === "Trainer" || header === "School Name" ? 24 : 18 }));
  sheet["!autofilter"] = { ref: `A3:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(3, body.length + 3)}` };
  for (let r = 0; r < body.length + 3; r += 1) for (let c = 0; c < headers.length; c += 1) {
    const address = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[address] || (sheet[address] = { t: "s", v: "" });
    cell.s = { fill: { fgColor: { rgb: r < 3 ? "7A0F2B" : r % 2 ? "FAF6F7" : "FFFFFF" } }, font: { bold: r < 3, color: { rgb: r < 3 ? "FFFFFF" : "30262A" } }, alignment: { vertical: "top", wrapText: true } };
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, title.slice(0, 31));
  XLSX.writeFile(book, fileName(kind, "xlsx"));
}

export async function downloadTrainerPDF(kind, rows, options) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const weekly = kind === "weekly" ? trainerWeeklyPDFTable(rows) : null;
  const { title, headers, rows: reportRows } = weekly || trainerReportTable(kind, rows, options);
  const body = weekly ? weekly.body : reportRows.map((row) => row.map((value) => String(value).replace(/[^\x20-\x7E]/g, "-")));
  const visitReport = kind === "today-visits" || kind === "visits";
  const expenseReport = ["today-expenses", "expenses", "my-expenses"].includes(kind);
  const expenseTotal = expenseReport ? rows.reduce((sum, item) => sum + Number(item.amount || 0), 0) : 0;
  const amountColumn = headers.indexOf("Amount (Rs.)");
  const pdf = new jsPDF({ unit: "pt", format: visitReport ? "a3" : "a4", orientation: kind === "attendance" || kind === "details" || kind === "weekly" || visitReport || expenseReport ? "landscape" : "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  autoTable(pdf, {
    startY: weekly ? 119 : 108, head: [headers], body, theme: "grid",
    ...(expenseReport ? {
      foot: [[{ content: "TOTAL (Rs.)", colSpan: amountColumn, styles: { halign: "right" } }, expenseTotal.toFixed(2), ""]],
      showFoot: "lastPage",
      footStyles: { fillColor: [255, 243, 246], textColor: [122, 15, 43], fontStyle: "bold" }
    } : {}),
    styles: { fontSize: visitReport ? 7 : 8, cellPadding: visitReport ? 4 : 5, overflow: "linebreak", valign: "top" },
    ...(weekly ? { columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 125 }, 2: { cellWidth: 105 }, 3: { cellWidth: 135 } } } : {}),
    headStyles: { fillColor: [122, 15, 43], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 246, 247] },
    margin: { left: 24, right: 24, top: weekly ? 119 : 108, bottom: 52 }
  });
  if (!body.length) { pdf.setTextColor(80, 70, 75); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("No records found for the selected filters.", 24, 150); }
  const pageCount = pdf.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFillColor(122, 15, 43);
    pdf.rect(24, 14, pageWidth - 48, 68, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(18);
    pdf.text("JAVED PUBLISHERS", pageWidth / 2, 39, { align: "center" });
    pdf.setFontSize(11.5); pdf.text(`${title.toUpperCase()} REPORT`, pageWidth / 2, 56, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
    pdf.text(`Report Date: ${new Date().toLocaleDateString("en-GB")}`, 30, 72);
    pdf.text(`Total Records: ${body.length}`, pageWidth / 2, 72, { align: "center" });
    pdf.text("Official Trainer Record", pageWidth - 30, 72, { align: "right" });
    if (weekly) {
      pdf.setFillColor(255, 243, 246);
      pdf.rect(24, 89, pageWidth - 48, 28, "F");
      pdf.setTextColor(117, 16, 45);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
      pdf.text(weekly.range, pageWidth / 2, 107, { align: "center" });
      pdf.setTextColor(255, 255, 255);
    }
    pdf.setFillColor(122, 15, 43);
    pdf.rect(24, pageHeight - 37, pageWidth - 48, 28, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
    pdf.text("Developed by Ali Ashfaq", pageWidth / 2, pageHeight - 18, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
    pdf.text(`${title} Report`, 30, pageHeight - 18);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - 30, pageHeight - 18, { align: "right" });
  }
  pdf.save(fileName(kind, "pdf"));
}
