import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import pg from "pg";
import bcrypt from "bcryptjs";

const originalUrl = new URL(process.env.DATABASE_URL || "");
if (!(["127.0.0.1", "localhost"].includes(originalUrl.hostname)
  && originalUrl.port === "5433" && originalUrl.pathname === "/school_visit_local")) {
  throw new Error("Benchmark is limited to the local school_visit_local database on port 5433");
}
const schema = `bench_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const administrator = new pg.Client({ connectionString: originalUrl.toString() });
const results = [];
let server;
let closePool;
let createdSchema = false;
const started = performance.now();
const delay = monitorEventLoopDelay({ resolution: 20 });
delay.enable();

function percentile(sorted, share) {
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * share) - 1)] * 10) / 10;
}
async function benchmark(name, count, concurrency, work) {
  const samples = [];
  const failures = [];
  let next = 0;
  const start = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < count) {
      const item = next++;
      const before = performance.now();
      try { await work(item); }
      catch (error) { failures.push(error.message); }
      samples.push(performance.now() - before);
    }
  }));
  samples.sort((a, b) => a - b);
  const elapsed = performance.now() - start;
  const row = { name, requests: count, concurrency, errors: failures.length,
    p50Ms: percentile(samples, .5), p95Ms: percentile(samples, .95),
    requestsPerSecond: Math.round(count / elapsed * 1000 * 10) / 10,
    elapsedSeconds: Math.round(elapsed / 100) / 10 };
  results.push(row);
  console.log(JSON.stringify(row));
  if (failures.length) throw new Error(`${name}: ${failures.length} failures; first: ${failures[0]}`);
}

try {
  await administrator.connect();
  await administrator.query(`CREATE SCHEMA ${schema}`);
  createdSchema = true;
  const benchmarkUrl = new URL(originalUrl);
  benchmarkUrl.searchParams.set("options", `-c search_path=${schema}`);
  process.env.DATABASE_URL = benchmarkUrl.toString();
  process.env.ADMIN_EMAIL = "benchmark-admin@example.test";
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash("benchmark-admin-password", 12);

  const [{ app }, { runMigrations }, { postgresPool, closePostgresPool }] = await Promise.all([
    import("../src/app.js"), import("../src/db/migrate.js"), import("../src/config/postgres.js")
  ]);
  closePool = closePostgresPool;
  const pool = postgresPool();
  assert.equal((await pool.query("SELECT current_schema() AS name")).rows[0].name, schema);
  await runMigrations(pool);

  const hash = await bcrypt.hash("benchmark-marketer-password", 12);
  await pool.query(`
    INSERT INTO portal_documents(path, collection_path, document_id, payload)
    SELECT 'marketers/bench_' || i, 'marketers', 'bench_' || i,
      jsonb_build_object('name', 'Benchmark ' || i, 'email', 'bench_' || i || '@example.test',
        'phone', '0300' || lpad(i::text, 7, '0'), 'passwordHash', $1::text,
        'assignedCityIds', '[]'::jsonb, 'assignedAreaIds', '[]'::jsonb)
    FROM generate_series(1, 500) AS i
  `, [hash]);
  await pool.query(`
    INSERT INTO portal_documents(path, collection_path, document_id, payload)
    SELECT 'visits/bench_' || i, 'visits', 'bench_' || i,
      jsonb_build_object('marketerId', 'bench_' || (((i-1) % 500)+1),
        'marketerEmail', 'bench_' || (((i-1) % 500)+1) || '@example.test',
        'schoolName', 'Benchmark School ' || i, 'cityName', 'Faisalabad',
        'areaName', 'D Ground', 'image', '',
        'createdAt', jsonb_build_object('__schoolVisitValueType', 'timestamp',
          'seconds', extract(epoch from now())::bigint, 'nanoseconds', 0))
    FROM generate_series(1, 10000) AS i
  `);
  const beforePhotos = Number((await pool.query("SELECT pg_total_relation_size('portal_documents') AS bytes")).rows[0].bytes);
  const mediaStart = performance.now();
  for (let i = 1; i <= 200; i++) {
    const photo = `data:image/jpeg;base64,${randomBytes(100 * 1024).toString("base64")}`;
    await pool.query("UPDATE portal_documents SET payload = jsonb_set(payload, '{image}', to_jsonb($1::text)) WHERE path = $2",
      [photo, `visits/bench_${i}`]);
  }
  const afterPhotos = Number((await pool.query("SELECT pg_total_relation_size('portal_documents') AS bytes")).rows[0].bytes);
  const mediaSeconds = Math.round((performance.now() - mediaStart) / 100) / 10;

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = { "content-type": "application/json" };
  const call = async (path, cookie, options = {}) => {
    const response = await fetch(`${base}${path}`, { ...options,
      headers: { ...json, ...(cookie ? { cookie } : {}), ...options.headers } });
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    await response.arrayBuffer();
    return response;
  };
  const login = async (identifier, password) => {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST", headers: json, body: JSON.stringify({ identifier, password })
    });
    if (!response.ok) throw new Error(`Login HTTP ${response.status}`);
    const cookie = response.headers.get("set-cookie").split(";")[0];
    await response.arrayBuffer();
    return cookie;
  };
  const adminCookie = await login(process.env.ADMIN_EMAIL, "benchmark-admin-password");
  const marketerCookie = await login("bench_1@example.test", "benchmark-marketer-password");
  const firstAdminList = await fetch(`${base}/api/data/query`, {
    method: "POST", headers: { ...json, cookie: adminCookie },
    body: JSON.stringify({ collectionPath: "visits", filters: [] })
  });
  assert.equal(firstAdminList.status, 200);
  const adminListBytes = (await firstAdminList.arrayBuffer()).byteLength;
  const explainOwn = await pool.query(`EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT path, payload FROM portal_documents
    WHERE collection_path = 'visits' AND (payload #>> ARRAY['marketerEmail']) = 'bench_1@example.test'`);
  const explainAll = await pool.query(`EXPLAIN (ANALYZE, FORMAT JSON)
    SELECT path, payload FROM portal_documents WHERE collection_path = 'visits'`);
  const ownFilter = JSON.stringify({ collectionPath: "visits", filters: [] });
  const allFilter = ownFilter;
  const writeBody = (i) => JSON.stringify({ data: { marketerId: "bench_1", marketerEmail: "bench_1@example.test",
    schoolName: `Write Test ${i}`, cityName: "Faisalabad", areaName: "D Ground" } });
  const firstPhoto = (await pool.query("SELECT payload->>'image' AS image FROM portal_documents WHERE path = 'visits/bench_1'")).rows[0].image;

  await benchmark("health", 300, 20, () => call("/api/health"));
  await benchmark("marketer own visits (20 rows)", 200, 10, () => call("/api/data/query", marketerCookie,
    { method: "POST", body: ownFilter }));
  await benchmark("marketer visit summary", 150, 10, () => call("/api/visits/summary", marketerCookie));
  await benchmark("admin all visits (10000 rows)", 25, 3, () => call("/api/data/query", adminCookie,
    { method: "POST", body: allFilter }));
  await benchmark("marketer record writes", 100, 10, (i) => call(`/api/data/document?path=visits%2Fwrite_${i}`,
    marketerCookie, { method: "PUT", body: writeBody(i) }));
  await benchmark("100 KB photo reads", 100, 10, () => call("/api/data/document?path=visits%2Fbench_1", adminCookie));
  await benchmark("100 KB photo writes", 20, 5, (i) => call(`/api/data/document?path=visits%2Fphoto_write_${i}`,
    adminCookie, { method: "PUT", body: JSON.stringify({ data: { marketerId: "bench_1", image: firstPhoto } }) }));
  await benchmark("marketer login sequential (bcrypt 12)", 6, 1, () => login("bench_1@example.test", "benchmark-marketer-password"));
  await benchmark("marketer login (bcrypt 12)", 20, 4, () => login("bench_1@example.test", "benchmark-marketer-password"));
  await benchmark("marketer card", 30, 5, () => call("/api/cards/me", marketerCookie));
  if (process.env.BENCHMARK_BURST_USERS === "1") {
    for (const count of [20, 25]) {
      const cookies = Array(count);
      await benchmark(`${count} distinct marketer logins`, count, count, async (i) => {
        cookies[i] = await login(`bench_${i + 101}@example.test`, "benchmark-marketer-password");
      });
      await benchmark(`${count} distinct marketer visit writes`, count, count, (i) =>
        call(`/api/data/document?path=visits%2Fburst_${count}_${i}`, cookies[i], {
          method: "PUT",
          body: JSON.stringify({ data: {
            marketerId: `bench_${i + 101}`,
            marketerEmail: `bench_${i + 101}@example.test`,
            schoolName: `Burst Test ${i}`,
            cityName: "Faisalabad",
            areaName: "D Ground"
          } })
        }));
      await benchmark(`${count} distinct marketer 100 KB photo visit writes`, count, count, (i) =>
        call(`/api/data/document?path=visits%2Fburst_photo_${count}_${i}`, cookies[i], {
          method: "PUT",
          body: JSON.stringify({ data: {
            marketerId: `bench_${i + 101}`,
            marketerEmail: `bench_${i + 101}@example.test`,
            schoolName: `Photo Burst Test ${i}`,
            cityName: "Faisalabad",
            areaName: "D Ground",
            image: firstPhoto
          } })
        }));
    }
  }
  const soakSeconds = Number(process.env.BENCHMARK_SOAK_SECONDS || 0);
  if (soakSeconds > 0) {
    if (!Number.isFinite(soakSeconds) || soakSeconds > 300) throw new Error("Soak duration must be 1 to 300 seconds");
    const until = performance.now() + soakSeconds * 1000;
    if (global.gc) global.gc();
    const rssBeforeMiB = Math.round(process.memoryUsage().rss / 2**20);
    const heapBeforeMiB = Math.round(process.memoryUsage().heapUsed / 2**20);
    const soakStart = performance.now();
    const soakSamples = [];
    const soakErrors = [];
    let workId = 0;
    await Promise.all(Array.from({ length: 10 }, async () => {
      while (performance.now() < until) {
        const item = workId++;
        const requestStart = performance.now();
        try {
          if (item % 200 === 0) await call("/api/data/query", adminCookie, { method: "POST", body: allFilter });
          else if (item % 20 === 0) await call("/api/data/document?path=visits%2Fbench_1", adminCookie);
          else if (item % 10 === 0) await call(`/api/data/document?path=visits%2Fsoak_${item}`,
            marketerCookie, { method: "PUT", body: writeBody(item) });
          else if (item % 4 === 0) await call("/api/visits/summary", marketerCookie);
          else await call("/api/data/query", marketerCookie, { method: "POST", body: ownFilter });
        } catch (error) { soakErrors.push(error.message); }
        soakSamples.push(performance.now() - requestStart);
      }
    }));
    soakSamples.sort((a, b) => a - b);
    const elapsedSeconds = (performance.now() - soakStart) / 1000;
    if (global.gc) global.gc();
    console.log(JSON.stringify({ soak: {
      seconds: Math.round(elapsedSeconds), requests: soakSamples.length,
      concurrency: 10, errors: soakErrors.length,
      p50Ms: percentile(soakSamples, .5), p95Ms: percentile(soakSamples, .95),
      requestsPerSecond: Math.round(soakSamples.length / elapsedSeconds * 10) / 10,
      rssBeforeMiB, rssAfterMiB: Math.round(process.memoryUsage().rss / 2**20),
      heapBeforeMiB, heapAfterMiB: Math.round(process.memoryUsage().heapUsed / 2**20),
      firstError: soakErrors[0] || null
    } }));
  }

  const sizes = await pool.query(`SELECT
    pg_total_relation_size('portal_documents') AS documents_bytes,
    pg_total_relation_size('portal_sessions') AS sessions_bytes,
    (SELECT count(*)::integer FROM portal_documents WHERE collection_path = 'visits') AS visits,
    (SELECT count(*)::integer FROM portal_documents WHERE collection_path = 'marketers') AS marketers`);
  console.log(JSON.stringify({ summary: {
    isolatedSchema: schema, marketers: sizes.rows[0].marketers, visits: sizes.rows[0].visits,
    randomPhotos: 200, photoBytesEach: 100 * 1024, photoSeedSeconds: mediaSeconds,
    photoStorageAddedMiB: Math.round((afterPhotos - beforePhotos) / 2**20 * 10) / 10,
    adminListResponseMiB: Math.round(adminListBytes / 2**20 * 10) / 10,
    ownQueryDbMs: Math.round(explainOwn.rows[0]["QUERY PLAN"][0]["Execution Time"] * 10) / 10,
    allQueryDbMs: Math.round(explainAll.rows[0]["QUERY PLAN"][0]["Execution Time"] * 10) / 10,
    ownQueryPlan: explainOwn.rows[0]["QUERY PLAN"][0].Plan["Node Type"],
    allQueryPlan: explainAll.rows[0]["QUERY PLAN"][0].Plan["Node Type"],
    documentsMiB: Math.round(Number(sizes.rows[0].documents_bytes) / 2**20 * 10) / 10,
    sessionsMiB: Math.round(Number(sizes.rows[0].sessions_bytes) / 2**20 * 10) / 10,
    eventLoopP95Ms: Math.round(delay.percentile(95) / 1e6 * 10) / 10,
    rssMiB: Math.round(process.memoryUsage().rss / 2**20),
    logicalCpus: os.availableParallelism(), ramGiB: Math.round(os.totalmem() / 2**30 * 10) / 10,
    elapsedSeconds: Math.round((performance.now() - started) / 100) / 10
  } }));
} finally {
  delay.disable();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (closePool) await closePool();
  if (createdSchema) await administrator.query(`DROP SCHEMA ${schema} CASCADE`);
  await administrator.end().catch(() => {});
  console.log(`Benchmark schema ${schema} removed`);
}
