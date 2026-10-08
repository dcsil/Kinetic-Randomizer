import { randomUUID } from "node:crypto";
import { Router } from "express";
import db, { fetchGroups, withTransaction } from "../db.js";

const router = Router();

class BadRequest extends Error {}

function readStudentIds(body) {
  if (!Array.isArray(body?.studentIds)) return null;
  return [...new Set(body.studentIds.filter((id) => typeof id === "string"))];
}

async function assertStudentsUsable(client, instructorId, studentIds, excludeGroupId = null) {
  if (studentIds.length === 0) return;

  const { rows: owned } = await client.query(
    "SELECT id FROM students WHERE instructor_id = $1 AND id = ANY($2::text[])",
    [instructorId, studentIds]
  );
  if (owned.length !== studentIds.length) {
    throw new BadRequest("one or more students were not found");
  }

  const { rows: taken } = await client.query(
    `SELECT s.name, g.name AS group_name
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     JOIN students s ON s.id = gm.student_id
     WHERE gm.student_id = ANY($1::text[])
       AND ($2::text IS NULL OR g.id != $2)
     LIMIT 1`,
    [studentIds, excludeGroupId]
  );
  if (taken.length > 0) {
    throw new BadRequest(`${taken[0].name} is already in ${taken[0].group_name}`);
  }
}

async function replaceMembers(client, groupId, studentIds) {
  await client.query("DELETE FROM group_members WHERE group_id = $1", [groupId]);
  if (studentIds.length > 0) {
    await client.query(
      `INSERT INTO group_members (group_id, student_id)
       SELECT $1, unnest($2::text[])`,
      [groupId, studentIds]
    );
  }
}

function sendBadRequest(res, err) {
  if (err instanceof BadRequest) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}

router.get("/", async (req, res) => {
  res.json(await fetchGroups(req.instructor.id));
});

router.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const studentIds = readStudentIds(req.body) ?? [];
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  const id = randomUUID();
  try {
    const group = await withTransaction(async (client) => {
      await assertStudentsUsable(client, req.instructor.id, studentIds);
      await client.query(
        "INSERT INTO groups (id, instructor_id, name, ready) VALUES ($1, $2, $3, TRUE)",
        [id, req.instructor.id, name]
      );
      await replaceMembers(client, id, studentIds);
      return (await fetchGroups(req.instructor.id, id, client))[0];
    });
    res.status(201).json(group);
  } catch (err) {
    if (!sendBadRequest(res, err)) throw err;
  }
});

router.put("/:id", async (req, res) => {
  const [existing] = await fetchGroups(req.instructor.id, req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "group not found" });
  }

  const next = { name: existing.name, ready: existing.ready };
  if (typeof req.body?.name === "string") {
    const name = req.body.name.trim();
    if (!name) {
      return res.status(400).json({ error: "name cannot be empty" });
    }
    next.name = name;
  }
  if (typeof req.body?.ready === "boolean") {
    next.ready = req.body.ready;
  }
  const studentIds = readStudentIds(req.body);

  try {
    const group = await withTransaction(async (client) => {
      if (studentIds) {
        await assertStudentsUsable(client, req.instructor.id, studentIds, existing.id);
      }
      await client.query(
        "UPDATE groups SET name = $1, ready = $2 WHERE id = $3 AND instructor_id = $4",
        [next.name, next.ready, existing.id, req.instructor.id]
      );
      if (studentIds) {
        await replaceMembers(client, existing.id, studentIds);
      }
      return (await fetchGroups(req.instructor.id, existing.id, client))[0];
    });
    res.json(group);
  } catch (err) {
    if (!sendBadRequest(res, err)) throw err;
  }
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
