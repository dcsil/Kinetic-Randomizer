import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { ensurePresentationState, mapClassroom } from "../db.js";

const router = Router();

function listClassrooms() {
  return db
    .prepare(
      `SELECT c.id, c.name, COUNT(g.id) AS groupCount
       FROM classrooms c
       LEFT JOIN groups g ON g.classroom_id = c.id
       GROUP BY c.id
       ORDER BY c.name COLLATE NOCASE`
    )
    .all()
    .map(mapClassroom);
}

router.get("/", (_req, res) => {
  res.json(listClassrooms());
});

router.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const duplicate = db
    .prepare("SELECT id FROM classrooms WHERE lower(name) = lower(?)")
    .get(name);
  if (duplicate) {
    return res.status(400).json({ error: "a classroom with that name already exists" });
  }

  const classroom = { id: randomUUID(), name };
  db.prepare("INSERT INTO classrooms (id, name) VALUES (?, ?)").run(
    classroom.id,
    classroom.name
  );
  ensurePresentationState(classroom.id);

  res.status(201).json({ ...classroom, groupCount: 0 });
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT id, name FROM classrooms WHERE id = ?")
    .get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "classroom not found" });
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name cannot be empty" });
  }

  const duplicate = db
    .prepare("SELECT id FROM classrooms WHERE lower(name) = lower(?) AND id != ?")
    .get(name, existing.id);
  if (duplicate) {
    return res.status(400).json({ error: "a classroom with that name already exists" });
  }

  db.prepare("UPDATE classrooms SET name = ? WHERE id = ?").run(name, existing.id);
  const updated = listClassrooms().find((classroom) => classroom.id === existing.id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM classrooms WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "classroom not found" });
  }
  res.status(204).end();
});

export default router;
