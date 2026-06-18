import { Request, Response } from "express";
import fs from "fs";
import pdfParse from "pdf-parse";
import { Document } from "../models/Document";
import { processDocumentForRAG } from "../services/ragService";
export const uploadDocument = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
      });
    }

    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);

    const document = await Document.create({
      title: req.file.originalname,
      filePath: req.file.path,
      extractedText: pdfData.text,
      uploadedBy: req.user?.id,
    });
    await processDocumentForRAG(
    document._id.toString(),
    document.extractedText
    );

    res.status(200).json({
      message: "PDF Parsed Successfully",
      documentId: document._id,
      title: document.title,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server Error",
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
    // Only select fields needed for the sidebar list
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
    const document = await Document.findById(req.params.id);

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

    // Delete the file from disk if it exists
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

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