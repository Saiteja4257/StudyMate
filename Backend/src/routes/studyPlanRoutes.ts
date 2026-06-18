import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  generateStudyPlanController,
  getStudyPlans,
  updateTaskStatus,
  deleteStudyPlan,
  getTaskContentController,
} from "../controllers/studyPlanController";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.post("/generate", generateStudyPlanController);
router.get("/", getStudyPlans);
router.patch("/task/:id/:taskId", updateTaskStatus);
router.get("/:id/task/:taskId/content", getTaskContentController);
router.delete("/:id", deleteStudyPlan);

export default router;
