import { mergedReportSheet } from "./mergedReportSheet.js";
import { PDF_BANNER, PDF_TABLE_HEAD, PDF_FOOTER, pdfTextFill } from "./pdfTheme.js";

export function createReportExporters({ formatTime12, getMarketerName }) {
const downloadExcel = (dataList, filename = "Report.xlsx") => {
if (!window.XLSX) {
alert("Excel library is still loading. Please try again in a moment.");
return;
}
const formattedData = dataList.map((item, idx) => ({
"Sr.": idx + 1,
"School Name": item.schoolName,
"City": item.cityName || "N/A",
"Area": item.areaName || "N/A",
"Session": item.session || "N/A",
"Branches": item.branches || "N/A",
"Strength": item.strength || "N/A",
"Visit Time": formatTime12(item.visitTime || (item.createdAt && item.createdAt.toDate ? item.createdAt.toDate() : null)),
"Principal Name": item.principalName,
"Phone No": item.phone,
"Details / Purpose": item.purpose || item.sampleDetails || "N/A",
"Remarks": item.notes || "N/A",
"Marketer": getMarketerName(item.marketerEmail, item.marketerName || item.marketerEmail || "N/A"),
"Date": item.createdAt && item.createdAt.toDate ? item.createdAt.toDate().toLocaleDateString() : "N/A"
}));
const worksheet = mergedReportSheet(window.XLSX, formattedData, "School Visits Report");
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
window.XLSX.writeFile(workbook, filename);
};
const downloadPDF = (dataList) => {
try {
const rows = Array.isArray(dataList) ? dataList : [];
const clean = (v) => String(v ?? "N/A").replace(/[\r\n]+/g, " ").trim() || "N/A";
const ascii = (v) => clean(v).replace(/[^\x20-\x7E]/g, "?");
const isSampleReport = rows.some(r => r?.sampleDetails) && !rows.some(r => r?.purpose);
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MM = 72 / 25.4;
const LEFT = 7;
const RIGHT = 290;
const TABLE_TOP = 38;
const FOOTER_TOP = 202;
const CONTENT_BOTTOM = 193;
const columns = [
["Sr.", 7],
["Name", 24],
["Visit Date", 18],
["Sr#", 8],
["City", 20],
["Area", 24],
["School Name", 30],
["Contact Person", 25],
["Phone No", 20],
["Visit Time", 15],
["Session / B / S", 16],
["Purpose / Details", 34],
["Remarks", 42]
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
words.forEach(word => {
if (!line) { line = word; return; }
const candidate = `${line} ${word}`;
if (candidate.length <= maxChars) line = candidate;
else { lines.push(line); line = word; }
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
const drawWrapped = (xMm, topMm, wMm, hMm, txt, size = 6.5, align = "left", bold = false) => {
const lines = wrapText(txt, wMm * MM - 4 * MM, size);
const lineH = size * 1.22;
const maxLines = Math.max(1, Math.floor((hMm * MM - 2.2 * MM) / lineH));
const visible = lines.slice(0, maxLines);
if (lines.length > maxLines && visible.length) {
visible[visible.length - 1] = `${visible[visible.length - 1].slice(0, Math.max(1, visible[visible.length - 1].length - 4))}...`;
}
const blockH = visible.length * lineH;
const startTop = topMm + Math.max(1.7, (hMm * MM - blockH) / MM / 2 + size * 0.65 / MM);
return visible.map((line, i) => {
let tx = xMm + 2;
if (align === "center") tx = xMm + wMm / 2;
if (align === "right") tx = xMm + wMm - 2;
return drawText(tx, startTop + i * lineH / MM, line, size, align, bold);
}).join("\n");
};
const formatDate = (value) => value?.toDate
? value.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
: "N/A";
const formatTime = (item) => formatTime12(item?.visitTime || (item?.createdAt?.toDate ? item.createdAt.toDate() : null));
const grouped = [];
const personMap = new Map();
rows.forEach((item) => {
const name = getMarketerName(item.marketerEmail, item.marketerName || "N/A");
const date = formatDate(item.createdAt);
const personKey = `${String(item.marketerEmail || name).toLowerCase()}|${name}`;
if (!personMap.has(personKey)) {
const person = { name, dates: new Map() };
personMap.set(personKey, person);
grouped.push(person);
}
const person = personMap.get(personKey);
if (!person.dates.has(date)) person.dates.set(date, []);
person.dates.get(date).push(item);
});
const rowHeight = (item) => {
const values = [
item.cityName || "N/A",
item.areaName || "N/A",
item.schoolName || "N/A",
item.principalName || "N/A",
item.phone || "N/A",
formatTime(item),
`${item.session || "N/A"} / ${item.branches || "-"} / ${item.strength || "-"}`,
item.purpose || item.sampleDetails || "N/A",
item.notes || "N/A"
];
const widths = [20, 24, 30, 25, 20, 15, 16, 34, 42];
const sizes = [5.5, 5.5, 5.6, 5.6, 5.5, 5.4, 5.4, 5.5, 5.5];
const lineCounts = values.map((v, i) => wrapText(v, widths[i] * MM - 4 * MM, sizes[i]).length);
return Math.min(22, Math.max(8, 2.8 + Math.max(...lineCounts) * 3.15));
};
const pages = [];
const newPage = () => {
const c = [];
c.push(rectCmd(LEFT, 5, RIGHT - LEFT, 24, 0.55, PDF_BANNER));
c.push(drawText(148.5, 9, "JAVED PUBLISHERS", 18, "center", true));
c.push(drawText(148.5, 15.5, isSampleReport ? "SCHOOL SAMPLE REPORT" : "SCHOOL VISIT REPORT", 11.5, "center", true));
c.push(drawText(10, 22.5, `Report Date: ${new Date().toLocaleDateString("en-GB")}`, 6.5, "left", false));
c.push(drawText(148.5, 22.5, `Total Records: ${rows.length}`, 6.5, "center", false));
c.push(drawText(287, 22.5, "Official Visit Record", 6.5, "right", false));
let x = LEFT;
columns.forEach(([heading, width]) => {
c.push(rectCmd(x, TABLE_TOP, width, 9, 0.55, PDF_TABLE_HEAD));
c.push(drawWrapped(x, TABLE_TOP, width, 9, heading, 6.5, "center", true));
x += width;
});
return { content: c, y: TABLE_TOP + 9 };
};
let page = newPage();
pages.push(page);
const drawCell = (x, top, width, height, value, _align = "center", bold = false, size = 6.25, fill = null) => {
page.content.push(rectCmd(x, top, width, height, 0.42, fill));
page.content.push(drawWrapped(x, top, width, height, value, size, "center", bold));
};
const drawTopCell = (x, top, width, height, value, _align = "center", bold = true, size = 7.0, fill = null) => {
page.content.push(rectCmd(x, top, width, height, 0.42, fill));
const lines = wrapText(value, width * MM - 4 * MM, size);
const lineH = size * 1.22;
const maxLines = Math.max(1, Math.floor((height * MM - 2.5 * MM) / lineH));
const visible = lines.slice(0, maxLines);
if (lines.length > maxLines && visible.length) {
visible[visible.length - 1] = `${visible[visible.length - 1].slice(0, Math.max(1, visible[visible.length - 1].length - 4))}...`;
}
const startTop = top + 1.7;
visible.forEach((line, i) => {
page.content.push(drawText(x + width / 2, startTop + i * lineH / MM, line, size, "center", bold));
});
};
grouped.forEach((person, personIndex) => {
const dateEntries = [...person.dates.entries()];
let dateIndex = 0;
let entryOffset = 0;
const totalEntries = dateEntries.reduce((sum, [, entries]) => sum + entries.length, 0);
let remainingTotal = totalEntries;
while (remainingTotal > 0) {
let availableMm = CONTENT_BOTTOM - page.y;
if (availableMm < 8) {
page = newPage();
pages.push(page);
availableMm = CONTENT_BOTTOM - page.y;
}
const chunk = [];
let usedMm = 0;
let di = dateIndex;
let oi = entryOffset;
while (di < dateEntries.length) {
const [, entries] = dateEntries[di];
const item = entries[oi];
const h = rowHeight(item);
if (chunk.length && usedMm + h > availableMm) break;
if (!chunk.length && h > availableMm) break;
chunk.push({ date: dateEntries[di][0], item, height: h, srInDate: oi + 1 });
usedMm += h;
oi += 1;
if (oi >= entries.length) { di += 1; oi = 0; }
if (usedMm >= availableMm - 1) break;
}
if (!chunk.length) {
page = newPage();
pages.push(page);
continue;
}
const chunkHeight = usedMm;
const personFill = [0.985, 0.985, 0.985];
drawTopCell(LEFT, page.y, 7, chunkHeight, personIndex + 1, "center", true, 6.2, personFill);
drawTopCell(LEFT + 7, page.y, 24, chunkHeight, person.name, "left", true, 6.0, personFill);
let y = page.y;
let cursor = 0;
while (cursor < chunk.length) {
const date = chunk[cursor].date;
let end = cursor;
let dateHeight = 0;
while (end < chunk.length && chunk[end].date === date) {
dateHeight += chunk[end].height;
end += 1;
}
drawTopCell(38, y, 18, dateHeight, date, "center", true, 5.4, [0.985, 0.985, 0.985]);
for (let i = cursor; i < end; i++) {
const entry = chunk[i];
const item = entry.item;
const yy = y;
const fill = ((i - cursor) % 2 === 1) ? [0.995, 0.995, 0.995] : null;
drawCell(56, yy, 8, entry.height, entry.srInDate, "center", false, 5.4, fill);
drawCell(64, yy, 20, entry.height, item.cityName || "N/A", "left", false, 5.4, fill);
drawCell(84, yy, 24, entry.height, item.areaName || "N/A", "left", false, 5.4, fill);
drawCell(108, yy, 30, entry.height, item.schoolName || "N/A", "left", false, 5.5, fill);
drawCell(138, yy, 25, entry.height, item.principalName || "N/A", "left", false, 5.5, fill);
drawCell(163, yy, 20, entry.height, item.phone || "N/A", "left", false, 5.4, fill);
drawCell(183, yy, 15, entry.height, formatTime(item), "center", false, 5.3, fill);
drawCell(198, yy, 16, entry.height, `${item.session || "N/A"} / ${item.branches || "-"} / ${item.strength || "-"}`, "center", false, 5.3, fill);
drawCell(214, yy, 34, entry.height, item.purpose || item.sampleDetails || "N/A", "left", false, 5.4, fill);
drawCell(248, yy, 42, entry.height, item.notes || "N/A", "left", false, 5.4, fill);
y += entry.height;
}
cursor = end;
}
page.y = y;
dateIndex = di;
entryOffset = oi;
remainingTotal -= chunk.length;
}
});
if (!rows.length) {
page.content.push(drawText(148.5, page.y + 10, "No records found for the selected filters.", 8.5, "center", false));
}
pages.forEach((pg, idx) => {
pg.content.push(rectCmd(LEFT, 197, RIGHT - LEFT, 10, 0.45, PDF_FOOTER));
pg.content.push(drawText(148.5, 203, "Created by Ali Ashfaq", 7.5, "center", true));
pg.content.push(drawText(10, 203, isSampleReport ? "School Sample Report" : "School Visit Report", 6.3, "left", false));
pg.content.push(drawText(287, 203, `Page ${idx + 1} of ${pages.length}`, 6.3, "right", false));
});
const objects = [];
const addObject = (body) => { objects.push(body); return objects.length; };
const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const contentIds = [];
const pageIds = [];
pages.forEach(pg => {
const stream = pg.content.join("\n") + "\n";
contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
pageIds.push(0);
});
const pagesId = addObject("");
pages.forEach((pg, i) => {
pageIds[i] = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`);
});
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [0];
objects.forEach((obj, i) => {
offsets[i + 1] = pdf.length;
pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
});
const xref = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
const bytes = new Uint8Array(pdf.length);
for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
const blob = new Blob([bytes], { type: "application/pdf" });
const url = URL.createObjectURL(blob);
const stamp = new Date().toISOString().slice(0, 10);
const a = document.createElement("a");
a.href = url;
a.download = `${isSampleReport ? "School_Sample_Report" : "School_Visit_Report"}_${stamp}.pdf`;
a.style.display = "none";
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 2000);
} catch (err) {
console.error("PDF download error:", err);
alert("PDF download nahi ho saka. Please dobara try karein.");
}
};
const downloadSingleSample = (sample) => {
if (!sample) return;
const safeName = String(sample.schoolName || "Sample").replace(/[^a-z0-9_-]+/gi, "_");
downloadExcel([sample], `Sample_${safeName}.xlsx`);
};
const downloadMarketersExcel = (dataList, filename = "Marketer_Details.xlsx") => {
const rows = Array.isArray(dataList) ? dataList : [];
if (!rows.length) {
alert("No marketer details found to download.");
return;
}
if (!window.XLSX) {
alert("Excel library is still loading. Please try again in a moment.");
return;
}
const formattedData = rows.map((m, idx) => ({
"Sr.": idx + 1,
"Name": m.name || "N/A",
"Phone": m.phone || "N/A",
"Email": m.email || "N/A",
"Designation": m.designation || "Regional Manager",
"Assigned KMs / Litre": m.assignedKms || "N/A"
}));
const worksheet = mergedReportSheet(window.XLSX, formattedData, "Marketer Details Report");
worksheet["!cols"] = [
{ wch: 7 },
{ wch: 28 },
{ wch: 18 },
{ wch: 34 },
{ wch: 28 },
{ wch: 22 }
];
const workbook = window.XLSX.utils.book_new();
window.XLSX.utils.book_append_sheet(workbook, worksheet, "Marketer Details");
window.XLSX.writeFile(workbook, filename);
};
const downloadMarketersPDF = (dataList, filenameBase = "Marketer_Details_Report") => {
const rows = Array.isArray(dataList) ? dataList : [];
if (!rows.length) {
alert("No marketer details found to download.");
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
["Sr.", 10],
["Name", 64],
["Phone", 30],
["Email", 89],
["Designation", 50],
["Assigned KMs/L", 40]
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
if (!line) { line = word; return; }
const candidate = `${line} ${word}`;
if (candidate.length <= maxChars) line = candidate;
else { lines.push(line); line = word; }
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
const drawWrapped = (xMm, topMm, wMm, hMm, txt, size = 6.4, align = "left", bold = false) => {
const lines = wrapText(txt, wMm * MM - 4 * MM, size);
const lineH = size * 1.22;
const maxLines = Math.max(1, Math.floor((hMm * MM - 2.2 * MM) / lineH));
const visible = lines.slice(0, maxLines);
if (lines.length > maxLines && visible.length) {
visible[visible.length - 1] = `${visible[visible.length - 1].slice(0, Math.max(1, visible[visible.length - 1].length - 4))}...`;
}
const blockH = visible.length * lineH;
const startTop = topMm + Math.max(1.7, (hMm * MM - blockH) / MM / 2 + size * 0.65 / MM);
return visible.map((line, i) => {
let tx = xMm + 2;
if (align === "center") tx = xMm + wMm / 2;
if (align === "right") tx = xMm + wMm - 2;
return drawText(tx, startTop + i * lineH / MM, line, size, align, bold);
}).join("\n");
};
const rowHeight = (m) => {
const values = [
m.name || "N/A",
m.phone || "N/A",
m.email || "N/A",
m.designation || "Regional Manager",
m.assignedKms || "N/A"
];
const widths = [64, 30, 89, 50, 40];
const sizes = [6.2, 6.1, 6.0, 6.1, 6.1];
const counts = values.map((v, i) => wrapText(v, widths[i] * MM - 4 * MM, sizes[i]).length);
return Math.min(22, Math.max(9, 3.0 + Math.max(...counts) * 3.2));
};
const pages = [];
const newPage = () => {
const c = [];
c.push(rectCmd(LEFT, 5, RIGHT - LEFT, 24, 0.55, PDF_BANNER));
c.push(drawText(148.5, 9, "JAVED PUBLISHERS", 18, "center", true));
c.push(drawText(148.5, 15.5, "MARKETER DETAILS REPORT", 11.5, "center", true));
c.push(drawText(10, 22.5, `Report Date: ${new Date().toLocaleDateString("en-GB")}`, 6.5, "left", false));
c.push(drawText(148.5, 22.5, `Total Marketers: ${rows.length}`, 6.5, "center", false));
c.push(drawText(287, 22.5, "Official Marketer Record", 6.3, "right", false));
let x = LEFT;
columns.forEach(([heading, width]) => {
c.push(rectCmd(x, TABLE_TOP, width, 9, 0.55, PDF_TABLE_HEAD));
c.push(drawWrapped(x, TABLE_TOP, width, 9, heading, 6.4, "center", true));
x += width;
});
return { content: c, y: TABLE_TOP + 9 };
};
let page = newPage();
pages.push(page);
const drawCell = (x, top, width, height, value, _align = "center", bold = false, size = 6.1, fill = null) => {
page.content.push(rectCmd(x, top, width, height, 0.42, fill));
page.content.push(drawWrapped(x, top, width, height, value, size, "center", bold));
};
rows.forEach((m, index) => {
const h = rowHeight(m);
if (page.y + h > CONTENT_BOTTOM) {
page = newPage();
pages.push(page);
}
const fill = index % 2 === 1 ? [0.995, 0.995, 0.995] : null;
let x = LEFT;
drawCell(x, page.y, 10, h, index + 1, "center", false, 6.0, fill); x += 10;
drawCell(x, page.y, 64, h, m.name || "N/A", "left", true, 6.2, fill); x += 64;
drawCell(x, page.y, 30, h, m.phone || "N/A", "left", false, 6.1, fill); x += 30;
drawCell(x, page.y, 89, h, m.email || "N/A", "left", false, 6.0, fill); x += 89;
drawCell(x, page.y, 50, h, m.designation || "Regional Manager", "left", false, 6.1, fill); x += 50;
drawCell(x, page.y, 40, h, m.assignedKms || "N/A", "center", false, 6.1, fill);
page.y += h;
});
pages.forEach((pg, idx) => {
pg.content.push(rectCmd(LEFT, 197, RIGHT - LEFT, 10, 0.45, PDF_FOOTER));
pg.content.push(drawText(148.5, 203, "Created by Ali Ashfaq", 7.5, "center", true));
pg.content.push(drawText(10, 203, "Marketer Details Report", 6.3, "left", false));
pg.content.push(drawText(287, 203, `Page ${idx + 1} of ${pages.length}`, 6.3, "right", false));
});
const objects = [];
const addObject = (body) => { objects.push(body); return objects.length; };
const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const contentIds = [];
const pageIds = [];
pages.forEach((pg) => {
const stream = pg.content.join("\n") + "\n";
contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
pageIds.push(0);
});
const pagesId = addObject("");
pages.forEach((pg, i) => {
pageIds[i] = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`);
});
objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [0];
objects.forEach((obj, i) => {
offsets[i + 1] = pdf.length;
pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
});
const xref = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
const bytes = new Uint8Array(pdf.length);
for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
const blob = new Blob([bytes], { type: "application/pdf" });
const url = URL.createObjectURL(blob);
const stamp = new Date().toISOString().slice(0, 10);
const a = document.createElement("a");
a.href = url;
a.download = `${filenameBase}_${stamp}.pdf`;
a.style.display = "none";
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 2000);
} catch (err) {
console.error("Marketer PDF error:", err);
alert("Marketer PDF could not be downloaded. Please try again.");
}
};

return { downloadExcel, downloadPDF, downloadSingleSample, downloadMarketersExcel, downloadMarketersPDF };
}
