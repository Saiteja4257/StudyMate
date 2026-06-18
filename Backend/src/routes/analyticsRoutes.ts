import express from "express";
import { getDashboardAnalytics, getDocumentAnalytics } from "../controllers/analyticsController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", protect, getDocumentAnalytics);
router.get("/dashboard", protect, getDashboardAnalytics);
// Add dummy endpoints for the other specific paths requested if needed, but the dashboard returns everything.
router.get("/topic-performance", protect, getDashboardAnalytics);
router.get("/quiz-stats", protect, getDashboardAnalytics);
router.get("/study-progress", protect, getDashboardAnalytics);

export default router;
