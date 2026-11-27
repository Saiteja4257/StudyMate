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
import rateLimit from "express-rate-limit";
dotenv.config();

const app = express();

connectDB();

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://studymate-8.vercel.app"
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests. Please try again later."
    }
});

app.use("/api", apiLimiter);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/study-plan", studyPlanRoutes);
app.use("/api/study-space", studySpaceRoutes);
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime()
    });
});

app.get("/", (_, res) => {
  res.send("StudyMate API Running");
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server Error" });
});

const PORT = Number(process.env.PORT) || 5000;

// Global error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT,"0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});