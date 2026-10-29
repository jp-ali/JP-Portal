import test from "node:test";
import assert from "node:assert/strict";
import { visitTimeForDisplay } from "./visitTime.js";

test("imported visits without a recorded time do not display the internal noon timestamp", () => {
  const noon = new Date("2026-10-25T12:00:00+05:00");
  const createdAt = { toDate: () => noon };
  assert.equal(visitTimeForDisplay({ importSource: "admin", visitTime: "", createdAt }), null);
  assert.equal(visitTimeForDisplay({ importSource: "admin", visitTime: "09:30 AM", createdAt }), "09:30 AM");
  assert.equal(visitTimeForDisplay({ visitTime: "", createdAt }), noon);
});
