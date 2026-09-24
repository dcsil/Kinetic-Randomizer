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

router.put("/current", (req, res) => {
  const { classroomId } = req.params;
  if (!getClassroom(classroomId)) {
    return res.status(404).json({ error: "classroom not found" });
  }

  const state = getState(classroomId);
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
        .prepare("SELECT id FROM groups WHERE classroom_id = ?")
        .all(classroomId)
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
    "UPDATE presentation_state SET order_json = ?, current_index = ? WHERE classroom_id = ?"
  ).run(JSON.stringify(order), currentIndex, classroomId);

  res.json({ order, currentIndex });
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
