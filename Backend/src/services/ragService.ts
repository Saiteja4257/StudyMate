import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { embeddings } from "../config/embeddings";
import { askWithContext } from "./aiService";
import { DocumentChunk } from "../models/DocumentChunk";
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
  const docs =
    await retrieveRelevantChunks(
      documentId,
      question
    );

  const context =
  docs
    .map((doc) => doc.text)
    .join("\n\n");

  const answer =
    await askWithContext(
      context,
      question,
      chatHistory
    );

  return {
    answer,
    sources: docs,
  };
};