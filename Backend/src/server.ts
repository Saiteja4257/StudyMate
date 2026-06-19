import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/authRoutes";
import { connectDB } from "./config/db";
import documentRoutes from "./routes/documentRoutes";
import aiRoutes from "./routes/aiRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import studyPlanRoutes from "./routes/studyPlanRoutes";
import studySpaceRoutes from "./routes/studySpaceRoutes";
dotenv.config();

const app = express();

connectDB();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://study-mate-fawn.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/study-plan", studyPlanRoutes);
app.use("/api/study-space", studySpaceRoutes);

app.get("/", (_, res) => {
  res.send("StudyMate API Running");
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

const PORT = process.env.PORT || 5000;

// Global error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});