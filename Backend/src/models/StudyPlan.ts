import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["study", "revision", "quiz"],
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // stores { studyGuide: string, quiz: [] }
    default: null,
  },
});

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    availableHoursPerDay: {
      type: Number,
      required: true,
    },
    subjects: {
      type: [String],
      required: true,
    },
    generatedPlan: {
      type: [taskSchema],
      default: [],
    },
    progress: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);
