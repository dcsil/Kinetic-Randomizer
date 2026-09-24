import "dotenv/config";
import cors from "cors";
import express from "express";
import "./db.js";
import authRouter from "./routes/auth.js";
import classroomsRouter from "./routes/classrooms.js";
import studentsRouter from "./routes/students.js";
import groupsRouter from "./routes/groups.js";
import randomizerRouter from "./routes/randomizer.js";
import presentationRouter from "./routes/presentation.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: frontendOrigin }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/classrooms", classroomsRouter);
app.use("/api/students", studentsRouter);
app.use("/api/classrooms/:classroomId/groups", groupsRouter);
app.use("/api/classrooms/:classroomId/randomizer", randomizerRouter);
app.use("/api/classrooms/:classroomId/presentation", presentationRouter);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
