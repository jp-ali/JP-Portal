import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const envFile = fileURLToPath(new URL("../../.env", import.meta.url));
const role = "school_visit_app";
const database = "school_visit_local";
const port = 5433;

export async function setupLocal() {
  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL already exists; refusing to replace existing local database settings");
  const existingEnv = await readFile(envFile, "utf8");
  if (/^DATABASE_URL=/m.test(existingEnv)) throw new Error("DATABASE_URL already exists in backend/.env");
  const passwordFile = process.env.POSTGRES_SUPERUSER_PASSWORD_FILE
    || join(process.env.LOCALAPPDATA || "", "school-visit-postgres", "local-superuser-password.txt");
  const superPassword = (await readFile(passwordFile, "utf8")).trim();
  const appPassword = randomBytes(24).toString("hex");
  const admin = new pg.Client({ host: "127.0.0.1", port, database: "postgres", user: "postgres", password: superPassword, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    const existingRole = await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
    const existingDatabase = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (existingRole.rowCount || existingDatabase.rowCount) throw new Error("Local database or app role already exists; no credentials were changed");
    // The generated password is hex and role/database names are fixed constants.
    await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${appPassword}'`);
    try {
      await admin.query(`CREATE DATABASE ${database} OWNER ${role}`);
    } catch (error) {
      await admin.query(`DROP ROLE ${role}`);
      throw error;
    }
  } finally {
    await admin.end();
  }
  const url = `postgresql://${role}:${appPassword}@127.0.0.1:${port}/${database}`;
  await appendFile(envFile, `\nDATABASE_URL=${url}\n`, { encoding: "utf8" });
  return { database, role };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const result = await setupLocal();
    console.log(`Local database ${result.database} and limited role ${result.role} are ready; connection saved in backend/.env`);
  } catch (error) {
    console.error(`Local PostgreSQL setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
