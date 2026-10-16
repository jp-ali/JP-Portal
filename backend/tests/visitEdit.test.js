import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditVisit, dateInPakistan } from "../src/controllers/visitController.js";

const createdAt = new Date("2026-10-15T20:30:00Z"); // 16 October in Pakistan
const visit = { marketerId: "marketer-1", marketerEmail: "one@example.test", createdAt };

test("marketer can edit only their own visit on its Pakistan calendar date", () => {
  const marketer = { role: "marketer", marketerId: "marketer-1", email: "one@example.test" };
  assert.equal(dateInPakistan(createdAt), "2026-10-16");
  assert.equal(canEditVisit(marketer, visit, new Date("2026-10-16T18:59:00Z")), true);
  assert.equal(canEditVisit(marketer, visit, new Date("2026-10-16T19:00:00Z")), false);
  assert.equal(canEditVisit({ ...marketer, marketerId: "marketer-2" }, visit, createdAt), false);
});

test("admin can edit older visits", () => {
  assert.equal(canEditVisit({ role: "admin" }, visit, new Date("2026-11-01T00:00:00Z")), true);
});
