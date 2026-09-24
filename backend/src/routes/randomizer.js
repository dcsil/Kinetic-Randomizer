import { Router } from "express";
import db, { ensurePresentationState, getClassroom, mapGroup } from "../db.js";

const router = Router({ mergeParams: true });

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

router.post("/order", (req, res) => {
  if (!getClassroom(req.params.classroomId)) {
    return res.status(404).json({ error: "classroom not found" });
  }

  const groups = db
    .prepare(
      "SELECT id, classroom_id, name, ready FROM groups WHERE classroom_id = ?"
    )
    .all(req.params.classroomId)
    .map(mapGroup);

  const ready = groups.filter((group) => group.ready);
  const notReady = groups.filter((group) => !group.ready);
  const order = [...shuffle(ready), ...notReady].map((group) => group.id);

  ensurePresentationState(req.params.classroomId);
  db.prepare(
    "UPDATE presentation_state SET order_json = ?, current_index = 0 WHERE classroom_id = ?"
  ).run(JSON.stringify(order), req.params.classroomId);

  res.json({ order });
});

export default router;
