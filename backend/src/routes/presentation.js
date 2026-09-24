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

router.post("/next", (_req, res) => {
  const { order, currentIndex } = getState();
  const nextIndex =
    order.length === 0 ? 0 : Math.min(currentIndex + 1, order.length - 1);

  db.prepare(
    "UPDATE presentation_state SET current_index = ? WHERE id = 1"
  ).run(nextIndex);

  res.json({ order, currentIndex: nextIndex });
});

export default router;
