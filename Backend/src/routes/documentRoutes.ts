import { Router } from "express";

import { upload } from "../config/multer";
import { uploadDocument, getAllDocuments, getDocument, deleteDocument } from "../controllers/documentController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.post(
  "/upload",
  protect,
  upload.single("pdf"),
  uploadDocument
);

router.get(
  "/:id",
  protect,
  getDocument
);

router.get(
  "/",
  protect,
  getAllDocuments
);

router.delete(
  "/:id",
  protect,
  deleteDocument
);

export default router;