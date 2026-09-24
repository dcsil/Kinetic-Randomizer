import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  return res.json({ instructor: name });
});

export default router;
