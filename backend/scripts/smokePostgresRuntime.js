import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { app } from "../src/app.js";
import { postgresDocumentStore } from "../src/db/postgresDocumentStore.js";
import { closePostgresPool, postgresPool } from "../src/config/postgres.js";
import { Timestamp } from "../src/db/documentValues.js";
import { importVisitId, importVisitsForMarketer, validateImportedVisit } from "../src/services/visitImportService.js";
import { makeAreaId, makeCityId } from "../../src/domain/catalog.js";
import { assignedCityText } from "../src/services/marketerCardService.js";

process.env.PORTAL_DATA_BACKEND = "postgres";
process.env.ADMIN_EMAIL = "migration-smoke-admin@example.test";
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("migration-smoke-password", 4);

const store = postgresDocumentStore();
const suffix = randomUUID().replaceAll("-", "");
const marketerId = `probe_${suffix}`;
const marketerEmail = `${marketerId}@example.test`;
const own = store.collection("attendance").doc(`own_${suffix}`);
const other = store.collection("attendance").doc(`other_${suffix}`);
const actionPlan = store.collection("action_plans").doc(`probe_${suffix}`);
const catalogue = store.collection("catalogues").doc(`probe_${suffix}`);
const account = store.collection("marketers").doc(marketerId);
const faisalabadId = makeCityId("Faisalabad");
const manualArea = store.collection("areas").doc(makeAreaId(faisalabadId, `Smoke Area ${suffix}`));
let createdMarketerId;
let createdNewsId;
let createdExpenseNewsId;
let createdReportId;
const offlineVisit = store.collection("visits").doc(`offline-${suffix}`);
const visitRows = [
  { date: "2026-10-20", schoolName: `Migration School A ${suffix}`, cityName: "Lahore", areaName: "Model Town" },
  { date: "2026-10-21", schoolName: `Migration School B ${suffix}`, cityName: "Lahore", areaName: "Model Town" }
];
const visitRefs = visitRows.map((row) => store.collection("visits").doc(importVisitId(marketerId, validateImportedVisit(row))));
const server = app.listen(0);
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const json = { "content-type": "application/json" };

async function login(identifier, password) {
  const response = await fetch(`${base}/api/auth/login`, { method: "POST", headers: json, body: JSON.stringify({ identifier, password }) });
  assert.equal(response.status, 200, `Login failed: ${response.status}`);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  return cookie.split(";")[0];
}

