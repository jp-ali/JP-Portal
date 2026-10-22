import assert from "node:assert/strict";
import test from "node:test";
import { jsPDF } from "jspdf";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import XLSX from "xlsx-js-style";
import { buildImportPayload, matrixToImportPreview, pdfLines, pdfPagesToImportPreview, readImportFile } from "./reportImport.js";

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
