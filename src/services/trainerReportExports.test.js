import test from "node:test";
import assert from "node:assert/strict";
import { trainerReportTable, trainerWeeklyPDFTable } from "./trainerReportExports.js";

test("trainer reports include only selected rows and public fields", () => {
  const selected = [{ date: "2026-11-07", trainerName: "Ayesha", area: "North", purpose: "School training", passwordHash: "secret" }];
  const all = trainerReportTable("weekly", selected, { showTrainer: true });
  const own = trainerReportTable("weekly", selected, { showTrainer: false });
  assert.equal(all.rows.length, 1);
  assert.ok(all.headers.includes("Trainer"));
  assert.ok(!own.headers.includes("Trainer"));
  assert.ok(!JSON.stringify(all).includes("secret"));
});

test("attendance and details exports use report specific fields", () => {
  const attendance = trainerReportTable("attendance", [{ date: "2026-11-07", status: "present", checkInAt: "2026-11-07T04:00:00Z" }], { showTrainer: false, compactAttendance: true });
  assert.deepEqual(attendance.headers, ["#", "Date", "Status", "Start Time"]);
  assert.match(attendance.rows[0][3], /9:00/);
  const ownAttendance = trainerReportTable("attendance", [{ date: "2026-11-07", status: "leave", remarks: "Sick" }], { showTrainer: false });
  assert.equal(ownAttendance.rows[0].at(-1), "Sick");
  const details = trainerReportTable("details", [{ name: "Ayesha", email: "ayesha@example.com", active: true, passwordHash: "secret" }]);
  assert.equal(details.rows[0].at(-1), "Active");
  assert.ok(!JSON.stringify(details).includes("secret"));
});

test("weekly export includes each date in the selected range", () => {
  const selected = [{ date: "2026-11-02", toDate: "2026-11-04", trainerName: "Ayesha", days: [
    { date: "2026-11-02", area: "North", purpose: "First visit" },
    { date: "2026-11-03", area: "South", purpose: "Training" },
    { date: "2026-11-04", area: "East", purpose: "Follow up" }
  ] }];
  const report = trainerReportTable("weekly", selected, { showTrainer: true });
  assert.deepEqual(report.rows.map((row) => row[1]), ["2026-11-02", "2026-11-03", "2026-11-04"]);
  assert.ok(report.rows.every((row) => row[2] === "2026-11-02 - 2026-11-04"));
  assert.ok(report.rows.every((row) => row[3] === "Ayesha"));
  const pdf = trainerReportTable("weekly", selected, { showTrainer: true, splitWeeklyDates: true });
  assert.deepEqual(pdf.headers, ["#", "Date", "From Date", "To Date", "Trainer", "Area", "Purpose"]);
  assert.ok(pdf.rows.every((row) => row[2] === "2026-11-02" && row[3] === "2026-11-04"));
  assert.ok(pdf.rows.every((row) => row[4] === "Ayesha"));
  const weeklyPdf = trainerWeeklyPDFTable(selected);
  assert.deepEqual(weeklyPdf.headers, ["#", "Trainer", "Date", "Area", "Purpose"]);
  assert.equal(weeklyPdf.range, "From Date: 2026-11-02     To Date: 2026-11-04");
  assert.deepEqual(weeklyPdf.body[0][1], { content: "Ayesha", rowSpan: 3, styles: { valign: "top" } });
  assert.deepEqual(weeklyPdf.body.map((row) => row.length), [5, 4, 4]);
});

test("trainer visit exports include visit columns without image data", () => {
  const report = trainerReportTable("visits", [{ date: "2026-11-07", trainerName: "Ayesha", schoolName: "City School", cityName: "Lahore", areaName: "North", image: "private-photo-data" }], { showTrainer: true });
  assert.ok(report.headers.includes("School Name"));
  assert.ok(report.headers.includes("Trainer"));
  assert.ok(!report.headers.some((header) => ["Area", "Purpose", "Session", "Branches", "Strength"].includes(header)));
  assert.equal(report.rows[0][report.headers.indexOf("School Name")], "City School");
  assert.ok(!JSON.stringify(report).includes("private-photo-data"));
});

test("trainer expense exports show trainer, category and proof status without photo data", () => {
  const expense = { date: "2026-11-07", trainerName: "Ayesha", category: "Other", otherCategory: "Printing", description: "Handouts", amount: 125.5, proofAvailable: true, proof: "private-photo-data" };
  const admin = trainerReportTable("today-expenses", [expense], { showTrainer: true });
  const own = trainerReportTable("my-expenses", [expense], { showTrainer: false });
  assert.ok(admin.headers.includes("Trainer"));
  assert.ok(!own.headers.includes("Trainer"));
  assert.ok(admin.rows[0].includes("Other: Printing"));
  assert.ok(admin.rows[0].includes("Attached"));
  assert.ok(!JSON.stringify(admin).includes("private-photo-data"));
});
