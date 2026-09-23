import { Router } from "express";
import db, { mapGroup } from "../db.js";

const router = Router();

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

router.post("/order", (_req, res) => {
  const groups = db
    .prepare("SELECT id, name, members, ready FROM groups")
    .all()
    .map(mapGroup);

  const ready = groups.filter((g) => g.ready);
  const notReady = groups.filter((g) => !g.ready);
  const order = [...shuffle(ready), ...notReady].map((g) => g.id);

  db.prepare(
    "UPDATE presentation_state SET order_json = ?, current_index = 0 WHERE id = 1"
  ).run(JSON.stringify(order));

  res.json({ order });
});

export default router;
