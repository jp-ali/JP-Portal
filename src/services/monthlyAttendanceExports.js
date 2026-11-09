import { ensureExcelReady } from "./excelLoader.js";

const colors = {
  present: { fill: "E0F4EB", text: "087D50" },
  absent: { fill: "FCE8E8", text: "B3232F" },
  leave: { fill: "E4EDF9", text: "2C65A6" },
  sunday: { fill: "CDE6BE", text: "276041" },
  gazetted: { fill: "FFF1CF", text: "936006" },
  future: { fill: "F7F7F7", text: "9198A1" }
};
const pdfColors = Object.fromEntries(Object.entries(colors).map(([key, value]) => [key, [Number.parseInt(value.fill.slice(0, 2), 16), Number.parseInt(value.fill.slice(2, 4), 16), Number.parseInt(value.fill.slice(4, 6), 16)]]));
const statusLetter = { present: "P", absent: "A", leave: "L", sunday: "", gazetted: "G", future: "" };
const safeName = (value) => String(value || "Marketer").replace(/[^a-z0-9_-]+/gi, "_").slice(0, 50);
const fileStem = (report) => `Monthly_Attendance_${report.month}_${report.people.length === 1 ? safeName(report.people[0].name) : report.audience === "trainer" ? "All_Trainers" : "All_Marketers"}`;

