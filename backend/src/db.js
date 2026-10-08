import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data.sqlite");

// The app serves a single course; older databases with multiple classrooms
// keep only this one's groups when migrated.
const COURSE_NAME = "CSC491";

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

function tableExists(name) {
  return Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name)
  );
}

function columnNames(table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name);
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ready INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      PRIMARY KEY (group_id, student_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS presentation_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      order_json TEXT NOT NULL DEFAULT '[]',
      current_index INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO presentation_state (id, order_json, current_index)
    VALUES (1, '[]', 0);
  `);
}

// Collapses the per-classroom schema into a single course, keeping the
// CSC491 classroom (or the first one, if it doesn't exist).
function migrateFromClassrooms() {
  if (!tableExists("classrooms")) return;

  const keep =
    db
      .prepare("SELECT id FROM classrooms WHERE lower(name) = lower(?)")
      .get(COURSE_NAME) ?? db.prepare("SELECT id FROM classrooms LIMIT 1").get();

  db.pragma("foreign_keys = OFF");
  const tx = db.transaction(() => {
    const groups = keep
      ? db
          .prepare("SELECT id, name, ready FROM groups WHERE classroom_id = ?")
          .all(keep.id)
      : [];
    const state = keep
      ? db
          .prepare(
            "SELECT order_json, current_index FROM presentation_state WHERE classroom_id = ?"
          )
          .get(keep.id)
      : null;

    db.prepare(
      "DELETE FROM group_members WHERE group_id NOT IN (SELECT id FROM groups WHERE classroom_id = ?)"
    ).run(keep?.id ?? null);
    db.exec(`
      DROP TABLE groups;
      DROP TABLE presentation_state;
      DROP TABLE classrooms;
    `);
    createSchema();

    const insertGroup = db.prepare(
      "INSERT INTO groups (id, name, ready) VALUES (?, ?, ?)"
    );
    for (const group of groups) {
      insertGroup.run(group.id, group.name, group.ready);
    }
    if (state) {
      db.prepare(
        "UPDATE presentation_state SET order_json = ?, current_index = ? WHERE id = 1"
      ).run(state.order_json, state.current_index);
    }
  });
  tx();
  db.pragma("foreign_keys = ON");
}

if (tableExists("groups") && columnNames("groups").includes("classroom_id")) {
  migrateFromClassrooms();
}
createSchema();

export function mapStudent(row) {
  return { id: row.id, name: row.name };
}

export function mapGroup(row) {
  const members = db
    .prepare(
      `SELECT s.id, s.name
       FROM students s
       JOIN group_members gm ON gm.student_id = s.id
       WHERE gm.group_id = ?
       ORDER BY s.name COLLATE NOCASE`
    )
    .all(row.id);

  return {
    id: row.id,
    name: row.name,
    ready: Boolean(row.ready),
    studentIds: members.map((member) => member.id),
    members: members.map((member) => member.name).join(", "),
  };
}

export default db;
