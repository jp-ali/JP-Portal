import assert from "node:assert/strict";
import test from "node:test";
import XLSX from "xlsx-js-style";
import { createReportExporters } from "./reportExports.js";

test("School Visits Excel follows the PDF columns and merged person/date groups", () => {
  let book;
  globalThis.window = { XLSX: { ...XLSX, writeFile: (value) => { book = value; } } };
  const makeVisit = (name, day, session, branches, strength) => ({
    marketerEmail: `${name.toLowerCase()}@example.com`, marketerName: name,
    createdAt: { toDate: () => new Date(`${day}T12:00:00Z`) },
    schoolName: "School", cityName: "Karachi", areaName: "Central",
    principalName: "Teacher", phone: "123", session, branches, strength,
    purpose: "Visit", notes: "Done"
  });
  const visits = [
    makeVisit("Ali", "2026-10-02", "Morning", "2", "200"),
    makeVisit("Ali", "2026-10-03", "Morning", "3", "300"),
    makeVisit("Ali", "2026-10-03", "Evening", "4", "400"),
    makeVisit("Hamza", "2026-10-04", "Morning", "1", "100")
  ];
  createReportExporters({ formatTime12: () => "12:00 PM", getMarketerName: (_email, name) => name }).downloadExcel(visits);
  const sheet = book.Sheets.Report;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  assert.deepEqual(rows[2], ["Sr.", "Name", "Visit Date", "Sr#", "City", "Area", "School Name", "Contact Person", "Phone No", "Visit Time", "Session", "Branches", "Strength", "Purpose / Details", "Remarks"]);
  assert.deepEqual(rows.slice(3).map((row) => row[3]), [1, 2, 3, 1]);
  assert.deepEqual(rows.slice(3).map((row) => row.slice(10, 13)), [["Morning", "2", "200"], ["Morning", "3", "300"], ["Evening", "4", "400"], ["Morning", "1", "100"]]);
  assert.ok(sheet["!merges"].some((merge) => merge.s.r === 3 && merge.e.r === 5 && merge.s.c === 0));
  assert.ok(sheet["!merges"].some((merge) => merge.s.r === 4 && merge.e.r === 5 && merge.s.c === 2));
  assert.equal(sheet.A3.s.fill, undefined);
  assert.equal(sheet.E4.s.fill, undefined);
  assert.equal(sheet.A3.s.font.bold, true);
});
