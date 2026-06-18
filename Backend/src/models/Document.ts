import mongoose from "mongoose";
const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
    },

    extractedText: {
      type: String,
      required: true,
    },

    summary: {
      type: String,
      default: "",
    },

    summaries: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    quiz: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    quizzes: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    flashcards: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    flashcardDecks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    mindMap: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    mindMaps: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    chats: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    processingStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    lastGeneratedAt: {
      type: Date,
      default: null,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Document = mongoose.model("Document", documentSchema);