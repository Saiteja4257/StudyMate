import { Request, Response } from "express";
import fs from "fs";
import pdfParse from "pdf-parse";
import { Document } from "../models/Document";
import { processDocumentForRAG } from "../services/ragService";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../config/cloudinary";

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
    const pdfData = await pdfParse(req.file.buffer);

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
    // Exclude extractedText from response — frontend never needs raw text
    const document = await Document.findById(req.params.id).select("-extractedText");
    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }
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
    // Only return documents belonging to the authenticated user
    const documents = await Document.find({ uploadedBy: req.user?.id })
      .select("title createdAt processingStatus summary quiz flashcards")
      .sort({ createdAt: -1 });
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
