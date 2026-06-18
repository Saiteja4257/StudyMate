import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { 
  summarizeDocument, 
  deleteSummary,
  generateQuizController, 
  generateFlashcardsController, 
  submitQuizAttempt,
  generateMindMapController,
  saveChatSession,
  deleteChatSession,
  chatWithDocument
} from "../controllers/aiController"; 

import { retrieveRelevantChunks } from "../services/ragService";

const router = Router();

router.use(protect);

router.post("/summarize/:id", summarizeDocument);
router.delete("/summarize/:id/:index", deleteSummary);

router.post("/quiz/:id", generateQuizController);

router.post("/flashcards/:id", generateFlashcardsController);

router.post("/quiz/:id/attempt", submitQuizAttempt);

router.get("/test-rag/:id", async (req, res) => {
  const docs = await retrieveRelevantChunks(
    req.params.id,
    "What is deadlock?"
  );
  res.json(docs);
});
router.get("/test-vector/:id", async (req, res) => {
  const docs =
    await retrieveRelevantChunks(
      req.params.id,
      "What is cloud storage?"
    );

  res.json(docs);
});
router.post("/chat/:id", chatWithDocument);
router.post("/chat/:id/save", saveChatSession);
router.delete("/chat/:id/:index", deleteChatSession);

router.post("/mindmap/:id", generateMindMapController);

export default router;
