import assert from "node:assert/strict";
import test from "node:test";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import XLSX from "xlsx-js-style";
import { buildImportPayload, matrixToImportPreview, pdfLines, pdfPagesToImportPreview, readImportFile, savedReportToImportPreview } from "./reportImport.js";
import { buildCustomReportPdf } from "./customReportExports.js";

test("Excel export title and download line are skipped before importing selected columns", () => {
  const preview = matrixToImportPreview([
    ["School Contacts"],
    ["", "", "Downloaded: 22/10/2026"],
    ["Date", "Name", "City", "Number", "Private Note"],
    ["22/10/2026", "Ali", "Lahore", "+923001234567", "ignore"],
    ["23/10/2026", "Sara", "Karachi", "+923009876543", "ignore"]
  ], "contacts.xlsx");
  assert.deepEqual(preview.headings.map((item) => item.label), ["Date", "Name", "City", "Number", "Private Note"]);
  const payload = buildImportPayload(preview, [0, 1, 2, 3], "Contacts", "2026-10-22");
  assert.deepEqual(payload.columns.map((item) => item.label), ["Date", "Name", "City", "Number"]);
  assert.equal(payload.rows[0].date, "2026-10-22");
  assert.equal(payload.rows[1].city, "Karachi");
  assert.equal(payload.rows[0].private_note, undefined);
  assert.deepEqual(payload.options.filterKeys, ["city"]);
  assert.equal(payload.options.hideDate, true);
});

test("imported marketer column is available for verification grouping", () => {
  const preview = matrixToImportPreview([
    ["Marketer", "School Name", "Phone"],
    ["Ali", "City School", "03001234567"]
  ]);
  const payload = buildImportPayload(preview, [0, 1, 2], "Schools", "2026-10-22");
  assert.equal(payload.options.includeMarketers, true);
  assert.equal(payload.rows[0].marketer, "Ali");
  assert.equal(payload.rows[0].phone, "03001234567");
});

test("merged date and name cells carry through imported rows", () => {
  const preview = matrixToImportPreview([
    ["Date", "Name", "City"],
    ["22/10/2026", "Ali", "Lahore"],
    ["", "", "Karachi"]
  ]);
  const payload = buildImportPayload(preview, [0, 1, 2], "Merged", "2026-10-22");
  assert.equal(payload.rows[1].date, "2026-10-22");
  assert.equal(payload.rows[1].name, "Ali");
});

test("selectable PDF table text becomes importable columns and rows", async () => {
  const pdf = new jsPDF();
  [["Name", "City", "Number"], ["Ali", "Lahore", "03001234567"]].forEach((row, rowIndex) => row.forEach((value, columnIndex) => pdf.text(value, 20 + columnIndex * 50, 20 + rowIndex * 10)));
  const document = await pdfjs.getDocument({ data: new Uint8Array(pdf.output("arraybuffer")) }).promise;
  const page = await document.getPage(1);
  const preview = pdfPagesToImportPreview([pdfLines((await page.getTextContent()).items)], "contacts.pdf");
  assert.deepEqual(preview.headings.map((item) => item.label), ["Name", "City", "Number"]);
  assert.deepEqual(preview.rows[0].slice(0, 3), ["Ali", "Lahore", "03001234567"]);
});

test("an XLSX workbook is read from a selected file", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Name", "City"], ["Ali", "Lahore"]]), "Contacts");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const preview = await readImportFile(new File([bytes], "contacts.xlsx"));
  assert.equal(preview.rows[0][1], "Lahore");
});

test("a CSV report can be imported without an Excel-only file restriction", async () => {
  const preview = await readImportFile(new File(["Name,City,Number\nAli,Lahore,03001234567\nSara,Karachi,03007654321\n"], "contacts.csv"));
  assert.equal(preview.rows.length, 2);
  assert.deepEqual(preview.rows[1].slice(0, 3), ["Sara", "Karachi", "03007654321"]);
});

