import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(process.env.LOCALAPPDATA || "", "school-visit-postgres");
const binary = join(process.env.POSTGRES_BIN || join(root, "pgsql17", "bin"), "pg_ctl.exe");
const data = join(root, "data");
const log = join(root, "postgres.log");

export function localServer(action = "status") {
  if (process.platform !== "win32") throw new Error("Local PostgreSQL helper is for Windows only");
  const args = action === "start"
    ? ["-D", data, "-l", log, "-o", "-h 127.0.0.1 -p 5433", "start"]
    : action === "stop" ? ["-D", data, "-m", "fast", "stop"]
      : action === "status" ? ["-D", data, "status"] : null;
  if (!args) throw new Error("Use start, stop, or status");
  // PostgreSQL inherits Windows pipe handles when pg_ctl starts it. Ignore
  // stdio for start so the helper can return while the server stays running.
  const result = spawnSync(binary, args, {
    encoding: "utf8", windowsHide: true, timeout: 30_000,
    stdio: action === "start" ? "ignore" : ["ignore", "pipe", "pipe"]
  });
  if (result.error) throw result.error;
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) throw new Error(`pg_ctl ${action} failed with exit code ${result.status}`);
}

if (process.argv[1]?.endsWith("localServer.js")) {
  try { localServer(process.argv[2]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
