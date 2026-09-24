import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data.sqlite");

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

function migrateLegacySchema() {
  const hasGroups = tableExists("groups");
  const groupCols = hasGroups ? columnNames("groups") : [];
  const isLegacyGroups =
    hasGroups && groupCols.includes("members") && !groupCols.includes("classroom_id");

  const hasPresentation = tableExists("presentation_state");
  const presentationCols = hasPresentation ? columnNames("presentation_state") : [];
  const isLegacyPresentation =
    hasPresentation &&
    presentationCols.includes("id") &&
    !presentationCols.includes("classroom_id");

  db.exec(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  if (isLegacyGroups) {
    const classroomId = randomUUID();
    db.prepare("INSERT INTO classrooms (id, name) VALUES (?, ?)").run(
      classroomId,
      "Default classroom"
    );

    const oldGroups = db.prepare("SELECT id, name, members, ready FROM groups").all();
    db.exec("ALTER TABLE groups RENAME TO groups_legacy");
    db.exec(`
      CREATE TABLE groups (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL,
        name TEXT NOT NULL,
        ready INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS group_members (
        group_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        PRIMARY KEY (group_id, student_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `);

    const studentByName = new Map();
    const insertGroup = db.prepare(
      "INSERT INTO groups (id, classroom_id, name, ready) VALUES (?, ?, ?, ?)"
    );
    const insertStudent = db.prepare("INSERT INTO students (id, name) VALUES (?, ?)");
    const insertMember = db.prepare(
      "INSERT OR IGNORE INTO group_members (group_id, student_id) VALUES (?, ?)"
    );

    for (const group of oldGroups) {
      insertGroup.run(group.id, classroomId, group.name, group.ready);
      const names = String(group.members || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);
      for (const name of names) {
        const key = name.toLowerCase();
        let studentId = studentByName.get(key);
        if (!studentId) {
          studentId = randomUUID();
          studentByName.set(key, studentId);
          insertStudent.run(studentId, name);
        }
        insertMember.run(group.id, studentId);
      }
    }

    db.exec("DROP TABLE groups_legacy");
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL,
        name TEXT NOT NULL,
        ready INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS group_members (
        group_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        PRIMARY KEY (group_id, student_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `);
  }

  if (isLegacyPresentation) {
    const old = db
      .prepare("SELECT order_json, current_index FROM presentation_state WHERE id = 1")
      .get();
    db.exec("DROP TABLE presentation_state");
    db.exec(`
      CREATE TABLE presentation_state (
        classroom_id TEXT PRIMARY KEY,
        order_json TEXT NOT NULL DEFAULT '[]',
        current_index INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
      );
    `);
    const classroom = db.prepare("SELECT id FROM classrooms LIMIT 1").get();
    if (classroom && old) {
      db.prepare(
        "INSERT INTO presentation_state (classroom_id, order_json, current_index) VALUES (?, ?, ?)"
      ).run(classroom.id, old.order_json, old.current_index);
    }
  } else {
    db.exec(`
      CREATE TABLE IF NOT EXISTS presentation_state (
        classroom_id TEXT PRIMARY KEY,
        order_json TEXT NOT NULL DEFAULT '[]',
        current_index INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
      );
    `);
  }
}

migrateLegacySchema();

export function getClassroom(id) {
  return db.prepare("SELECT id, name FROM classrooms WHERE id = ?").get(id);
}

export function ensurePresentationState(classroomId) {
  db.prepare(
    "INSERT OR IGNORE INTO presentation_state (classroom_id, order_json, current_index) VALUES (?, '[]', 0)"
  ).run(classroomId);
}

export function mapClassroom(row) {
  return {
    id: row.id,
    name: row.name,
    groupCount: Number(row.groupCount ?? row.group_count ?? 0),
  };
}

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
    classroomId: row.classroom_id,
    name: row.name,
    ready: Boolean(row.ready),
    studentIds: members.map((member) => member.id),
    members: members.map((member) => member.name).join(", "),
  };
}

export default db;
