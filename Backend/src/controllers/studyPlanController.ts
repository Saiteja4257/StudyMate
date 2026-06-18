import { Request, Response } from "express";
import { StudyPlan } from "../models/StudyPlan";
import { Document } from "../models/Document";
import { generateStudySchedule, generateTaskContent } from "../services/aiService";

// Helper to clean LLM JSON output
const cleanJsonResponse = (text: string | null | undefined): string => {
  let cleaned = (text ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  if (start > 0) {
    cleaned = cleaned.substring(start);
  }

  return cleaned;
};

export const generateStudyPlanController = async (req: any, res: any) => {
  try {
    const { examDate, availableHoursPerDay, subjects } = req.body;
    const userId = req.user.id;

    if (!examDate || !availableHoursPerDay || !subjects || subjects.length === 0) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Fetch user documents to get topics and weak topics
    const documents = await Document.find({ uploadedBy: userId });
    
    const allTopics = new Set<string>();
    const weakTopics = new Set<string>();

    documents.forEach((doc) => {
      // Only extract topics if the document was selected as a subject
      if (subjects.includes(doc.title) || subjects.includes(doc.title.replace(".pdf", ""))) {
        // Add document title as a general topic
        allTopics.add(doc.title.replace(".pdf", ""));

        // Extract weak topics from quizzes
        if (doc.quizzes && doc.quizzes.length > 0) {
          doc.quizzes.forEach((quiz: any) => {
            if (quiz.attempts && quiz.attempts.length > 0) {
              quiz.attempts.forEach((attempt: any) => {
                if (attempt.weakTopics) {
                  attempt.weakTopics.forEach((t: string) => weakTopics.add(t));
                }
              });
            }
          });
        }
        
        // If we have mind maps, we can add branch nodes as topics
        if (doc.mindMap && doc.mindMap.nodes) {
          doc.mindMap.nodes.forEach((n: any) => {
            if (n.type === 'branch') allTopics.add(n.label);
          });
        }
      }
    });

    const allTopicsArray = Array.from(allTopics).concat(subjects.map((s: string) => s.replace(".pdf", "")));
    const weakTopicsArray = Array.from(weakTopics);

    // Call AI to generate schedule
    const planString = await generateStudySchedule(
      new Date(examDate),
      Number(availableHoursPerDay),
      subjects,
      weakTopicsArray,
      allTopicsArray
    );

    const cleaned = cleanJsonResponse(planString);
    let planData: any[] = [];
    
    try {
      planData = JSON.parse(cleaned);
      if (!Array.isArray(planData)) {
        throw new Error("AI did not return an array");
      }
    } catch (e) {
      console.error("Failed to parse study plan JSON:", cleaned);
      return res.status(500).json({ success: false, message: "Failed to parse AI schedule." });
    }

    // Create unique IDs and init completed status
    const generatedPlan = planData.map((task) => ({
      ...task,
      id: task.id || Math.random().toString(36).substring(7),
      completed: false,
    }));

    // Save to DB
    const studyPlan = await StudyPlan.create({
      userId,
      examDate: new Date(examDate),
      availableHoursPerDay: Number(availableHoursPerDay),
      subjects,
      generatedPlan,
      progress: 0,
    });

    res.status(201).json({ success: true, studyPlan });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudyPlans = async (req: any, res: any) => {
  try {
    const studyPlans = await StudyPlan.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, studyPlans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTaskStatus = async (req: any, res: any) => {
  try {
    const { id, taskId } = req.params;
    const { completed } = req.body;

    const studyPlan = await StudyPlan.findOne({ _id: id, userId: req.user.id });
    
    if (!studyPlan) {
      return res.status(404).json({ success: false, message: "Study plan not found" });
    }

    const taskIndex = studyPlan.generatedPlan.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    studyPlan.generatedPlan[taskIndex].completed = completed;

    // Recalculate progress
    const totalTasks = studyPlan.generatedPlan.length;
    const completedTasks = studyPlan.generatedPlan.filter((t: any) => t.completed).length;
    studyPlan.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await studyPlan.save();

    res.status(200).json({ success: true, studyPlan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStudyPlan = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const studyPlan = await StudyPlan.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!studyPlan) {
      return res.status(404).json({ success: false, message: "Study plan not found" });
    }

    res.status(200).json({ success: true, message: "Study plan deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskContentController = async (req: any, res: any) => {
  try {
    const { id, taskId } = req.params;
    const studyPlan = await StudyPlan.findOne({ _id: id, userId: req.user.id });

    if (!studyPlan) {
      return res.status(404).json({ success: false, message: "Study plan not found" });
    }

    const taskIndex = studyPlan.generatedPlan.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const task = studyPlan.generatedPlan[taskIndex] as any;

    // Return cached content if it exists
    if (task.content) {
      return res.status(200).json({ success: true, content: task.content });
    }

    // Generate new content
    const rawContent = await generateTaskContent(task.topic, task.title);
    const cleaned = cleanJsonResponse(rawContent);
    let contentObj;

    try {
      contentObj = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse task content JSON:", cleaned);
      return res.status(500).json({ success: false, message: "Failed to parse AI content." });
    }

    // Save to DB
    studyPlan.generatedPlan[taskIndex].content = contentObj;
    
    // Mongoose mixed array update requires markModified
    studyPlan.markModified('generatedPlan');
    await studyPlan.save();

    res.status(200).json({ success: true, content: contentObj });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
