import { Request, Response } from "express";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { Document } from "../models/Document";
import { processDocumentForRAG } from "../services/ragService";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { CacheKeys, CacheService, CacheTTL } from "../services/cache.service";

export const uploadDocument = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    // 1. Parse PDF directly from memory buffer
    const parser = new PDFParse({
    data: req.file.buffer
});

const pdfData = await (async () => {
    try {
        return await parser.getText();
    } finally {
        await parser.destroy();
    }
})();

    // 2. Upload buffer to Cloudinary
    const { secure_url, public_id } = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.originalname
    );

    // 3. Save document with Cloudinary URL and public_id
    const document = await Document.create({
      title: req.file.originalname,
      filePath: secure_url,
      cloudinaryPublicId: public_id, 
      extractedText: pdfData.text,
      uploadedBy: req.user?.id,
    });

    // 4. Run RAG chunking and embeddings
    await processDocumentForRAG(
      document._id.toString(),
      document.extractedText
    );

    const userId = req.user?.id || req.user?._id;
    if (userId) {
      await CacheService.deleteMany([
        CacheKeys.userDocs(userId.toString()),
        CacheKeys.dashboardAnalytics(userId.toString()),
      ]);
    }

    res.status(200).json({
      message: "PDF Uploaded and Parsed Successfully",
      documentId: document._id,
      title: document.title,
      url: document.filePath,
    });
  } catch (error) {
    console.error("Upload Document Error:", error);
    res.status(500).json({
      message: "Server Error during document upload",
    });
  }
};

export const getDocument = async (
  req: Request,
  res: Response
) => {
  try {
    const docId = String(req.params.id);
    const cacheKey = CacheKeys.docDetails(docId);
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    // Exclude extractedText from response — frontend never needs raw text
    const document = await Document.findById(docId).select("-extractedText").lean();
    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    await CacheService.set(cacheKey, document, CacheTTL.DOCUMENT);
    res.status(200).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
    });
  }
};

export const getAllDocuments = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req.user?.id || req.user?._id)?.toString();
    if (userId) {
      const cached = await CacheService.get(CacheKeys.userDocs(userId));
      if (cached) {
        return res.status(200).json(cached);
      }
    }

    // Only return documents belonging to the authenticated user
    const documents = await Document.find({ uploadedBy: req.user?.id })
      .select("title createdAt processingStatus summary quiz flashcards")
      .sort({ createdAt: -1 })
      .lean();

    if (userId) {
      await CacheService.set(CacheKeys.userDocs(userId), documents, CacheTTL.SHORT);
    }
    res.status(200).json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
    });
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response
) => {
  try {
    const document = await Document.findById(req.params.id) as any;

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // Verify ownership
    if (document.uploadedBy.toString() !== req.user?.id) {
      return res.status(403).json({
        message: "Not authorized to delete this document",
      });
    }

    // 1. Delete from Cloudinary if it has a public_id
    if (document.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(document.cloudinaryPublicId);
      } catch (cloudErr) {
        console.error("Cloudinary deletion warning:", cloudErr);
      }
    } 
    // Fallback: Delete from local disk for older legacy documents
    else if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // 2. Delete document record from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    await CacheService.invalidateAllForDocument(
      String(req.params.id),
      document.uploadedBy?.toString()
    );

    res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
    });
  }
};
