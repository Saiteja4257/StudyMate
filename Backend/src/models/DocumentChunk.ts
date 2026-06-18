import mongoose from "mongoose";

const documentChunkSchema =
  new mongoose.Schema(
    {
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        required: true,
      },

      text: {
        type: String,
        required: true,
      },

      embedding: {
        type: [Number],
        required: true,
      },

      chunkIndex: {
        type: Number,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

export const DocumentChunk =
  mongoose.model(
    "DocumentChunk",
    documentChunkSchema
  );