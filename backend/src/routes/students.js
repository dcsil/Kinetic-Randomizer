import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { mapStudent } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT id, name FROM students ORDER BY name COLLATE NOCASE")
    .all();
  res.json(rows.map(mapStudent));
});

router.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const duplicate = db
    .prepare("SELECT id FROM students WHERE lower(name) = lower(?)")
    .get(name);
  if (duplicate) {
    return res.status(400).json({ error: "a student with that name already exists" });
  }

  const student = { id: randomUUID(), name };
  db.prepare("INSERT INTO students (id, name) VALUES (?, ?)").run(
    student.id,
    student.name
  );
  res.status(201).json(student);
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT id, name FROM students WHERE id = ?")
    .get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "student not found" });
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name cannot be empty" });
  }

  const duplicate = db
    .prepare("SELECT id FROM students WHERE lower(name) = lower(?) AND id != ?")
    .get(name, existing.id);
  if (duplicate) {
    return res.status(400).json({ error: "a student with that name already exists" });
  }

  db.prepare("UPDATE students SET name = ? WHERE id = ?").run(name, existing.id);
  res.json({ id: existing.id, name });
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "student not found" });
  }
  res.status(204).end();
});

export default router;
