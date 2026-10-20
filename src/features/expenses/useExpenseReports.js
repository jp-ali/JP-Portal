import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../services/firebase";
import { calculatedKms, dailyAssignedKms, dailyPetrolExpense, dailyPetrolRate } from "./expenseCalculations.js";
import { mergedReportSheet } from "../../services/mergedReportSheet.js";
import { PDF_BANNER, PDF_TABLE_HEAD, PDF_FOOTER, pdfTextFill } from "../../services/pdfTheme.js";

export function useExpenseReports({ user, setMarketerview, setAdminView, marketersList, fetchMarketers, getDateKey, formatActionPlanDate, formatTime12, groupRowsByMarketerAndDate }) {
const [expenseReportFromDate, setExpenseReportFromDate] = useState("");
const [expenseReportToDate, setExpenseReportToDate] = useState("");
const [expenseReportRows, setExpenseReportRows] = useState([]);
const [expenseReportLoading, setExpenseReportLoading] = useState(false);
const [expenseReportPetrolRates, setExpenseReportPetrolRates] = useState({});
const [adminExpenseFromDate, setAdminExpenseFromDate] = useState("");
const [adminExpenseToDate, setAdminExpenseToDate] = useState("");
const [adminExpenseMarketerIds, setAdminExpenseMarketerIds] = useState([]);
const [adminExpenseRows, setAdminExpenseRows] = useState([]);
const [adminExpenseLoading, setAdminExpenseLoading] = useState(false);
const [adminExpensePetrolRates, setAdminExpensePetrolRates] = useState({});
const fetchMarketerExpenseReport = async () => {
if (!user?.email) return [];
setExpenseReportLoading(true);
try {
const [snap, ratesResult] = await Promise.all([
getDocs(query(collection(db, "attendance"), where("marketerEmail", "==", user.email))),
getDocs(collection(db, "petrol_rates")).then((value) => ({ value })).catch((error) => ({ error }))
]);
const rates = {};
ratesResult.value?.docs.forEach((rateDoc) => {
const value = Number(rateDoc.data().rate);
if (Number.isFinite(value) && value >= 0) rates[String(rateDoc.data().date || rateDoc.id)] = value;
});
if (ratesResult.error) console.error("Petrol rate fetch error:", ratesResult.error);
setExpenseReportPetrolRates(rates);
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
rows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
setExpenseReportRows(rows);
return rows;
} catch (err) {
console.error("Expense report fetch error:", err);
alert("Expense report could not be loaded.");
return [];
} finally {
setExpenseReportLoading(false);
}
};
const openExpenseReport = async () => {
setMarketerview("expense-report");
setExpenseReportFromDate("");
setExpenseReportToDate("");
await fetchMarketerExpenseReport();
};
const getFilteredExpenseReportRows = () => expenseReportRows.filter((row) => {
const dateKey = String(row?.date || getDateKey(row?.updatedAt || row?.startCreatedAt || row?.endCreatedAt));
if (!dateKey) return false;
if (expenseReportFromDate && dateKey < expenseReportFromDate) return false;
if (expenseReportToDate && dateKey > expenseReportToDate) return false;
return true;
});
const getMarketerExpensePetrol = (row) => dailyPetrolExpense(row, user, expenseReportPetrolRates);
const buildExpenseReportExportRows = () => {
const rows = getFilteredExpenseReportRows();
return rows.map((row, index) => {
const kms = calculatedKms(row);
const petrolExpense = getMarketerExpensePetrol(row);
const transport = Number(row?.transportExpense || 0);
const nightStay = Number(row?.nightStayExpense || 0);
const food = Number(row?.foodExpense || 0);
const other = Number(row?.otherExpense || 0);
return {
sr: index + 1,
date: formatActionPlanDate(row.date || getDateKey(row.updatedAt)),
time: `${formatTime12(row.startTime, "—")} - ${formatTime12(row.endTime, "—")}`,
dayIn: row.startReading ?? "—",
dayOut: row.endReading ?? "—",
kms: Number.isFinite(kms) ? kms : 0,
petrolExpense,
transport,
nightStay,
food,
other,
totalOtherExpense: transport + nightStay + food + other
};
});
};
const downloadExpenseReportExcel = () => {
if (!expenseReportFromDate || !expenseReportToDate) {
alert("Please select From Date and To Date first.");
return;
}
const rows = buildExpenseReportExportRows();
if (!rows.length) {
alert("No expense report data found for the selected range.");
return;
}
if (!window.XLSX) {
alert("Excel library is still loading. Please try again in a moment.");
return;
}
const totalKms = rows.reduce((sum, row) => sum + Number(row.kms || 0), 0);
const totalPetrol = rows.reduce((sum, row) => sum + Number(row.petrolExpense || 0), 0);
const totalTransport = rows.reduce((sum, row) => sum + Number(row.transport || 0), 0);
const totalNight = rows.reduce((sum, row) => sum + Number(row.nightStay || 0), 0);
const totalFood = rows.reduce((sum, row) => sum + Number(row.food || 0), 0);
const totalOther = rows.reduce((sum, row) => sum + Number(row.other || 0), 0);
const totalAllOther = rows.reduce((sum, row) => sum + Number(row.totalOtherExpense || 0), 0);
const data = rows.map((row) => ({
"Sr.": row.sr,
"Date": row.date,
"Time": row.time,
"Day In Reading": row.dayIn,
"Day Out Reading": row.dayOut,
"Calculated KMs": Number(row.kms.toFixed(1)),
"Petrol Expense": Number(row.petrolExpense.toFixed(2)),
"Transport": Number(row.transport.toFixed(2)),
"Night Stay": Number(row.nightStay.toFixed(2)),
"Food": Number(row.food.toFixed(2)),
"Other": Number(row.other.toFixed(2)),
"Total Other Expense": Number(row.totalOtherExpense.toFixed(2))
}));
data.push({
"Sr.": "",
"Date": "TOTAL",
"Time": "",
"Day In Reading": "",
"Day Out Reading": "",
"Calculated KMs": Number(totalKms.toFixed(1)),
"Petrol Expense": Number(totalPetrol.toFixed(2)),
"Transport": Number(totalTransport.toFixed(2)),
"Night Stay": Number(totalNight.toFixed(2)),
"Food": Number(totalFood.toFixed(2)),
"Other": Number(totalOther.toFixed(2)),
"Total Other Expense": Number(totalAllOther.toFixed(2))
});
const worksheet = mergedReportSheet(window.XLSX, data, "Expense Report");
worksheet["!cols"] = [
{ wch: 6 }, { wch: 15 }, { wch: 24 }, { wch: 16 }, { wch: 16 },
{ wch: 16 }, { wch: 17 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 20 }
];
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Report");
const from = expenseReportFromDate || "All";
const to = expenseReportToDate || "All";
window.XLSX.writeFile(workbook, `Expense_Report_${from}_to_${to}.xlsx`);
};
const downloadExpenseReportPDF = () => {
if (!expenseReportFromDate || !expenseReportToDate) {
alert("Please select From Date and To Date first.");
return;
}
const rows = buildExpenseReportExportRows();
if (!rows.length) {
alert("No expense report data found for the selected range.");
return;
}
try {
const clean = (v) => String(v ?? "N/A").replace(/[\r\n]+/g, " ").trim() || "N/A";
const ascii = (v) => clean(v).replace(/[^\x20-\x7E]/g, "?");
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MM = 72 / 25.4;
const LEFT = 7;
const RIGHT = 290;
const TABLE_TOP = 38;
const CONTENT_BOTTOM = 193;
const columns = [
["Sr.", 9], ["Date", 22], ["Time", 32], ["Day In", 24], ["Day Out", 24],
["KMs", 18], ["Petrol Expense", 20], ["Transport", 22], ["Night Stay", 22], ["Food", 20], ["Other", 20], ["Total Other", 50]
];
const esc = (v) => ascii(v).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const textWidth = (txt, size) => ascii(txt).length * size * 0.50;
const wrapText = (value, maxWidth, size) => {
const txt = ascii(value);
if (!txt) return ["N/A"];
const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.50)));
const words = txt.split(/\s+/);
const lines = [];
let line = "";
words.forEach((word) => {
const candidate = line ? `${line} ${word}` : word;
if (candidate.length <= maxChars) line = candidate;
else { if (line) lines.push(line); line = word; }
});
if (line) lines.push(line);
return lines.length ? lines : ["N/A"];
};
const topToPdfY = (topMm) => PAGE_H - topMm * MM;
const rectCmd = (xMm, topMm, wMm, hMm, stroke = 0.45, fill = null) => {
const x = xMm * MM;
const y = PAGE_H - (topMm + hMm) * MM;
const w = wMm * MM;
const h = hMm * MM;
const parts = [];
if (fill) parts.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
parts.push(`${stroke} w`, `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`, fill ? "B" : "S");
return parts.join("\n");
};
const drawText = (xMm, topMm, txt, size = 7, align = "left", bold = false) => {
const safe = esc(txt);
const fontName = bold ? "/F2" : "/F1";
let x = xMm * MM;
const width = textWidth(txt, size);
if (align === "center") x -= width / 2;
if (align === "right") x -= width;
const y = topToPdfY(topMm) - size * 0.80;
return `BT ${fontName} ${size} Tf ${pdfTextFill(topMm)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safe}) Tj ET`;
};
const drawWrapped = (xMm, topMm, wMm, hMm, txt, size = 6.0, bold = false) => {
const lines = wrapText(txt, wMm * MM - 4 * MM, size);
const lineH = size * 1.22;
const maxLines = Math.max(1, Math.floor((hMm * MM - 2.2 * MM) / lineH));
const visible = lines.slice(0, maxLines);
if (lines.length > maxLines && visible.length) visible[visible.length - 1] = `${visible[visible.length - 1].slice(0, Math.max(1, visible[visible.length - 1].length - 4))}...`;
const blockH = visible.length * lineH;
const startTop = topMm + Math.max(1.7, (hMm * MM - blockH) / MM / 2 + size * 0.65 / MM);
return visible.map((line, i) => drawText(xMm + wMm / 2, startTop + i * lineH / MM, line, size, "center", bold)).join("\n");
};
const pages = [];
const marketerLabel = user?.name || user?.email || "Marketer";
const rangeLabel = `${expenseReportFromDate} to ${expenseReportToDate}`;
const newPage = () => {
const c = [];
c.push(rectCmd(LEFT, 5, RIGHT - LEFT, 24, 0.55, PDF_BANNER));
c.push(drawText(148.5, 9, "JAVED PUBLISHERS", 18, "center", true));
c.push(drawText(148.5, 15.5, "MARKETER EXPENSE REPORT", 11.5, "center", true));
c.push(drawText(10, 22.5, `Report Date: ${new Date().toLocaleDateString("en-GB")}`, 6.5, "left", false));
c.push(drawText(148.5, 22.5, `Range: ${rangeLabel}`, 6.5, "center", false));
c.push(drawText(287, 22.5, marketerLabel, 6.3, "right", false));
let x = LEFT;
columns.forEach(([heading, width]) => {
c.push(rectCmd(x, TABLE_TOP, width, 9, 0.55, PDF_TABLE_HEAD));
c.push(drawWrapped(x, TABLE_TOP, width, 9, heading, 6.0, true));
x += width;
});
return { content: c, y: TABLE_TOP + 9 };
};
let page = newPage();
pages.push(page);
const drawRow = (values, isTotal = false) => {
const sizes = values.map((value, i) => wrapText(value, columns[i][1] * MM - 4 * MM, isTotal ? 5.9 : 5.7).length);
const h = Math.min(18, Math.max(8, 2.8 + Math.max(...sizes) * 3.05));
if (page.y + h > CONTENT_BOTTOM) { page = newPage(); pages.push(page); }
let x = LEFT;
values.forEach((value, i) => {
const fill = isTotal ? [0.995, 0.945, 0.955] : null;
page.content.push(rectCmd(x, page.y, columns[i][1], h, 0.42, fill));
page.content.push(drawWrapped(x, page.y, columns[i][1], h, value, isTotal ? 5.9 : 5.7, isTotal));
x += columns[i][1];
});
page.y += h;
};
rows.forEach((row) => drawRow([
row.sr, row.date, row.time, row.dayIn, row.dayOut,
Number(row.kms).toFixed(1).replace(/\.0$/, ""),
`Rs. ${Number(row.petrolExpense).toFixed(2)}`,
`Rs. ${Number(row.transport).toFixed(2).replace(/\.00$/, "")}`,
`Rs. ${Number(row.nightStay).toFixed(2).replace(/\.00$/, "")}`,
`Rs. ${Number(row.food).toFixed(2).replace(/\.00$/, "")}`,
`Rs. ${Number(row.other).toFixed(2).replace(/\.00$/, "")}`,
`Rs. ${Number(row.totalOtherExpense).toFixed(2).replace(/\.00$/, "")}`
]));
const totalKms = rows.reduce((sum, row) => sum + Number(row.kms || 0), 0);
const totalPetrol = rows.reduce((sum, row) => sum + Number(row.petrolExpense || 0), 0);
const totalTransport = rows.reduce((sum, row) => sum + Number(row.transport || 0), 0);
const totalNight = rows.reduce((sum, row) => sum + Number(row.nightStay || 0), 0);
const totalFood = rows.reduce((sum, row) => sum + Number(row.food || 0), 0);
const totalOther = rows.reduce((sum, row) => sum + Number(row.other || 0), 0);
const totalAll = rows.reduce((sum, row) => sum + Number(row.totalOtherExpense || 0), 0);
drawRow(["", "TOTAL", "", "", "", `${totalKms.toFixed(1).replace(/\.0$/, "")} KMs`, `Rs. ${totalPetrol.toFixed(2)}`, `Rs. ${totalTransport.toFixed(2)}`, `Rs. ${totalNight.toFixed(2)}`, `Rs. ${totalFood.toFixed(2)}`, `Rs. ${totalOther.toFixed(2)}`, `Rs. ${totalAll.toFixed(2)}`], true);
pages.forEach((pg, idx) => {
pg.content.push(rectCmd(LEFT, 197, RIGHT - LEFT, 10, 0.45, PDF_FOOTER));
pg.content.push(drawText(148.5, 203, "Created by Ali Ashfaq", 7.5, "center", true));
pg.content.push(drawText(10, 203, "Marketer Expense Report", 6.3, "left", false));
pg.content.push(drawText(287, 203, `Page ${idx + 1} of ${pages.length}`, 6.3, "right", false));
});
const objects = [];
const addObject = (body) => { objects.push(body); return objects.length; };
const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const contentIds = [], pageIds = [];
pages.forEach((pg) => { const stream = pg.content.join("\n") + "\n"; contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)); pageIds.push(0); });
const pagesId = addObject("");
pages.forEach((pg, i) => { pageIds[i] = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`); });
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [0];
objects.forEach((obj, i) => { offsets[i + 1] = pdf.length; pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
const xref = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
const bytes = new Uint8Array(pdf.length);
for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
const blob = new Blob([bytes], { type: "application/pdf" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `Expense_Report_${expenseReportFromDate}_to_${expenseReportToDate}.pdf`;
a.style.display = "none";
document.body.appendChild(a); a.click(); a.remove();
setTimeout(() => URL.revokeObjectURL(url), 2000);
} catch (err) {
console.error("Expense PDF error:", err);
alert("Expense PDF could not be downloaded. Please try again.");
}
};
const getAdminExpenseMarketerName = (row) => {
const marketer = marketersList.find((m) => String(m.email || "").toLowerCase() === String(row?.marketerEmail || "").toLowerCase());
return marketer?.name || row?.marketerName || row?.marketerEmail || "Marketer";
};
const fetchAdminExpenseReport = async () => {
setAdminExpenseLoading(true);
try {
const [snap, ratesSnap] = await Promise.all([
getDocs(collection(db, "attendance")),
getDocs(collection(db, "petrol_rates"))
]);
const rates = {};
ratesSnap.docs.forEach((doc) => {
const value = Number(doc.data().rate);
if (Number.isFinite(value) && value >= 0) rates[String(doc.data().date || doc.id)] = value;
});
setAdminExpensePetrolRates(rates);
const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
rows.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
setAdminExpenseRows(rows);
return rows;
} catch (err) {
console.error("Admin expense report fetch error:", err);
alert("Expense report could not be loaded.");
return [];
} finally {
setAdminExpenseLoading(false);
}
};
const openAdminExpenseReport = async () => {
setAdminView("expense-report");
setAdminExpenseFromDate("");
setAdminExpenseToDate("");
setAdminExpenseMarketerIds([]);
setAdminExpenseRows([]);
await fetchMarketers();
await fetchAdminExpenseReport();
};
const getFilteredAdminExpenseRows = () => {
const selectedEmails = adminExpenseMarketerIds.length ? new Set(marketersList.filter((m) => adminExpenseMarketerIds.includes(m.id)).map((m) => String(m.email || "").toLowerCase())) : null;
return adminExpenseRows.filter((row) => {
const dateKey = String(row?.date || getDateKey(row?.updatedAt || row?.startCreatedAt || row?.endCreatedAt));
if (!dateKey) return false;
if (adminExpenseFromDate && dateKey < adminExpenseFromDate) return false;
if (adminExpenseToDate && dateKey > adminExpenseToDate) return false;
if (selectedEmails && !selectedEmails.has(String(row?.marketerEmail || "").toLowerCase())) return false;
return true;
});
};
const getAdminExpenseValues = (row) => {
const marketer = marketersList.find((m) => String(m.email || "").toLowerCase() === String(row?.marketerEmail || "").toLowerCase());
return {
kms: calculatedKms(row),
assignedKms: dailyAssignedKms(row, marketer),
petrolRate: dailyPetrolRate(row, adminExpensePetrolRates),
petrolExpense: dailyPetrolExpense(row, marketer, adminExpensePetrolRates)
};
};
const buildAdminExpenseExportRows = () => getFilteredAdminExpenseRows().map((row, index) => {
const { kms, assignedKms, petrolRate, petrolExpense } = getAdminExpenseValues(row);
const transport = Number(row?.transportExpense || 0);
const nightStay = Number(row?.nightStayExpense || 0);
const food = Number(row?.foodExpense || 0);
const other = Number(row?.otherExpense || 0);
return {
sr: index + 1,
marketerName: getAdminExpenseMarketerName(row),
marketerEmail: row.marketerEmail,
dateKey: row.date || getDateKey(row.updatedAt || row.startCreatedAt || row.endCreatedAt),
date: formatActionPlanDate(row.date || getDateKey(row.updatedAt)),
time: `${formatTime12(row.startTime, "—")} - ${formatTime12(row.endTime, "—")}`,
dayIn: row.startReading ?? "—",
dayOut: row.endReading ?? "—",
kms: Number.isFinite(kms) ? kms : 0,
assignedKms,
petrolRate,
petrolExpense,
transport,
nightStay,
food,
other,
totalOtherExpense: transport + nightStay + food + other
};
});
const downloadAdminExpenseExcel = () => {
if (!adminExpenseFromDate || !adminExpenseToDate) {
alert("Please select From Date and To Date first.");
return;
}
const rows = buildAdminExpenseExportRows();
if (!rows.length) {
alert("No expense report data found for the selected range.");
return;
}
if (!window.XLSX) {
alert("Excel library is still loading. Please try again in a moment.");
return;
}
const totalKms = rows.reduce((sum, row) => sum + Number(row.kms || 0), 0);
const totalPetrol = rows.reduce((sum, row) => sum + Number(row.petrolExpense || 0), 0);
const totalTransport = rows.reduce((sum, row) => sum + Number(row.transport || 0), 0);
const totalNight = rows.reduce((sum, row) => sum + Number(row.nightStay || 0), 0);
const totalFood = rows.reduce((sum, row) => sum + Number(row.food || 0), 0);
const totalOther = rows.reduce((sum, row) => sum + Number(row.other || 0), 0);
const totalAllOther = rows.reduce((sum, row) => sum + Number(row.totalOtherExpense || 0), 0);
const data = rows.map((row) => ({
"Sr.": row.sr,
"Marketer": row.marketerName,
"Date": row.date,
"Time": row.time,
"Day In Reading": row.dayIn,
"Day Out Reading": row.dayOut,
"Calculated KMs": Number(row.kms.toFixed(1)),
"Assigned KMs": Number(row.assignedKms.toFixed(1)),
"Rate / L": row.petrolRate === null ? "" : Number(row.petrolRate.toFixed(2)),
"Petrol Expense": Number(row.petrolExpense.toFixed(2)),
"Transport": Number(row.transport.toFixed(2)),
"Night Stay": Number(row.nightStay.toFixed(2)),
"Food": Number(row.food.toFixed(2)),
"Other": Number(row.other.toFixed(2)),
"Total Other Expense": Number(row.totalOtherExpense.toFixed(2))
}));
data.push({
"Sr.": "",
"Marketer": "",
"Date": "TOTAL",
"Time": "",
"Day In Reading": "",
"Day Out Reading": "",
"Calculated KMs": Number(totalKms.toFixed(1)),
"Assigned KMs": "",
"Rate / L": "",
"Petrol Expense": Number(totalPetrol.toFixed(2)),
"Transport": Number(totalTransport.toFixed(2)),
"Night Stay": Number(totalNight.toFixed(2)),
"Food": Number(totalFood.toFixed(2)),
"Other": Number(totalOther.toFixed(2)),
"Total Other Expense": Number(totalAllOther.toFixed(2))
});
const worksheet = mergedReportSheet(window.XLSX, data, "Expense Report");
worksheet["!cols"] = [
{ wch: 6 }, { wch: 28 }, { wch: 15 }, { wch: 24 }, { wch: 16 }, { wch: 16 },
{ wch: 16 }, { wch: 16 }, { wch: 13 }, { wch: 17 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 20 }
];
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Report");
const safeName = adminExpenseMarketerIds.length === 1 ? String(marketersList.find((m) => m.id === adminExpenseMarketerIds[0])?.name || "Marketer").replace(/[^a-z0-9_-]+/gi, "_") : adminExpenseMarketerIds.length ? "Selected_Marketers" : "All_Marketers";
window.XLSX.writeFile(workbook, `Expense_Report_${safeName}_${adminExpenseFromDate}_to_${adminExpenseToDate}.xlsx`);
};
const downloadAdminExpensePDF = () => {
if (!adminExpenseFromDate || !adminExpenseToDate) { alert("Please select From Date and To Date first."); return; }
const rows = buildAdminExpenseExportRows();
if (!rows.length) { alert("No expense report data found for the selected range."); return; }
try {
const clean = (v) => String(v ?? "N/A").replace(/[\r\n]+/g, " ").trim() || "N/A";
const ascii = (v) => clean(v).replace(/[^\x20-\x7E]/g, "?");
const PAGE_W = 841.89, PAGE_H = 595.28, MM = 72 / 25.4;
const LEFT = 7, RIGHT = 290, TABLE_TOP = 38, CONTENT_BOTTOM = 193;
const columns = [
["Sr.", 7], ["Marketer", 23], ["Date", 19], ["Sr#", 7], ["Time", 23], ["Day In", 18], ["Day Out", 18],
["KMs", 14], ["Assigned KMs", 17], ["Rate / L", 15], ["Petrol Expense", 18], ["Transport", 20],
["Night Stay", 20], ["Food", 20], ["Other", 20], ["Total Other", 24]
];
const esc = (v) => ascii(v).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const textWidth = (txt, size) => ascii(txt).length * size * .50;
const wrapText = (value, maxWidth, size) => {
const txt = ascii(value); if (!txt) return ["N/A"];
const maxChars = Math.max(1, Math.floor(maxWidth / (size * .50)));
const words = txt.split(/\s+/), lines = []; let line = "";
words.forEach((word) => { const candidate = line ? `${line} ${word}` : word; if (candidate.length <= maxChars) line = candidate; else { if (line) lines.push(line); line = word; } });
if (line) lines.push(line); return lines.length ? lines : ["N/A"];
};
const topToPdfY = (topMm) => PAGE_H - topMm * MM;
const rectCmd = (xMm, topMm, wMm, hMm, stroke=.45, fill=null) => {
const x=xMm*MM, y=PAGE_H-(topMm+hMm)*MM, w=wMm*MM, h=hMm*MM; const parts=[];
if(fill) parts.push(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
parts.push(`${stroke} w`, `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`, fill?"B":"S"); return parts.join("\n");
};
const drawText = (xMm, topMm, txt, size=7, align="left", bold=false) => {
const safe=esc(txt), fontName=bold?"/F2":"/F1"; let x=xMm*MM; const width=textWidth(txt,size);
if(align==="center") x-=width/2; if(align==="right") x-=width; const y=topToPdfY(topMm)-size*.80;
return `BT ${fontName} ${size} Tf ${pdfTextFill(topMm)} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${safe}) Tj ET`;
};
const drawWrapped = (xMm, topMm, wMm, hMm, txt, size=6.0, bold=false) => {
const lines=wrapText(txt,wMm*MM-4*MM,size), lineH=size*1.22; const maxLines=Math.max(1,Math.floor((hMm*MM-2.2*MM)/lineH));
const visible=lines.slice(0,maxLines); if(lines.length>maxLines&&visible.length) visible[visible.length-1]=`${visible[visible.length-1].slice(0,Math.max(1,visible[visible.length-1].length-4))}...`;
const blockH=visible.length*lineH; const startTop=topMm+Math.max(1.7,(hMm*MM-blockH)/MM/2+size*.65/MM);
return visible.map((line,i)=>drawText(xMm+wMm/2,startTop+i*lineH/MM,line,size,"center",bold)).join("\n");
};
const pages=[];
const rangeLabel=`${adminExpenseFromDate} to ${adminExpenseToDate}`;
const marketerLabel=adminExpenseMarketerIds.length === 1 ? (marketersList.find((m) => m.id === adminExpenseMarketerIds[0])?.name || "Marketer") : adminExpenseMarketerIds.length ? `${adminExpenseMarketerIds.length} Marketers` : "All Marketers";
const newPage=()=>{
const c=[];
c.push(rectCmd(LEFT,5,RIGHT-LEFT,24,.55,PDF_BANNER));
c.push(drawText(148.5,9,"JAVED PUBLISHERS",18,"center",true));
c.push(drawText(148.5,15.5,"ADMIN EXPENSE REPORT",11.5,"center",true));
c.push(drawText(10,22.5,`Report Date: ${new Date().toLocaleDateString("en-GB")}`,6.5,"left"));
c.push(drawText(148.5,22.5,`Range: ${rangeLabel}`,6.5,"center"));
c.push(drawText(287,22.5,marketerLabel,6.3,"right"));
let x=LEFT; columns.forEach(([heading,width])=>{ c.push(rectCmd(x,TABLE_TOP,width,9,.55,PDF_TABLE_HEAD)); c.push(drawWrapped(x,TABLE_TOP,width,9,heading,6.0,true)); x+=width; });
return {content:c,y:TABLE_TOP+9};
};
let page=newPage(); pages.push(page);
const drawRow=(values,isTotal=false)=>{
const counts=values.map((v,i)=>wrapText(v,columns[i][1]*MM-4*MM,isTotal?5.9:5.7).length); const h=Math.min(18,Math.max(8,2.8+Math.max(...counts)*3.05));
if(page.y+h>CONTENT_BOTTOM){page=newPage();pages.push(page);} let x=LEFT;
values.forEach((value,i)=>{const fill=isTotal?[.995,.945,.955]:null;page.content.push(rectCmd(x,page.y,columns[i][1],h,.42,fill));page.content.push(drawWrapped(x,page.y,columns[i][1],h,value,isTotal?5.9:5.7,isTotal));x+=columns[i][1];});
page.y+=h;
};
const drawCell=(x,top,width,height,value,bold=false,fill=null)=>{
page.content.push(rectCmd(x,top,width,height,.42,fill));
page.content.push(drawWrapped(x,top,width,height,value,5.5,bold));
};
const people=groupRowsByMarketerAndDate(rows,{getDateValue:(row)=>row.dateKey,getName:(row)=>row.marketerName,getPersonKey:(row)=>row.marketerEmail});
people.forEach((person,personIndex)=>{
const flat=[];
[...person.dates.entries()].forEach(([dateKey,entries])=>entries.forEach((row)=>flat.push({dateKey,row,serial:flat.length+1})));
let offset=0;
while(offset<flat.length){
let available=CONTENT_BOTTOM-page.y;
if(available<8){page=newPage();pages.push(page);available=CONTENT_BOTTOM-page.y;}
const chunk=[];let used=0;
for(let index=offset;index<flat.length;index++){
const entry=flat[index],row=entry.row;
const values=[entry.serial,row.time,row.dayIn,row.dayOut,Number(row.kms).toFixed(1).replace(/\.0$/, ""),Number(row.assignedKms).toFixed(1).replace(/\.0$/, ""),row.petrolRate === null ? "-" : `Rs. ${Number(row.petrolRate).toFixed(2)}`,`Rs. ${Number(row.petrolExpense).toFixed(2)}`,`Rs. ${Number(row.transport).toFixed(2)}`,`Rs. ${Number(row.nightStay).toFixed(2)}`,`Rs. ${Number(row.food).toFixed(2)}`,`Rs. ${Number(row.other).toFixed(2)}`,`Rs. ${Number(row.totalOtherExpense).toFixed(2)}`];
const height=Math.min(18,Math.max(8,2.8+Math.max(...values.map((value,column)=>wrapText(value,columns[column+3][1]*MM-4*MM,5.5).length))*3.05));
if(chunk.length&&used+height>available)break;
if(!chunk.length&&height>available)break;
chunk.push({...entry,values,height});used+=height;
}
if(!chunk.length){page=newPage();pages.push(page);continue;}
drawCell(LEFT,page.y,columns[0][1],used,personIndex+1,true,[.985,.985,.985]);
drawCell(LEFT+columns[0][1],page.y,columns[1][1],used,person.name,true,[.985,.985,.985]);
let y=page.y,cursor=0;
while(cursor<chunk.length){
const dateKey=chunk[cursor].dateKey;let end=cursor,dateHeight=0;
while(end<chunk.length&&chunk[end].dateKey===dateKey){dateHeight+=chunk[end].height;end++;}
drawCell(LEFT+columns[0][1]+columns[1][1],y,columns[2][1],dateHeight,formatActionPlanDate(dateKey),true,[.985,.985,.985]);
for(let index=cursor;index<end;index++){
const entry=chunk[index];let x=LEFT+columns.slice(0,3).reduce((sum,column)=>sum+column[1],0);
entry.values.forEach((value,column)=>{drawCell(x,y,columns[column+3][1],entry.height,value);x+=columns[column+3][1];});
y+=entry.height;
}
cursor=end;
}
page.y+=used;offset+=chunk.length;
}
});
const totalKms=rows.reduce((s,r)=>s+Number(r.kms||0),0), totalPetrol=rows.reduce((s,r)=>s+Number(r.petrolExpense||0),0), totalTransport=rows.reduce((s,r)=>s+Number(r.transport||0),0), totalNight=rows.reduce((s,r)=>s+Number(r.nightStay||0),0), totalFood=rows.reduce((s,r)=>s+Number(r.food||0),0), totalOther=rows.reduce((s,r)=>s+Number(r.other||0),0), totalAll=rows.reduce((s,r)=>s+Number(r.totalOtherExpense||0),0);
drawRow(["","","TOTAL","","","","",`${totalKms.toFixed(1)} KMs`,"","",`Rs. ${totalPetrol.toFixed(2)}`,`Rs. ${totalTransport.toFixed(2)}`,`Rs. ${totalNight.toFixed(2)}`,`Rs. ${totalFood.toFixed(2)}`,`Rs. ${totalOther.toFixed(2)}`,`Rs. ${totalAll.toFixed(2)}`],true);
pages.forEach((pg,idx)=>{pg.content.push(rectCmd(LEFT,197,RIGHT-LEFT,10,.45,PDF_FOOTER));pg.content.push(drawText(148.5,203,"Created by Ali Ashfaq",7.5,"center",true));pg.content.push(drawText(10,203,"Admin Expense Report",6.3,"left"));pg.content.push(drawText(287,203,`Page ${idx+1} of ${pages.length}`,6.3,"right"));});
const objects=[]; const addObject=(body)=>{objects.push(body);return objects.length;}; const f1=addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"), f2=addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"); const contentIds=[],pageIds=[];
pages.forEach((pg)=>{const stream=pg.content.join("\n")+"\n";contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));pageIds.push(0);}); const pagesId=addObject("");
pages.forEach((pg,i)=>{pageIds[i]=addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`);}); objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pages.length} >>`; const root=addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
let pdf="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; const offsets=[0]; objects.forEach((obj,i)=>{offsets[i+1]=pdf.length;pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;}); const xref=pdf.length; pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`; for(let i=1;i<=objects.length;i++) pdf+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`; pdf+=`trailer\n<< /Size ${objects.length+1} /Root ${root} 0 R >>\nstartxref\n${xref}\n%%EOF`;
const bytes=new Uint8Array(pdf.length);for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&0xff;const blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob);const safeName=String(marketerLabel).replace(/[^a-z0-9_-]+/gi,"_");const a=document.createElement("a");a.href=url;a.download=`Expense_Report_${safeName}_${adminExpenseFromDate}_to_${adminExpenseToDate}.pdf`;a.style.display="none";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
} catch (err) { console.error("Admin expense PDF error:", err); alert("Expense PDF could not be downloaded. Please try again."); }
};
return { expenseReportFromDate, setExpenseReportFromDate, expenseReportToDate, setExpenseReportToDate, expenseReportLoading, getMarketerExpensePetrol, adminExpenseFromDate, setAdminExpenseFromDate, adminExpenseToDate, setAdminExpenseToDate, adminExpenseMarketerIds, setAdminExpenseMarketerIds, adminExpenseRows, setAdminExpenseRows, adminExpenseLoading, fetchMarketerExpenseReport, openExpenseReport, getFilteredExpenseReportRows, downloadExpenseReportExcel, downloadExpenseReportPDF, fetchAdminExpenseReport, openAdminExpenseReport, getFilteredAdminExpenseRows, getAdminExpenseValues, getAdminExpenseMarketerName, downloadAdminExpenseExcel, downloadAdminExpensePDF };
}
