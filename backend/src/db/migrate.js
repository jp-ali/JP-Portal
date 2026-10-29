import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { postgresPool, closePostgresPool } from "../config/postgres.js";

const migrationsDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

export async function runMigrations(db = postgresPool()) {
  const client = await db.connect();
  try {
    await client.query("SELECT pg_advisory_lock(769142051)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      sha256 char(64) NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const files = (await readdir(migrationsDirectory)).filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name)).sort();
    for (const name of files) {
      const sql = await readFile(new URL(`./migrations/${name}`, import.meta.url), "utf8");
      const sha256 = createHash("sha256").update(sql).digest("hex");
      const { rows } = await client.query("SELECT sha256 FROM schema_migrations WHERE name = $1", [name]);
      if (rows.length) {
        if (rows[0].sha256 !== sha256) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name, sha256) VALUES ($1, $2)", [name, sha256]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return files.length;
  } finally {
    await client.query("SELECT pg_advisory_unlock(769142051)");
    client.release();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const count = await runMigrations();
    console.log(`PostgreSQL migrations verified: ${count}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await closePostgresPool();
  }
}
