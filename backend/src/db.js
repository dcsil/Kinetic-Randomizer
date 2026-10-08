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

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
      name TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS students_instructor_name_idx
      ON students (instructor_id, lower(name));

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      ready BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS groups_instructor_idx ON groups (instructor_id);

    -- A student can belong to at most one group.
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS presentation_state (
      instructor_id TEXT PRIMARY KEY REFERENCES instructors(id) ON DELETE CASCADE,
      order_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      current_index INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function mapStudent(row) {
  return { id: row.id, name: row.name };
}

export async function fetchGroups(instructorId, groupId = null, client = pool) {
  const { rows } = await client.query(
    `SELECT g.id, g.name, g.ready,
       COALESCE(
         array_agg(s.id ORDER BY lower(s.name)) FILTER (WHERE s.id IS NOT NULL),
         '{}'
       ) AS student_ids,
       COALESCE(string_agg(s.name, ', ' ORDER BY lower(s.name)), '') AS members
     FROM groups g
     LEFT JOIN group_members gm ON gm.group_id = g.id
     LEFT JOIN students s ON s.id = gm.student_id
     WHERE g.instructor_id = $1 AND ($2::text IS NULL OR g.id = $2)
     GROUP BY g.id
     ORDER BY lower(g.name)`,
    [instructorId, groupId]
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ready: Boolean(row.ready),
    studentIds: row.student_ids,
    members: row.members,
  }));
}

export default pool;
