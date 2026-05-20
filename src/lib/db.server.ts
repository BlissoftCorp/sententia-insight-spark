import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql__: ReturnType<typeof postgres> | undefined;
}

function buildSql() {
  const host = process.env.PGHOST;
  const port = process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432;
  const database = process.env.PGDATABASE;
  const username = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const sslmode = (process.env.PGSSLMODE || "require").toLowerCase();

  if (!host || !database || !username || !password) {
    throw new Error(
      "Database not configured: PGHOST/PGDATABASE/PGUSER/PGPASSWORD missing",
    );
  }

  // Self-signed cert on the VPS → don't verify CA, but still encrypt.
  const ssl =
    sslmode === "disable" ? false : { rejectUnauthorized: false };

  return postgres({
    host,
    port,
    database,
    username,
    password,
    ssl,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export const sql = globalThis.__sql__ ?? (globalThis.__sql__ = buildSql());
