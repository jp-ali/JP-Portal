import assert from "node:assert/strict";
import test from "node:test";
import { createExpenseNewsPdf, expenseNewsRows } from "../src/services/expenseNewsPdf.js";

test("expense news calculates a marketer's rows and creates a complete PDF", async () => {
  const rows = expenseNewsRows([
    { date: "2026-10-24", startReading: 10, endReading: 24, transportExpense: 50, nightStayExpense: 20 }
  ], { name: "Ali", assignedKms: 14 }, { "2026-10-24": 200 });
  assert.equal(rows[0].petrol, 200);
  assert.equal(rows[0].simpleTotal, 70);
  const pdf = await createExpenseNewsPdf({
    marketer: { name: "Ali" }, rows, fromDate: "2026-10-24", toDate: "2026-10-24"
  });
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 2000);
  assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
});

test("expense news continues onto another PDF page when rows do not fit", async () => {
  const rows = expenseNewsRows(Array.from({ length: 25 }, (_, index) => ({
    date: `2026-10-${String(index + 1).padStart(2, "0")}`,
    startReading: index * 10,
    endReading: index * 10 + 5
  })), { name: "Ali", assignedKms: 14 }, {});
  const pdf = await createExpenseNewsPdf({ marketer: { name: "Ali" }, rows, fromDate: "2026-10-01", toDate: "2026-10-25" });
  assert.ok((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length > 1);
});
