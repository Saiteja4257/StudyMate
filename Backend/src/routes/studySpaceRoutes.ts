import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  generateStudySpace,
  getStudySpaces,
  getStudySpaceById,
  getModuleContent,
  updateModuleProgress,
  deleteStudySpace,
  askTutor,
} from "../controllers/studySpaceController";

const router = express.Router();

router.use(protect);

router.post("/generate", generateStudySpace);
router.get("/", getStudySpaces);
router.get("/:id", getStudySpaceById);
router.get("/:id/module/:moduleId/content", getModuleContent);
router.patch("/:id/module/:moduleId/progress", updateModuleProgress);
router.delete("/:id", deleteStudySpace);
router.post("/:id/module/:moduleId/ask", askTutor);

export default router;
