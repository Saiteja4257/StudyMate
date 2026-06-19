import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema({
  front: { type: String, required: true },
  back: { type: String, required: true },
});

const quizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  answer: { type: String, required: true },
  explanation: { type: String },
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, required: true },
  summary: { type: String },
  detailedNotes: { type: String },
  keyConcepts: [{ type: String }],
  visualTopics: { type: mongoose.Schema.Types.Mixed }, // JSON for React Flow
  flashcards: [flashcardSchema],
  quizzes: [quizQuestionSchema],
  completed: { type: Boolean, default: false },
  contentGenerated: { type: Boolean, default: false }, // Flag to track if AI content is fully generated
});

const studySpaceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    topic: { type: String, required: true },

    goal: { type: String, required: true },
    description: { type: String },
    modules: [moduleSchema],
    progress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const StudySpace = mongoose.model("StudySpace", studySpaceSchema);
