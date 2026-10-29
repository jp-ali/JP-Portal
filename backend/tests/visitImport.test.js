import test from "node:test";
import assert from "node:assert/strict";
import { importVisitId, validateImportedVisit } from "../src/services/visitImportService.js";

test("historical visit dates are validated and retain marketer-specific duplicate IDs", () => {
  const row = validateImportedVisit({ date: "2024-05-12", schoolName: "Example School", cityName: "Lahore" });
  assert.equal(row.date, "2024-05-12");
  assert.equal(importVisitId("marketer-a", row), importVisitId("marketer-a", row));
  assert.notEqual(importVisitId("marketer-a", row), importVisitId("marketer-b", row));
  assert.throws(() => validateImportedVisit({ date: "2026-02-30", schoolName: "Example School" }), /valid date/);
  assert.throws(() => validateImportedVisit({ date: "", schoolName: "Example School" }), /valid date/);
});
