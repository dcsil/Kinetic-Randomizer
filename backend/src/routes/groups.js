import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { mapGroup } from "../db.js";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT id, name, members, ready FROM groups").all();
  res.json(rows.map(mapGroup));
});

router.post("/", (req, res) => {
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
    ready: 1,
  };
  db.prepare(
    "INSERT INTO groups (id, name, members, ready) VALUES (?, ?, ?, ?)"
  ).run(group.id, group.name, group.members, group.ready);

  res.status(201).json(mapGroup(group));
});

router.put("/:id", (req, res) => {
  const existing = db
    .prepare("SELECT id, name, members, ready FROM groups WHERE id = ?")
    .get(req.params.id);
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
    next.ready = req.body.ready ? 1 : 0;
  }

  db.prepare(
    "UPDATE groups SET name = ?, members = ?, ready = ? WHERE id = ?"
  ).run(next.name, next.members, next.ready, next.id);

  res.json(mapGroup(next));
});

router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM groups WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "group not found" });
  }
  res.status(204).end();
});

export default router;