test("imported PDF has row numbers, no date column, and fills its first page", async () => {
  const report = {
    title: "Imported Contacts", date: "2026-10-22",
    options: { hideDate: true },
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "name", label: "Name", type: "text" },
      { key: "city", label: "City", type: "text" }
    ]
  };
  const rows = Array.from({ length: 54 }, (_, index) => ({ date: "2026-10-22", name: `Person ${index + 1}`, city: index % 2 ? "Karachi" : "Lahore" }));
  const pdf = await buildCustomReportPdf(report, rows);
  const document = await pdfjs.getDocument({ data: new Uint8Array(pdf.output("arraybuffer")) }).promise;
  const firstPage = await document.getPage(1);
  const pageText = (await firstPage.getTextContent()).items.map((item) => item.str).join(" ");
  assert.match(pageText, /Sr\./);
  assert.doesNotMatch(pageText, /\bDate\b/);
  assert.match(pageText, /Person 1/);
  assert.match(pageText, /Person 5/);
});

test("verification PDF does not move a long merged group off its first page", async () => {
  const report = {
    title: "Verification", date: "2026-10-22", verificationLayout: true, options: { hideDate: true },
    columns: [
      { key: "verificationGroupSr", label: "Sr.", type: "text" },
      { key: "verificationMarketerName", label: "Marketer Name", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "verificationSerial", label: "Sr#", type: "text" },
      { key: "name", label: "Name", type: "text" }
    ]
  };
  const rows = Array.from({ length: 54 }, (_, index) => ({
    date: "2026-10-22", verificationGroup: "ali", verificationGroupSr: 1,
    verificationMarketerName: "Ali", verificationSerial: index + 1, name: `School ${index + 1}`
  }));
  const pdf = await buildCustomReportPdf(report, rows);
  const document = await pdfjs.getDocument({ data: new Uint8Array(pdf.output("arraybuffer")) }).promise;
  const firstPage = await document.getPage(1);
  const pageText = (await firstPage.getTextContent()).items.map((item) => item.str).join(" ");
  assert.match(pageText, /School 1/);
  assert.match(pageText, /School 5/);
  assert.match(pageText, /\bDate\b/);
});

test("all cities survive a multi-page PDF table import", async () => {
  const pdf = new jsPDF();
  const cities = ["Lahore", "Karachi", "Faisalabad", "Multan"];
  pdf.text("City report", 20, 20);
  autoTable(pdf, {
    startY: 80,
    head: [["Date", "Name", "Number", "City", "Institute", "Remarks"]],
    body: Array.from({ length: 54 }, (_, index) => ["22/10/2026", `Person ${index + 1}`, `0300${String(index).padStart(7, "0")}`, cities[index % cities.length], `School ${index + 1}`, "Contacted"]),
    theme: "grid",
    styles: { fontSize: 8.5, cellPadding: 5, overflow: "linebreak", valign: "top", halign: "center" },
    margin: { left: 22, right: 22, top: 30, bottom: 42 }
  });
  const document = await pdfjs.getDocument({ data: new Uint8Array(pdf.output("arraybuffer")) }).promise;
  const pages = [];
  for (let index = 1; index <= document.numPages; index++) pages.push(pdfLines((await (await document.getPage(index)).getTextContent()).items));
  const preview = pdfPagesToImportPreview(pages, "all-cities.pdf");
  const cityIndex = preview.headings.find((item) => item.label === "City")?.index;
  assert.equal(preview.rows.length, 54);
  assert.deepEqual(new Set(preview.rows.map((row) => row[cityIndex])), new Set(cities));
});

test("a saved report imports every city instead of a filtered PDF subset", () => {
  const report = { title: "Ads", date: "2026-10-20", rows: [
    { name: "A", city: "Lahore", number: "1" },
    { name: "B", city: "Karachi", number: "2" },
    { name: "C", city: "Multan", number: "3" }
  ] };
  const preview = savedReportToImportPreview(report);
  const payload = buildImportPayload(preview, preview.headings.map(({ index }) => index), "All Cities", "2026-10-22");
  assert.equal(payload.rows.length, 3);
  assert.deepEqual(payload.rows.map((row) => row.city), ["Lahore", "Karachi", "Multan"]);
});
