import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { embeddings } from "../config/embeddings";
import { askWithContext, generateVisualExplanation } from "./aiService";
import { DocumentChunk } from "../models/DocumentChunk";
import { Document } from "../models/Document";
import mongoose from "mongoose";
// Store vector stores in memory using documentId
// const vectorStores = new Map<string, MemoryVectorStore>();

export const processDocumentForRAG = async (
  documentId: string,
  text: string
) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.createDocuments(
    [text],
    [
      {
        documentId,
      },
    ]
  );

  const texts = chunks.map(
    (chunk) => chunk.pageContent
  );

  const vectors =
    await embeddings.embedDocuments(texts);

  console.log(
    "Embedding Dimensions:",
    vectors[0].length
  );

  // Remove old chunks if document is reprocessed
  await DocumentChunk.deleteMany({
    documentId,
  });

  const chunkDocs = chunks.map(
    (chunk, index) => ({
      documentId,
      text: chunk.pageContent,
      embedding: vectors[index],
      chunkIndex: index,
    })
  );

  await DocumentChunk.insertMany(
    chunkDocs
  );

  console.log(
    `Stored ${chunkDocs.length} chunks in Atlas`
  );
};

// Retrieve relevant chunks
export const retrieveRelevantChunks = async (
  documentId: string,
  question: string
) => {
  const queryEmbedding =
    await embeddings.embedQuery(question);

  const results =
    await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index", // your Atlas index name
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit: 5,
          filter: {
            documentId: new mongoose.Types.ObjectId(
            documentId
            ),
          },
        },
      },
      {
        $project: {
          text: 1,
          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ]);

  return results;
};

export const askDocument = async (
  documentId: string,
  question: string,
  chatHistory: { role: "user" | "assistant"; content: string }[] = []
) => {
  let docs: any[] = [];
  let context = "";

  try {
    docs = await retrieveRelevantChunks(documentId, question);
    if (docs && docs.length > 0) {
      context = docs.map((doc) => doc.text).join("\n\n");
    }
  } catch (error) {
    console.warn("Vector search failed, falling back to full document text:", error);
  }

  // Fallback to document extracted text if vector search failed or returned nothing
  if (!context) {
    const doc = await Document.findById(documentId);
    if (doc && doc.extractedText) {
      context = doc.extractedText.slice(0, 8000);
    }
  }

  const answer = await askWithContext(
    context,
    question,
    chatHistory
  );

  return {
    answer,
    sources: docs,
  };
};

export const askVisualDocument = async (
  documentId: string,
  question: string
) => {
  let docs: any[] = [];
  let context = "";

  try {
    docs = await retrieveRelevantChunks(documentId, question);
    if (docs && docs.length > 0) {
      context = docs.map((doc) => doc.text).join("\n\n");
    }
  } catch (error) {
    console.warn("Vector search failed, falling back to full document text:", error);
  }

  // Fallback to document extracted text if vector search failed or returned nothing
  if (!context) {
    const doc = await Document.findById(documentId);
    if (doc && doc.extractedText) {
      context = doc.extractedText.slice(0, 8000);
    }
  }

  const responseText = await generateVisualExplanation(context, question);
  
  return {
    visualData: responseText,
    sources: docs,
  };
};