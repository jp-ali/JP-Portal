import test from "node:test";
import assert from "node:assert/strict";
import { rowsForVisitImport, suggestVisitColumns } from "./visitImport.js";

test("visit import maps heading-based school, city and original visit date", () => {
  const preview = {
    headingRow: 0,
    headings: [{ index: 0, label: "Visit Date" }, { index: 1, label: "School Name" }, { index: 2, label: "City" }],
    rows: [["25/10/2026", "City School", "Lahore"], ["26/10/2026", "Other School", "Kasur"]]
  };
  const rows = rowsForVisitImport(preview, suggestVisitColumns(preview.headings));
  assert.deepEqual(rows.map(({ date, schoolName, cityName, error }) => ({ date, schoolName, cityName, error })), [
    { date: "2026-10-25", schoolName: "City School", cityName: "Lahore", error: "" },
    { date: "2026-10-26", schoolName: "Other School", cityName: "Kasur", error: "" }
  ]);
});

test("visit import flags missing dates rather than assigning today's date", () => {
  const preview = { headingRow: 0, rows: [["", "School A"]] };
  assert.match(rowsForVisitImport(preview, { date: 0, schoolName: 1 })[0].error, /date/i);
  assert.match(rowsForVisitImport({ ...preview, rows: [["2026-02-30", "School A"]] }, { date: 0, schoolName: 1 })[0].error, /date/i);
});