try {
  await account.set({ name: "Migration probe", email: marketerEmail, phone: `03${suffix.slice(0, 9)}`,
    passwordHash: bcrypt.hashSync("marketer-smoke-password", 4), assignedCityIds: [], assignedAreaIds: [] });
  await own.set({ marketerId, marketerEmail, status: "present" });
  await other.set({ marketerId: "someone-else", marketerEmail: "someone-else@example.test", status: "absent" });
  assert.deepEqual(await importVisitsForMarketer(marketerId, visitRows), { created: 2, skipped: 0 });
  assert.deepEqual(await importVisitsForMarketer(marketerId, visitRows), { created: 0, skipped: 2 });
  assert.ok((await visitRefs[0].get()).data().createdAt.toDate() instanceof Date);

  const adminCookie = await login(process.env.ADMIN_EMAIL, "migration-smoke-password");
  const marketerCookie = await login(marketerEmail, "marketer-smoke-password");
  assert.equal(await assignedCityText([faisalabadId]), "Faisalabad");
  const areas = await fetch(`${base}/api/data/query`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ collectionPath: "areas", filters: [{ field: "cityId", operator: "==", value: faisalabadId }] })
  });
  assert.equal(areas.status, 200, `Area query failed: ${areas.status}`);
  assert.ok((await areas.json()).docs.length > 100, "Faisalabad area catalog is empty");
  const addedArea = await fetch(`${base}/api/data/document?path=${encodeURIComponent(manualArea.path)}`, {
    method: "PUT", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ data: { name: `Smoke Area ${suffix}`, cityId: faisalabadId, cityName: "Faisalabad" } })
  });
  assert.equal(addedArea.status, 200, `Manual area add failed: ${addedArea.status}`);
  assert.ok((await manualArea.get()).exists);
  const createdEmail = `created_${suffix}@example.test`;
  const created = await fetch(`${base}/api/marketers`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ name: "Created marketer", email: createdEmail, phone: "03001234567", password: "created-smoke-password", cardCity: "Faisalabad", showCardCity: true })
  });
  assert.equal(created.status, 201, `Create marketer failed: ${created.status}`);
  createdMarketerId = (await created.json()).marketer.id;
  const createdCard = store.collection("savedCards").doc(createdMarketerId);
  assert.equal((await createdCard.get()).data().values.assignedCity, "Faisalabad");
  const hideCity = await fetch(`${base}/api/marketers/${createdMarketerId}`, {
    method: "PATCH", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ showCardCity: false })
  });
  assert.equal(hideCity.status, 200);
  assert.equal((await createdCard.get()).data().values.assignedCity, "");
  const showCity = await fetch(`${base}/api/marketers/${createdMarketerId}`, {
    method: "PATCH", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ showCardCity: true, cardCity: "Lahore" })
  });
  assert.equal(showCity.status, 200);
  assert.equal((await createdCard.get()).data().values.assignedCity, "Lahore");
  const createdCookie = await login(createdEmail, "created-smoke-password");
  assert.equal((await fetch(`${base}/api/auth/me`, { headers: { cookie: createdCookie } })).status, 200);
  const cardResponse = await fetch(`${base}/api/cards/me`, { headers: { cookie: createdCookie } });
  assert.equal(cardResponse.status, 200, `Marketer card load failed: ${cardResponse.status}`);
  const loadedCard = (await cardResponse.json()).card;
  assert.equal(loadedCard.marketerId, createdMarketerId);
  assert.equal(loadedCard.values.assignedCity, "Lahore");
  const photo = await fetch(`${base}/api/marketers/me/photo`, {
    method: "PUT", headers: { ...json, cookie: createdCookie },
    body: JSON.stringify({ photo: `data:image/jpeg;base64,${Buffer.from("test-photo").toString("base64")}` })
  });
  assert.equal(photo.status, 200, `Marketer photo failed: ${photo.status}`);
  assert.ok((await store.collection("marketers").doc(createdMarketerId).get()).data().profilePhoto);
  const admin = await fetch(`${base}/api/auth/me`, { headers: { cookie: adminCookie } });
  assert.equal((await admin.json()).user.role, "admin");
  const marketer = await fetch(`${base}/api/auth/me`, { headers: { cookie: marketerCookie } });
  assert.equal((await marketer.json()).user.marketerId, marketerId);
  const summary = await fetch(`${base}/api/visits/summary`, { headers: { cookie: marketerCookie } });
  assert.equal(summary.status, 200);
  assert.equal((await summary.json()).summary.visits, 2);
  const offlineWrite = await fetch(`${base}/api/data/document?path=${encodeURIComponent(offlineVisit.path)}`, {
    method: "PUT", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: {
      marketerId, marketerEmail, marketerName: "Migration probe", schoolName: "Offline Smoke School",
      cityName: "Lahore", areaName: "Model Town", image: "data:image/jpeg;base64,dGVzdA==",
      offlineVisit: true, createdAt: Timestamp.fromDate(new Date("2026-10-20T08:00:00+05:00"))
    } })
  });
  assert.equal(offlineWrite.status, 200, `Offline visit upload failed: ${offlineWrite.status}`);
  assert.equal((await offlineVisit.get()).data().offlineVisit, true);
  const otherOfflineRead = await fetch(`${base}/api/data/document?path=${encodeURIComponent(offlineVisit.path)}`, {
    headers: { cookie: createdCookie }
  });
  assert.equal(otherOfflineRead.status, 403);
  for (const route of ["/api/marketers", "/api/custom-reports", "/api/news", "/api/news/schedules"]) {
    const response = await fetch(`${base}${route}`, { headers: { cookie: adminCookie } });
    assert.equal(response.status, 200, `${route} returned ${response.status}`);
  }
  const rows = await fetch(`${base}/api/data/query`, {
    method: "POST", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ collectionPath: "attendance", filters: [] })
  });
  assert.equal(rows.status, 200);
  const records = (await rows.json()).docs;
  assert.ok(records.some((row) => row.path === own.path));
  assert.ok(!records.some((row) => row.path === other.path));
  const mergeAttendance = await fetch(`${base}/api/data/document?path=${encodeURIComponent(own.path)}`, {
    method: "PUT", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: { actionPlanSent: true }, merge: true })
  });
  assert.equal(mergeAttendance.status, 200, `Attendance merge failed: ${mergeAttendance.status}`);
  assert.equal((await own.get()).data().marketerId, marketerId);
  const replaceWithoutOwner = await fetch(`${base}/api/data/document?path=${encodeURIComponent(own.path)}`, {
    method: "PUT", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: { actionPlanSent: true } })
  });
  assert.equal(replaceWithoutOwner.status, 403);
  const clearOwnerOnMerge = await fetch(`${base}/api/data/document?path=${encodeURIComponent(own.path)}`, {
    method: "PUT", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: { marketerId: null }, merge: true })
  });
  assert.equal(clearOwnerOnMerge.status, 403);
  const mergeOtherAttendance = await fetch(`${base}/api/data/document?path=${encodeURIComponent(other.path)}`, {
    method: "PUT", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: { actionPlanSent: true }, merge: true })
  });
  assert.equal(mergeOtherAttendance.status, 403);
  const actionPlanBatch = await fetch(`${base}/api/data/batch`, {
    method: "POST", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ operations: [
      { operation: "set", path: actionPlan.path, data: { marketerId, marketerEmail, date: "2026-10-20", areaName: "Smoke Area", purpose: "Visit" } },
      { operation: "update", path: own.path, data: { actionPlanSent: true, actionPlanId: actionPlan.id } }
    ] })
  });
  assert.equal(actionPlanBatch.status, 200, `Action plan batch failed: ${actionPlanBatch.status}`);
  assert.ok((await actionPlan.get()).exists);
  assert.equal((await own.get()).data().actionPlanId, actionPlan.id);
  const visitCount = await fetch(`${base}/api/data/count`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ collectionPath: "visits", filters: [
      { field: "createdAt", operator: ">=", value: Timestamp.fromDate(new Date("2026-10-20T00:00:00+05:00")) },
      { field: "createdAt", operator: "<", value: Timestamp.fromDate(new Date("2026-10-21T00:00:00+05:00")) }
    ] })
  });
  assert.equal(visitCount.status, 200, `Dashboard visit count failed: ${visitCount.status}`);
  assert.ok((await visitCount.json()).count >= 1);
  await visitRefs[0].update({ image: "data:image/jpeg;base64,dGVzdA==" });
  const removeOwnVisitImage = await fetch(`${base}/api/data/document?path=${encodeURIComponent(visitRefs[0].path)}`, {
    method: "PATCH", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: { image: null } })
  });
  assert.equal(removeOwnVisitImage.status, 200, `Visit image removal failed: ${removeOwnVisitImage.status}`);
  assert.equal((await visitRefs[0].get()).data().image, null);
  const editVisitOutsideService = await fetch(`${base}/api/data/document?path=${encodeURIComponent(visitRefs[0].path)}`, {
    method: "PATCH", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ data: { schoolName: "Changed outside visit edit service" } })
  });
  assert.equal(editVisitOutsideService.status, 403);
  const catalogueWrite = await fetch(`${base}/api/data/document?path=${encodeURIComponent(catalogue.path)}`, {
    method: "PUT", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ data: { title: "Smoke Catalogue", sourceUrl: "https://example.test/catalogue.pdf", status: "ready" } })
  });
  assert.equal(catalogueWrite.status, 200);
  const catalogueRead = await fetch(`${base}/api/data/document?path=${encodeURIComponent(catalogue.path)}`, {
    headers: { cookie: marketerCookie }
  });
  assert.equal(catalogueRead.status, 200);
  assert.equal((await catalogueRead.json()).data.title, "Smoke Catalogue");
  const reportResponse = await fetch(`${base}/api/custom-reports`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ title: "Smoke Report", date: "2026-10-20" })
  });
  assert.equal(reportResponse.status, 201, `Custom report creation failed: ${reportResponse.status}`);
  createdReportId = (await reportResponse.json()).report.id;
  const reportRow = await fetch(`${base}/api/custom-reports/${createdReportId}/rows`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ date: "2026-10-20", name: "Smoke Person", number: "1", city: "Lahore", institute: "Smoke School", remarks: "Test" })
  });
  assert.equal(reportRow.status, 201, `Custom report row failed: ${reportRow.status}`);
  const reportList = await fetch(`${base}/api/custom-reports`, { headers: { cookie: adminCookie } });
  assert.equal(reportList.status, 200);
  assert.ok((await reportList.json()).reports.some((report) => report.id === createdReportId && report.rows.length === 1));
  const newsResponse = await fetch(`${base}/api/news`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ kind: "general", message: "Smoke test message", recipientIds: [marketerId] })
  });
  assert.equal(newsResponse.status, 201, `News creation failed: ${newsResponse.status}`);
  createdNewsId = (await newsResponse.json()).news.id;
  const marketerNews = await fetch(`${base}/api/news`, { headers: { cookie: marketerCookie } });
  assert.equal(marketerNews.status, 200);
  assert.ok((await marketerNews.json()).news.some((item) => item.id === createdNewsId));
  const readNews = await fetch(`${base}/api/news/read`, {
    method: "POST", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ ids: [createdNewsId] })
  });
  assert.equal(readNews.status, 200);
  assert.equal((await readNews.json()).marked, 1);
  const expenseResponse = await fetch(`${base}/api/news`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ kind: "expense", fromDate: "2026-10-20", toDate: "2026-10-20", recipientIds: [marketerId] })
  });
  assert.equal(expenseResponse.status, 201, `Expense news creation failed: ${expenseResponse.status}`);
  createdExpenseNewsId = (await expenseResponse.json()).news.id;
  const pdfResponse = await fetch(`${base}/api/news/${createdExpenseNewsId}/report?download=1`, { headers: { cookie: marketerCookie } });
  assert.equal(pdfResponse.status, 200, `Expense PDF download failed: ${pdfResponse.status}`);
  assert.match(pdfResponse.headers.get("content-type") || "", /application\/pdf/);
  assert.match(pdfResponse.headers.get("content-disposition") || "", /^attachment;/);
  assert.equal(Buffer.from(await pdfResponse.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  const otherPdf = await fetch(`${base}/api/news/${createdExpenseNewsId}/report?download=1`, { headers: { cookie: createdCookie } });
  assert.equal(otherPdf.status, 404);
  const denied = await fetch(`${base}/api/data/query`, {
    method: "POST", headers: { ...json, cookie: marketerCookie },
    body: JSON.stringify({ collectionPath: "customReports", filters: [] })
  });
  assert.equal(denied.status, 403);
  const logout = await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie: marketerCookie } });
  assert.equal(logout.status, 204);
  const afterLogout = await fetch(`${base}/api/auth/me`, { headers: { cookie: marketerCookie } });
  assert.equal(afterLogout.status, 401);
  await fetch(`${base}/api/auth/logout`, { method: "POST", headers: { cookie: adminCookie } });
  console.log("PostgreSQL login, locations, card load/photo, offline visit upload, attendance/action plan, visit media/import, catalogue, custom report, news/PDF download, and JWT logout passed");
} finally {
  if (createdExpenseNewsId) {
    const reportRef = store.collection("news").doc(createdExpenseNewsId).collection("reports").doc(marketerId);
    const report = await reportRef.get();
    for (let index = 0; index < (report.data()?.chunks || 0); index++) await reportRef.collection("chunks").doc(String(index)).delete();
    await reportRef.delete();
    await store.collection("marketerNewsReads").doc(marketerId).collection("items").doc(createdExpenseNewsId).delete();
    await store.collection("news").doc(createdExpenseNewsId).delete();
  }
  await Promise.all([account.delete(), own.delete(), other.delete(), actionPlan.delete(), catalogue.delete(), manualArea.delete(), ...visitRefs.map((ref) => ref.delete()),
    offlineVisit.delete(),
    ...(createdNewsId ? [store.collection("news").doc(createdNewsId).delete(), store.collection("marketerNewsReads").doc(marketerId).collection("items").doc(createdNewsId).delete()] : []),
    ...(createdReportId ? [store.collection("customReports").doc(createdReportId).delete()] : []),
    ...(createdMarketerId ? [store.collection("marketers").doc(createdMarketerId).delete(), store.collection("savedCards").doc(createdMarketerId).delete()] : [])]);
  await postgresPool().query("DELETE FROM portal_sessions WHERE account_id = $1", [marketerId]);
  if (createdMarketerId) await postgresPool().query("DELETE FROM portal_sessions WHERE account_id = $1", [createdMarketerId]);
  await new Promise((resolve) => server.close(resolve));
  await closePostgresPool();
}
