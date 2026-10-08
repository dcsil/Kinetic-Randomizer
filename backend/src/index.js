import "dotenv/config";
import cors from "cors";
import express from "express";
import db, { initDb } from "./db.js";
import { requireAuth } from "./auth.js";
import authRouter from "./routes/auth.js";
import studentsRouter from "./routes/students.js";
import groupsRouter from "./routes/groups.js";
import randomizerRouter from "./routes/randomizer.js";
import presentationRouter from "./routes/presentation.js";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/healthz", async (_req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "database unavailable" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/students", requireAuth, studentsRouter);
app.use("/api/groups", requireAuth, groupsRouter);
app.use("/api/randomizer", requireAuth, randomizerRouter);
app.use("/api/presentation", requireAuth, presentationRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

await initDb();

const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

function shutdown() {
  server.close(() => {
    db.end().finally(() => process.exit(0));
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
