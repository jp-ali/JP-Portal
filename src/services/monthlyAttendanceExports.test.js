import assert from "node:assert/strict";
import test from "node:test";
import XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import { buildMonthlyAttendanceReport } from "../domain/monthlyAttendanceExport.js";
import { downloadMonthlyAttendanceExcel, downloadMonthlyAttendancePDF } from "./monthlyAttendanceExports.js";

test("Excel has one coloured daily row per marketer and PDF has summary plus calendars", async () => {
  const report = buildMonthlyAttendanceReport("2026-06", [
    { id: "one", name: "Ali", designation: "Regional Manager", days: [{ date: "2026-06-01", startMarked: true }] },
    { id: "two", name: "Umar", designation: "Marketing Executive", days: [{ date: "2026-06-02", status: "leave" }] }
  ], [{ date: "2026-06-05", name: "Holiday" }], new Date(2026, 5, 15));
  let workbook;
  let pdf;
  const originalWriteFile = XLSX.writeFile;
  const originalSave = jsPDF.API.save;
  globalThis.window = { XLSX };
  XLSX.writeFile = (value) => { workbook = value; };
  jsPDF.API.save = function save() { pdf = this; };
  try {
    await downloadMonthlyAttendanceExcel(report);
    const sheet = workbook.Sheets["Monthly Attendance"];
    assert.equal(workbook.SheetNames.length, 1);
    assert.equal(sheet.B2.v, "Ali");
    assert.equal(sheet.B3.v, "Umar");
    assert.equal(sheet.D2.v, "P");
    assert.equal(sheet.E3.v, "L");
    assert.equal(sheet.J2.s.fill.fgColor.rgb, "CDE6BE");
    assert.equal(sheet["!autofilter"].ref, "A1:AJ3");
    await downloadMonthlyAttendancePDF(report);
    assert.equal(pdf.internal.getNumberOfPages(), 3);
    assert.match(pdf.output(), /^%PDF-/);
  } finally {
    XLSX.writeFile = originalWriteFile;
    jsPDF.API.save = originalSave;
    delete globalThis.window;
  }
});

test("PDF export paginates a 500-marketer report", async () => {
  const report = buildMonthlyAttendanceReport("2026-06", Array.from({ length: 500 }, (_, index) => ({ id: `m${index}`, name: `Marketer ${index + 1}`, days: [] })), [], new Date(2026, 5, 15));
  let pages = 0;
  const originalSave = jsPDF.API.save;
  jsPDF.API.save = function save() { pages = this.internal.getNumberOfPages(); };
  try {
    await downloadMonthlyAttendancePDF(report);
    assert.ok(pages > 500, `Expected summary pages plus 500 calendars, got ${pages}`);
  } finally { jsPDF.API.save = originalSave; }
});
