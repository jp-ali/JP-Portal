import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir, rm, rename } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseUrl } from "../config/postgres.js";

const defaultOutput = fileURLToPath(new URL(`../../backups/postgres-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`, import.meta.url));

export function pgConnectionSettings(value = databaseUrl()) {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1))
  };
}

export async function backupPostgres(outputPath = defaultOutput) {
  const destination = resolve(outputPath);
  const partial = `${destination}.partial`;
  const settings = pgConnectionSettings();
  await mkdir(dirname(destination), { recursive: true });
  const binary = process.platform === "win32" ? "pg_dump.exe" : "pg_dump";
  const binDirectory = process.env.POSTGRES_BIN || (process.platform === "win32"
    ? join(process.env.LOCALAPPDATA || "", "school-visit-postgres", "pgsql17", "bin") : "");
  const command = binDirectory ? resolve(binDirectory, binary) : binary;
  try {
    await new Promise((done, fail) => {
      const child = spawn(command, ["--format=custom", "--no-owner", "--no-acl", "--file", partial,
        "--host", settings.host, "--port", settings.port, "--username", settings.user, settings.database], {
        stdio: ["ignore", "ignore", "pipe"],
        env: { ...process.env, PGPASSWORD: settings.password }
      });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk.toString().slice(0, 4000); });
      child.on("error", fail);
      child.on("close", (code) => code === 0 ? done() : fail(new Error(`pg_dump failed (${code}): ${stderr.trim()}`)));
    });
    await rename(partial, destination);
    return destination;
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(`PostgreSQL backup: ${await backupPostgres(process.argv[2] || defaultOutput)}`);
  } catch (error) {
    console.error(`PostgreSQL backup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
