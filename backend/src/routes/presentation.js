import { Router } from "express";
import db, { ensurePresentationState, getClassroom } from "../db.js";

const router = Router({ mergeParams: true });

function getState(classroomId) {
  ensurePresentationState(classroomId);
  const row = db
    .prepare(
      "SELECT order_json, current_index FROM presentation_state WHERE classroom_id = ?"
    )
    .get(classroomId);
  return {
    order: JSON.parse(row.order_json),
    currentIndex: row.current_index,
  };
}

router.get("/current", (req, res) => {
  if (!getClassroom(req.params.classroomId)) {
    return res.status(404).json({ error: "classroom not found" });
  }
  res.json(getState(req.params.classroomId));
});

router.post("/next", (req, res) => {
  if (!getClassroom(req.params.classroomId)) {
    return res.status(404).json({ error: "classroom not found" });
  }

  const { order, currentIndex } = getState(req.params.classroomId);
  const nextIndex =
    order.length === 0 ? 0 : Math.min(currentIndex + 1, order.length - 1);

  db.prepare(
    "UPDATE presentation_state SET current_index = ? WHERE classroom_id = ?"
  ).run(nextIndex, req.params.classroomId);

  res.json({ order, currentIndex: nextIndex });
});

export default router;
