import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { mapStudent } from "../db.js";

const router = Router();

async function nameTaken(instructorId, name, excludeId = null) {
  const { rows } = await db.query(
    `SELECT 1 FROM students
     WHERE instructor_id = $1 AND lower(name) = lower($2)
       AND ($3::text IS NULL OR id != $3)`,
    [instructorId, name, excludeId]
  );
  return rows.length > 0;
}

router.get("/", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name FROM students WHERE instructor_id = $1 ORDER BY lower(name)",
    [req.instructor.id]
  );
  res.json(rows.map(mapStudent));
});

router.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  if (await nameTaken(req.instructor.id, name)) {
    return res.status(400).json({ error: "a student with that name already exists" });
  }

  const student = { id: randomUUID(), name };
  await db.query(
    "INSERT INTO students (id, instructor_id, name) VALUES ($1, $2, $3)",
    [student.id, req.instructor.id, student.name]
  );
  res.status(201).json(student);
});

router.put("/:id", async (req, res) => {
  const { rows } = await db.query(
    "SELECT id FROM students WHERE id = $1 AND instructor_id = $2",
    [req.params.id, req.instructor.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "student not found" });
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name cannot be empty" });
  }
  if (await nameTaken(req.instructor.id, name, req.params.id)) {
    return res.status(400).json({ error: "a student with that name already exists" });
  }

  await db.query("UPDATE students SET name = $1 WHERE id = $2", [
    name,
    req.params.id,
  ]);
  res.json({ id: req.params.id, name });
});

router.delete("/:id", async (req, res) => {
  const result = await db.query(
    "DELETE FROM students WHERE id = $1 AND instructor_id = $2",
    [req.params.id, req.instructor.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "student not found" });
  }
  res.status(204).end();
});

export default router;
