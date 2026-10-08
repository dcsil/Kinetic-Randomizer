import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { requireAuth, signToken } from "../auth.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "too many attempts, try again later" },
});

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

function readCredentials(body) {
  const username =
    typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  return { username, password };
}

function sessionResponse(instructor) {
  return {
    token: signToken(instructor),
    instructor: { id: instructor.id, name: instructor.display_name },
  };
}

router.post("/register", authLimiter, async (req, res) => {
  const { username, password } = readCredentials(req.body);
  const displayName =
    typeof req.body?.name === "string" && req.body.name.trim()
      ? req.body.name.trim()
      : username;

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: "username must be 3-32 characters: letters, numbers, . _ -",
    });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "password must be at least 8 characters" });
  }

  const instructor = {
    id: randomUUID(),
    username,
    display_name: displayName,
    password_hash: await bcrypt.hash(password, 12),
  };

  const result = await db.query(
    `INSERT INTO instructors (id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (username) DO NOTHING`,
    [instructor.id, instructor.username, instructor.display_name, instructor.password_hash]
  );
  if (result.rowCount === 0) {
    return res.status(409).json({ error: "username is already taken" });
  }

  res.status(201).json(sessionResponse(instructor));
});

router.post("/login", authLimiter, async (req, res) => {
  const { username, password } = readCredentials(req.body);
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const { rows } = await db.query(
    "SELECT id, display_name, password_hash FROM instructors WHERE username = $1",
    [username]
  );
  const instructor = rows[0];
  const valid =
    instructor && (await bcrypt.compare(password, instructor.password_hash));
  if (!valid) {
    return res.status(401).json({ error: "invalid username or password" });
  }

  res.json(sessionResponse(instructor));
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ instructor: req.instructor });
});

export default router;
