import { Router } from "express";
import db from "../db.js";

const router = Router();

function getState() {
  const row = db
    .prepare("SELECT order_json, current_index FROM presentation_state WHERE id = 1")
    .get();
  return {
    order: JSON.parse(row.order_json),
    currentIndex: row.current_index,
  };
}

router.get("/current", (_req, res) => {
  res.json(getState());
});

router.put("/current", (req, res) => {
  const state = getState();
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
    const groupIds = new Set(
      db
        .prepare("SELECT id FROM groups")
        .all()
        .map((row) => row.id)
    );
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

  db.prepare(
    "UPDATE presentation_state SET order_json = ?, current_index = ? WHERE id = 1"
  ).run(JSON.stringify(order), currentIndex);

  res.json({ order, currentIndex });
});

router.post("/next", (_req, res) => {
  const { order, currentIndex } = getState();
  const nextIndex =
    order.length === 0 ? 0 : Math.min(currentIndex + 1, order.length - 1);

  db.prepare("UPDATE presentation_state SET current_index = ? WHERE id = 1").run(
    nextIndex
  );

  res.json({ order, currentIndex: nextIndex });
});

export default router;
