import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { mapGroup } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, members, ready FROM groups
     WHERE instructor_id = $1 ORDER BY created_at`,
    [req.instructor.id]
  );
  res.json(rows.map(mapGroup));
});

router.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const members =
    typeof req.body?.members === "string" ? req.body.members.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const group = {
    id: randomUUID(),
    name,
    members,
    ready: true,
  };
  await db.query(
    `INSERT INTO groups (id, instructor_id, name, members, ready)
     VALUES ($1, $2, $3, $4, $5)`,
    [group.id, req.instructor.id, group.name, group.members, group.ready]
  );

  res.status(201).json(mapGroup(group));
});

router.put("/:id", async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, name, members, ready FROM groups
     WHERE id = $1 AND instructor_id = $2`,
    [req.params.id, req.instructor.id]
  );
  const existing = rows[0];
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
  if (typeof req.body?.members === "string") {
    next.members = req.body.members.trim();
  }
  if (typeof req.body?.ready === "boolean") {
    next.ready = req.body.ready;
  }

  await db.query(
    `UPDATE groups SET name = $1, members = $2, ready = $3
     WHERE id = $4 AND instructor_id = $5`,
    [next.name, next.members, next.ready, next.id, req.instructor.id]
  );

  res.json(mapGroup(next));
});

router.delete("/:id", async (req, res) => {
  const result = await db.query(
    "DELETE FROM groups WHERE id = $1 AND instructor_id = $2",
    [req.params.id, req.instructor.id]
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ error: "group not found" });
  }
  res.status(204).end();
});

export default router;
