import { Router } from "express";
import db from "../db.js";

const router = Router();

async function getState(instructorId) {
  const { rows } = await db.query(
    "SELECT order_json, current_index FROM presentation_state WHERE instructor_id = $1",
    [instructorId]
  );
  const row = rows[0];
  return {
    order: row ? row.order_json : [],
    currentIndex: row ? row.current_index : 0,
  };
}

async function saveState(instructorId, order, currentIndex) {
  await db.query(
    `INSERT INTO presentation_state (instructor_id, order_json, current_index)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (instructor_id)
     DO UPDATE SET order_json = EXCLUDED.order_json,
                   current_index = EXCLUDED.current_index`,
    [instructorId, JSON.stringify(order), currentIndex]
  );
}

router.get("/current", async (req, res) => {
  res.json(await getState(req.instructor.id));
});

router.put("/current", async (req, res) => {
  const state = await getState(req.instructor.id);
  let order = state.order;

  if (req.body?.order !== undefined) {
    const next = req.body.order;
    if (
      !Array.isArray(next) ||
      !next.every((id) => typeof id === "string") ||
      new Set(next).size !== next.length
    ) {
      return res.status(400).json({ error: "order must be a list of unique group ids" });
    }
    const { rows } = await db.query(
      "SELECT id FROM groups WHERE instructor_id = $1",
      [req.instructor.id]
    );
    const groupIds = new Set(rows.map((row) => row.id));
    if (!next.every((id) => groupIds.has(id))) {
      return res.status(400).json({ error: "order contains unknown groups" });
    }
    order = next;
  }

  let currentIndex = state.currentIndex;
  if (req.body?.currentIndex !== undefined) {
    currentIndex = req.body.currentIndex;
    if (!Number.isInteger(currentIndex) || currentIndex < 0) {
      return res.status(400).json({ error: "currentIndex must be a non-negative integer" });
    }
  }
  currentIndex = order.length === 0 ? 0 : Math.min(currentIndex, order.length - 1);

  await saveState(req.instructor.id, order, currentIndex);
  res.json({ order, currentIndex });
});

router.post("/next", async (req, res) => {
  const { order, currentIndex } = await getState(req.instructor.id);
  const nextIndex =
    order.length === 0 ? 0 : Math.min(currentIndex + 1, order.length - 1);

  await saveState(req.instructor.id, order, nextIndex);
  res.json({ order, currentIndex: nextIndex });
});

export default router;
