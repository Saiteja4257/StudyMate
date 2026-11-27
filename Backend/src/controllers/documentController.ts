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

    const userId = (req.user?.id || req.user?._id)?.toString();

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // 1. Validate PDF
    const buffer = req.file.buffer;

    if (!buffer.subarray(0, 1024).includes("%PDF-")) {
      return res.status(400).json({
        message: "Invalid PDF file",
      });
    }

    // 2. Parse PDF
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
    });

    const pdfData = await (async () => {
      try {
        return await parser.getText();
      } finally {
        await parser.destroy();
      }
    })();

    console.log("PDF parsing completed");

    if (!pdfData.text.trim()) {
      return res.status(422).json({
        message: "No readable text found in PDF",
      });
    }

    // 3. Upload to Cloudinary
    const { secure_url, public_id } =
      await uploadBufferToCloudinary(
        buffer,
        req.file.originalname
      );

    console.log("Cloudinary upload completed");

    // 4. Save in MongoDB
    const document = await Document.create({
      title: req.file.originalname,
      filePath: secure_url,
      cloudinaryPublicId: public_id,
      extractedText: pdfData.text,
      uploadedBy: userId,
    });

    console.log("Document saved:", document._id);

    // 5. Immediately invalidate Redis cache
    await CacheService.deleteMany([
      CacheKeys.userDocs(userId),
      CacheKeys.dashboardAnalytics(userId),
    ]);

    console.log("Redis cache invalidated");

    // 6. Run RAG processing
    let ragCompleted = false;

    try {
      console.log("RAG processing started");

      await processDocumentForRAG(
        document._id.toString(),
        document.extractedText
      );

      ragCompleted = true;

      console.log("RAG processing completed");
    } catch (ragError) {
      console.error("RAG processing failed:", ragError);
    }

    // 7. Invalidate caches after RAG processing
    await CacheService.deleteMany([
      CacheKeys.userDocs(userId),
      CacheKeys.dashboardAnalytics(userId),
      CacheKeys.docDetails(document._id.toString()),
    ]);

    // 8. Return response
    return res.status(201).json({
      message: ragCompleted
        ? "PDF uploaded and processed successfully"
        : "PDF uploaded, but AI processing failed",
      documentId: document._id,
      title: document.title,
      url: document.filePath,
      ragCompleted,
    });

  } catch (error) {
    console.error("Upload Document Error:", error);

    return res.status(500).json({
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