export async function downloadMonthlyAttendanceExcel(report) {
  const XLSX = await ensureExcelReady();
  if (!XLSX) throw new Error("Excel exporter could not load.");
  const dates = Array.from({ length: report.dayCount }, (_, index) => `${index + 1}/${report.monthLabel.slice(0, 3)}`);
  const headings = ["Sr No.", "Name", "Designation", ...dates, "Presents", "Absents", "Total"];
  const rows = report.people.map((person, index) => [
    index + 1, person.name, person.designation,
    ...person.days.map((day) => statusLetter[day.status]),
    person.totals.counted, person.totals.absent, person.totals.elapsed
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headings, ...rows]);
  sheet["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 22 }, ...dates.map(() => ({ wch: 8 })), { wch: 10 }, { wch: 10 }, { wch: 9 }];
  sheet["!rows"] = [{ hpt: 31 }, ...rows.map(() => ({ hpt: 24 }))];
  sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headings.length - 1)}${Math.max(2, rows.length + 1)}` };
  const border = { top: { style: "thin", color: { rgb: "B4B4B4" } }, bottom: { style: "thin", color: { rgb: "B4B4B4" } }, left: { style: "thin", color: { rgb: "B4B4B4" } }, right: { style: "thin", color: { rgb: "B4B4B4" } } };
  for (let r = 0; r <= rows.length; r += 1) for (let c = 0; c < headings.length; c += 1) {
    const address = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[address] || (sheet[address] = { t: "s", v: "" });
    const status = r && c >= 3 && c < 3 + report.dayCount ? report.people[r - 1].days[c - 3].status : null;
    const shade = status ? colors[status] : null;
    cell.s = {
      fill: { fgColor: { rgb: r === 0 ? "CDE6BE" : shade?.fill || (c < 3 ? "F2F7ED" : "FFFFFF") } },
      font: { name: "Arial", sz: r === 0 ? 10 : 9, bold: r === 0 || c === 1, color: { rgb: shade?.text || "242424" } },
      alignment: { horizontal: c === 1 || c === 2 ? "left" : "center", vertical: "center" }, border
    };
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Monthly Attendance");
  XLSX.writeFile(book, `${fileStem(report)}.xlsx`);
}

function drawHeader(pdf, title, subtitle) {
  const width = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(122, 15, 43); pdf.rect(0, 0, width, 68, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
  pdf.text("JAVED PUBLISHERS", 24, 28);
  pdf.setFontSize(11); pdf.text(title, 24, 49);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.text(subtitle, width - 24, 49, { align: "right" });
  pdf.setTextColor(50, 42, 45);
}

function drawFooter(pdf) {
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  pdf.setDrawColor(226, 211, 216); pdf.line(24, height - 35, width - 24, height - 35);
  pdf.setFontSize(8); pdf.setTextColor(115, 102, 106);
  pdf.text("P = Present  |  A = Absent  |  L = Leave  |  G = Gazetted  |  Green = Sunday", 24, height - 20);
  pdf.text(`Page ${pdf.getCurrentPageInfo().pageNumber}`, width - 24, height - 20, { align: "right" });
}

export async function downloadMonthlyAttendancePDF(report) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const width = pdf.internal.pageSize.getWidth();
  drawHeader(pdf, "MONTHLY ATTENDANCE - TEAM SUMMARY", `${report.monthLabel} | ${report.people.length} ${report.audience === "trainer" ? "trainer" : "marketer"}(s)`);
  const head = [["#", report.audience === "trainer" ? "Trainer" : "Marketer", "Present", "Sunday", "Holiday", "Leave", "Absent", "Counted"]];
  const body = report.people.map((person, index) => [index + 1, person.name, person.totals.present, person.totals.sunday, person.totals.gazetted, person.totals.leave, person.totals.absent, person.totals.counted]);
  autoTable(pdf, {
    startY: 91, head, body, theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 5, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [122, 15, 43], textColor: [255, 255, 255], halign: "center" },
    alternateRowStyles: { fillColor: [250, 246, 247] },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 55 }, 3: { cellWidth: 53 }, 4: { cellWidth: 53 }, 5: { cellWidth: 44 }, 6: { cellWidth: 48 }, 7: { cellWidth: 54, fontStyle: "bold" } },
    margin: { left: 24, right: 24, top: 88, bottom: 47 },
    didDrawPage: ({ pageNumber }) => { if (pageNumber > 1) drawHeader(pdf, "MONTHLY ATTENDANCE - TEAM SUMMARY", report.monthLabel); drawFooter(pdf); }
  });
  for (const person of report.people) {
    pdf.addPage();
    drawHeader(pdf, "MONTHLY ATTENDANCE", report.monthLabel);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.setTextColor(73, 37, 48);
    pdf.text(person.name, 24, 97);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(person.designation, 24, 114);
    const stats = [["PRESENT", person.totals.present], ["SUNDAY", person.totals.sunday], ["HOLIDAY", person.totals.gazetted], ["ABSENT", person.totals.absent], ["LEAVE", person.totals.leave], ["COUNTED", person.totals.counted]];
    const statWidth = (width - 48 - 5 * 8) / 6;
    stats.forEach(([label, value], index) => {
      const x = 24 + index * (statWidth + 8);
      pdf.setFillColor(250, 247, 248); pdf.setDrawColor(233, 222, 225); pdf.roundedRect(x, 132, statWidth, 57, 4, 4, "FD");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.setTextColor(80, 38, 51); pdf.text(String(value), x + statWidth / 2, 156, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.text(label, x + statWidth / 2, 176, { align: "center" });
    });
    const gridX = 24, gridY = 228, gap = 5, cellWidth = (width - 48 - gap * 6) / 7, cellHeight = 68;
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((label, index) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(111, 117, 124);
      pdf.text(label, gridX + index * (cellWidth + gap) + cellWidth / 2, gridY - 9, { align: "center" });
    });
    const offset = person.days[0]?.weekday || 0;
    person.days.forEach((day) => {
      const position = offset + day.day - 1;
      const x = gridX + (position % 7) * (cellWidth + gap);
      const y = gridY + Math.floor(position / 7) * (cellHeight + gap);
      pdf.setFillColor(...pdfColors[day.status]); pdf.roundedRect(x, y, cellWidth, cellHeight, 3, 3, "F");
      pdf.setTextColor(45, 53, 53); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
      pdf.text(String(day.day), x + cellWidth / 2, y + 22, { align: "center" });
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      const label = day.status === "sunday" ? "Sunday" : day.status === "gazetted" ? "Holiday" : day.status === "future" ? "" : day.status.charAt(0).toUpperCase() + day.status.slice(1);
      if (label) pdf.text(label, x + cellWidth / 2, y + 37, { align: "center" });
      if (day.time) pdf.text(String(day.time).slice(0, 16), x + cellWidth / 2, y + 53, { align: "center", maxWidth: cellWidth - 6 });
    });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(92, 83, 86);
    pdf.text("Counted = present days + Sundays + gazetted holidays; leave is excluded.", 24, 755);
    drawFooter(pdf);
  }
  pdf.save(`${fileStem(report)}.pdf`);
}
