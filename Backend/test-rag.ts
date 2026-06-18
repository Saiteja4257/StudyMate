import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { Document } from "./src/models/Document";
import { DocumentChunk } from "./src/models/DocumentChunk";
import { retrieveRelevantChunks } from "./src/services/ragService";

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB");
  
  const totalCount = await DocumentChunk.countDocuments({});
  console.log(`Total chunks in ENTIRE database: ${totalCount}`);

  const randomChunk = await DocumentChunk.findOne({});
  if (!randomChunk) {
    console.log("No chunks exist in the DB for any document.");
    process.exit(0);
  }
  
  const doc = await Document.findById(randomChunk.documentId);
  console.log("Testing retrieval for document:", doc?.title || "Unknown", randomChunk.documentId);

  const count = await DocumentChunk.countDocuments({ documentId: randomChunk.documentId });
  console.log(`Total chunks in DB for THIS document: ${count}`);

  try {
    const chunks = await retrieveRelevantChunks(randomChunk.documentId.toString(), "What is this document about?");
    console.log(`Retrieved ${chunks.length} chunks from vector search.`);
    
    if (chunks.length > 0) {
      console.log("First chunk score:", chunks[0].score);
      console.log("First chunk text snippet:", chunks[0].text.substring(0, 100) + "...");
    }
  } catch (error) {
    console.error("Error retrieving chunks:", error);
  }
  
  process.exit(0);
}

run();
