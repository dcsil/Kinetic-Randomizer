import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error", err);
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS instructors (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      members TEXT NOT NULL DEFAULT '',
      ready BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS groups_instructor_idx ON groups (instructor_id);

    CREATE TABLE IF NOT EXISTS presentation_state (
      instructor_id TEXT PRIMARY KEY REFERENCES instructors(id) ON DELETE CASCADE,
      order_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      current_index INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function mapGroup(row) {
  return {
    id: row.id,
    name: row.name,
    members: row.members,
    ready: Boolean(row.ready),
  };
}

export default pool;
