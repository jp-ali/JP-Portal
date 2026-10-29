import pg from "pg";

let pool;

export function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is missing from backend/.env");
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === "/") {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL");
  }
  return value;
}

export function postgresPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: databaseUrl(),
      max: 10,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000
    });
    pool.on("error", (error) => console.error("PostgreSQL idle connection error", error));
  }
  return pool;
}

export async function closePostgresPool() {
  if (pool) {
    const current = pool;
    pool = undefined;
    await current.end();
  }
}
