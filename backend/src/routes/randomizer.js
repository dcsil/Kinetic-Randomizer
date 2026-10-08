import { Router } from "express";
import db from "../db.js";

const router = Router();

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

router.post("/order", async (req, res) => {
  const { rows: groups } = await db.query(
    "SELECT id, ready FROM groups WHERE instructor_id = $1",
    [req.instructor.id]
  );

  const ready = groups.filter((group) => group.ready);
  const notReady = groups.filter((group) => !group.ready);
  const order = [...shuffle(ready), ...notReady].map((group) => group.id);

  await db.query(
    `INSERT INTO presentation_state (instructor_id, order_json, current_index)
     VALUES ($1, $2::jsonb, 0)
     ON CONFLICT (instructor_id)
     DO UPDATE SET order_json = EXCLUDED.order_json, current_index = 0`,
    [req.instructor.id, JSON.stringify(order)]
  );

  res.json({ order });
});

export default router;
