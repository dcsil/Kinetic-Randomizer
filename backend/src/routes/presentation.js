import { Router } from "express";
import db from "../db.js";

const router = Router();

export async function getState(instructorId) {
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

router.get("/current", async (req, res) => {
  res.json(await getState(req.instructor.id));
});

router.post("/next", async (req, res) => {
  const { order, currentIndex } = await getState(req.instructor.id);
  const nextIndex =
    order.length === 0 ? 0 : Math.min(currentIndex + 1, order.length - 1);

  await db.query(
    "UPDATE presentation_state SET current_index = $1 WHERE instructor_id = $2",
    [nextIndex, req.instructor.id]
  );

  res.json({ order, currentIndex: nextIndex });
});

export default router;
