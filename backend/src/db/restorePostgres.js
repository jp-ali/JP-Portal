import "dotenv/config";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { pgConnectionSettings } from "./backupPostgres.js";

export async function restorePostgres(inputPath) {
  if (!inputPath) throw new Error("Pass a PostgreSQL .dump path and set DATABASE_URL to a new empty database");
  const source = resolve(inputPath);
  await access(source);
  const settings = pgConnectionSettings();
  const client = new pg.Client({
    host: settings.host, port: Number(settings.port), user: settings.user,
    password: settings.password, database: settings.database,
    connectionTimeoutMillis: 5_000
  });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')");
    if (rows[0].count) throw new Error("Restore destination has tables; use a new empty database");
  } finally {
    await client.end();
  }

  const binDirectory = process.env.POSTGRES_BIN || (process.platform === "win32"
    ? join(process.env.LOCALAPPDATA || "", "school-visit-postgres", "pgsql17", "bin") : "");
  const binary = process.platform === "win32" ? "pg_restore.exe" : "pg_restore";
  const command = binDirectory ? resolve(binDirectory, binary) : binary;
  await new Promise((done, fail) => {
    const child = spawn(command, ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl",
      "--host", settings.host, "--port", settings.port, "--username", settings.user,
      "--dbname", settings.database, source], {
      stdio: ["ignore", "ignore", "pipe"],
      env: { ...process.env, PGPASSWORD: settings.password }
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString().slice(0, 4000); });
    child.on("error", fail);
    child.on("close", (code) => code === 0 ? done() : fail(new Error(`pg_restore failed (${code}): ${stderr.trim()}`)));
  });
  return { database: settings.database };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await restorePostgres(process.argv[2]);
    console.log(`PostgreSQL backup restored into ${result.database}`);
  } catch (error) {
    console.error(`PostgreSQL restore failed: ${error.message}`);
    process.exitCode = 1;
  }
}
