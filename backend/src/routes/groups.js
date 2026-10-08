import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { mapGroup } from "../db.js";

const router = Router();

function readStudentIds(body) {
  if (!Array.isArray(body?.studentIds)) return null;
  return [...new Set(body.studentIds.filter((id) => typeof id === "string"))];
}

function replaceMembers(groupId, studentIds) {
  const insert = db.prepare(
    "INSERT INTO group_members (group_id, student_id) VALUES (?, ?)"
  );
  db.prepare("DELETE FROM group_members WHERE group_id = ?").run(groupId);
  for (const studentId of studentIds) {
    insert.run(groupId, studentId);
  }
}

function assertStudentsExist(studentIds) {
  if (studentIds.length === 0) return;
  const placeholders = studentIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT id FROM students WHERE id IN (${placeholders})`)
    .all(...studentIds);
  if (rows.length !== studentIds.length) {
    const error = new Error("one or more students were not found");
    error.status = 400;
    throw error;
  }
}

function assertStudentsAvailable(studentIds, excludeGroupId) {
  if (studentIds.length === 0) return;

  const placeholders = studentIds.map(() => "?").join(", ");
  const params = [...studentIds];
  let sql = `
    SELECT s.name, g.name AS group_name
    FROM group_members gm
    JOIN groups g ON g.id = gm.group_id
    JOIN students s ON s.id = gm.student_id
    WHERE gm.student_id IN (${placeholders})
  `;
  if (excludeGroupId) {
    sql += " AND g.id != ?";
    params.push(excludeGroupId);
  }

  const taken = db.prepare(sql).all(...params);
  if (taken.length > 0) {
    const error = new Error(`${taken[0].name} is already in ${taken[0].group_name}`);
    error.status = 400;
    throw error;
  }
}

function getGroupRow(id) {
  return db.prepare("SELECT id, name, ready FROM groups WHERE id = ?").get(id);
}

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT id, name, ready FROM groups ORDER BY name COLLATE NOCASE")
    .all();
  res.json(rows.map(mapGroup));
});

router.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const studentIds = readStudentIds(req.body) ?? [];
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    assertStudentsExist(studentIds);
    assertStudentsAvailable(studentIds);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const group = { id: randomUUID(), name, ready: 1 };

  const tx = db.transaction(() => {
    db.prepare("INSERT INTO groups (id, name, ready) VALUES (?, ?, ?)").run(
      group.id,
      group.name,
      group.ready
    );
    replaceMembers(group.id, studentIds);
  });
  tx();

  res.status(201).json(mapGroup(group));
});

router.put("/:id", (req, res) => {
  const existing = getGroupRow(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "group not found" });
  }

  const next = { ...existing };
  if (typeof req.body?.name === "string") {
    const name = req.body.name.trim();
    if (!name) {
      return res.status(400).json({ error: "name cannot be empty" });
    }
    next.name = name;
  }
  if (typeof req.body?.ready === "boolean") {
    next.ready = req.body.ready ? 1 : 0;
  }

  const studentIds = readStudentIds(req.body);
  try {
    if (studentIds) {
      assertStudentsExist(studentIds);
      assertStudentsAvailable(studentIds, existing.id);
    }
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE groups SET name = ?, ready = ? WHERE id = ?").run(
      next.name,
      next.ready,
      next.id
    );
    if (studentIds) {
      replaceMembers(next.id, studentIds);
    }
  });
  tx();

  res.json(mapGroup(next));
});

router.delete("/:id", (req, res) => {
  const existing = getGroupRow(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "group not found" });
  }

  db.prepare("DELETE FROM groups WHERE id = ?").run(existing.id);
  res.status(204).end();
});

export default router;
