import { Request, Response } from "express";
import { Document } from "../models/Document";
import {
  generateSummary,
  generateQuiz,
  generateFlashcards,
  analyzeQuizAttempt,
  generateMindMap,
  generateChatTitle,
} from "../services/aiService";

import { askDocument, askVisualDocument } from "../services/ragService"; 

// Helper to clean LLM JSON output
const cleanJsonResponse = (
  text: string | null | undefined
): string => {
  let cleaned = (text ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // Extract JSON object or array if extra text exists
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

export const summarizeDocument = async (
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

    const regenerate = req.query.regenerate === "true";

    // Cache-first: return stored summary if it exists and regenerate is not requested
    const existingSummaries = document.summaries && document.summaries.length > 0 
      ? document.summaries 
      : (document.summary ? [{ content: document.summary, createdAt: document.createdAt }] : []);

    if (existingSummaries.length > 0 && !regenerate) {
      return res.status(200).json({
        success: true,
        summary: existingSummaries[existingSummaries.length - 1].content,
        summaries: existingSummaries,
        cached: true,
      });
    }

    // Generate new summary via Groq
    const summaryText = await generateSummary(
      document.extractedText
    );
    let summary = summaryText ?? "";
    summary = summary.replace(/<think>[\s\S]*?<\/think>\n*/gi, "").trim();
    const newSummaryObj = { content: summary, createdAt: new Date() };
    const newSummaries = [...existingSummaries, newSummaryObj];

    // Save to MongoDB using findByIdAndUpdate to avoid VersionError
    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        summary: summary,
        summaries: newSummaries,
        lastGeneratedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      summary,
      summaries: newSummaries,
      cached: false,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteSummary = async (req: any, res: any) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.uploadedBy.toString() !== req.user?.id && document.uploadedBy.toString() !== req.user?._id) {
      return res.status(403).json({ message: "Not authorized to modify this document" });
    }

    const index = parseInt(req.params.index, 10);
    
    // Check if valid index
    let summaries = document.summaries && document.summaries.length > 0 
      ? document.summaries 
      : (document.summary ? [{ content: document.summary, createdAt: document.createdAt }] : []);

    if (isNaN(index) || index < 0 || index >= summaries.length) {
      return res.status(400).json({ message: "Invalid summary index" });
    }

    // Remove the summary
    summaries.splice(index, 1);
    
    // Determine the latest summary for the 'summary' field fallback
    const latestSummary = summaries.length > 0 ? summaries[summaries.length - 1].content : "";

    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        summary: latestSummary,
        summaries: summaries,
      },
    });

    res.status(200).json({
      success: true,
      message: "Summary deleted successfully",
      summaries
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateQuizController = async (
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

    const regenerate = req.query.regenerate === "true";

    // Cache-first: return stored quiz if it exists
    const existingQuizzes = document.quizzes && document.quizzes.length > 0 
      ? document.quizzes 
      : (document.quiz && document.quiz.length > 0 ? [{ questions: document.quiz, createdAt: document.createdAt }] : []);

    if (existingQuizzes.length > 0 && !regenerate) {
      return res.status(200).json({
        success: true,
        quiz: existingQuizzes[existingQuizzes.length - 1].questions,
        quizzes: existingQuizzes,
        cached: true,
      });
    }

    // Collect existing questions to avoid duplicates
    let existingQuestionTexts: string[] = [];
    existingQuizzes.forEach((quizObj: any) => {
      if (quizObj.questions) {
        quizObj.questions.forEach((q: any) => {
          if (q.question) existingQuestionTexts.push(q.question);
        });
      }
    });

    // Generate new quiz via Groq
    const quizText = await generateQuiz(
      document.extractedText,
      existingQuestionTexts
    );

    const cleaned = cleanJsonResponse(quizText);
    const quiz = JSON.parse(cleaned);
    const quizArray = Array.isArray(quiz) ? quiz : (quiz.questions || []);
    const newQuizObj = { questions: quizArray, createdAt: new Date() };
    const newQuizzes = [...existingQuizzes, newQuizObj];

    // Save to MongoDB using findByIdAndUpdate to avoid VersionError
    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        quiz: quizArray,
        quizzes: newQuizzes,
        lastGeneratedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      quiz: quizArray,
      quizzes: newQuizzes,
      cached: false,
    });
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const generateFlashcardsController = async (
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

    const regenerate = req.query.regenerate === "true";

    // Cache-first: return stored flashcards if they exist
    const existingDecks = document.flashcardDecks && document.flashcardDecks.length > 0 
      ? document.flashcardDecks 
      : (document.flashcards && document.flashcards.length > 0 ? [{ cards: document.flashcards, createdAt: document.createdAt }] : []);

    if (existingDecks.length > 0 && !regenerate) {
      return res.status(200).json({
        success: true,
        flashcards: existingDecks[existingDecks.length - 1].cards,
        flashcardDecks: existingDecks,
        cached: true,
      });
    }

    // Generate new flashcards via Groq
    const flashcardText = await generateFlashcards(
      document.extractedText
    );

    const cleaned = cleanJsonResponse(flashcardText);
    const flashcards = JSON.parse(cleaned);
    const flashcardsArray = Array.isArray(flashcards) ? flashcards : (flashcards.cards || []);
    const newDeckObj = { cards: flashcardsArray, createdAt: new Date() };
    const newDecks = [...existingDecks, newDeckObj];

    // Save to MongoDB using findByIdAndUpdate to avoid VersionError
    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        flashcards: flashcardsArray,
        flashcardDecks: newDecks,
        lastGeneratedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      flashcards: flashcardsArray,
      flashcardDecks: newDecks,
      cached: false,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const submitQuizAttempt = async (req: any, res: any) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this document",
      });
    }

    const { quizIndex, userAnswers, score } = req.body;
    
    if (!document.quizzes || !document.quizzes[quizIndex]) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    const quiz = document.quizzes[quizIndex];
    
    // Analyze weak topics
    const topicsStr = await analyzeQuizAttempt(quiz.questions, userAnswers);
    let weakTopics: string[] = [];
    
    if (typeof topicsStr === "string") {
      try {
        const cleaned = cleanJsonResponse(topicsStr);
        weakTopics = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse weak topics", topicsStr);
      }
    } else if (Array.isArray(topicsStr)) {
      weakTopics = topicsStr;
    }

    // Prepare attempt object
    const attempt = {
      score,
      userAnswers,
      weakTopics,
      createdAt: new Date()
    };

    // Update the specific quiz's attempts array
    const updatedQuizzes = [...document.quizzes];
    updatedQuizzes[quizIndex] = {
      ...quiz,
      attempts: [...(quiz.attempts || []), attempt]
    };

    await Document.findByIdAndUpdate(req.params.id, {
      $set: { quizzes: updatedQuizzes }
    });

    res.status(200).json({
      success: true,
      weakTopics
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const chatWithDocument =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const { question, chatHistory } = req.body;
      const documentId = req.params.id as string;
      const result =
        await askDocument(
          documentId,
          question,
          chatHistory || []
        );

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        message: error.message,
      });
    }
  };

export const generateMindMapController = async (
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

    const regenerate = req.query.regenerate === "true";

    // Cache-first: return stored mind map if it exists
    const existingMindMaps = document.mindMaps && document.mindMaps.length > 0
      ? document.mindMaps
      : (document.mindMap ? [{ data: document.mindMap, createdAt: document.createdAt }] : []);

    if (existingMindMaps.length > 0 && !regenerate) {
      return res.status(200).json({
        success: true,
        mindMap: existingMindMaps[existingMindMaps.length - 1].data,
        mindMaps: existingMindMaps,
        cached: true,
      });
    }

    // Generate new mind map via Groq
    const mindMapText = await generateMindMap(
      document.extractedText
    );

    const cleaned = cleanJsonResponse(mindMapText);
    
    let mindMapData: any;
    try {
      mindMapData = JSON.parse(cleaned);
    } catch (parseError) {
      // Attempt to repair truncated JSON from LLM
      console.warn("Mind map JSON parse failed, attempting repair...");
      let repaired = cleaned;

      // Remove any trailing incomplete object/entry (e.g. a partial {"id":... )
      // Find the last complete entry by looking for last '}' followed by ']'
      const lastCompleteNode = repaired.lastIndexOf('}]');
      if (lastCompleteNode === -1) {
        throw new Error("AI returned unparseable mind map data");
      }
      
      // Check if both nodes and edges arrays are present
      const nodesMatch = repaired.match(/"nodes"\s*:\s*\[/);
      const edgesMatch = repaired.match(/"edges"\s*:\s*\[/);
      
      if (nodesMatch && edgesMatch) {
        // Find where edges array ends — trim from last valid '}]'
        const edgesStart = repaired.indexOf('"edges"');
        const afterEdgesStart = repaired.substring(edgesStart);
        const lastValidClose = afterEdgesStart.lastIndexOf('}');
        
        if (lastValidClose > 0) {
          // Trim everything after last valid closing brace in edges, close arrays
          repaired = repaired.substring(0, edgesStart + lastValidClose + 1);
          // Count open vs close brackets and braces to balance
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          
          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
        }
      } else if (nodesMatch && !edgesMatch) {
        // Only nodes array present, create edges from node relationships
        // Trim nodes array and close it, add empty edges
        const nodesEnd = repaired.lastIndexOf('}');
        repaired = repaired.substring(0, nodesEnd + 1) + '],"edges":[]}';
      }
      
      try {
        mindMapData = JSON.parse(repaired);
        console.log("Mind map JSON repaired successfully");
      } catch (repairError) {
        console.error("JSON repair also failed:", repaired.substring(0, 200));
        throw new Error("AI returned truncated mind map data. Please try again.");
      }
    }

    // Validate structure
    if (!mindMapData.nodes || !Array.isArray(mindMapData.nodes) || mindMapData.nodes.length === 0) {
      throw new Error("Invalid mind map structure returned from AI");
    }
    
    // If edges are missing or empty, generate basic edges from node order
    if (!mindMapData.edges || !Array.isArray(mindMapData.edges) || mindMapData.edges.length === 0) {
      const centralNode = mindMapData.nodes.find((n: any) => n.type === 'central');
      if (centralNode) {
        mindMapData.edges = mindMapData.nodes
          .filter((n: any) => n.type === 'branch')
          .map((n: any) => ({ from: centralNode.id, to: n.id }));
        // Connect leaves to their nearest branch
        const branches = mindMapData.nodes.filter((n: any) => n.type === 'branch');
        let branchIdx = 0;
        mindMapData.nodes
          .filter((n: any) => n.type === 'leaf')
          .forEach((leaf: any) => {
            if (branches.length > 0) {
              mindMapData.edges.push({ from: branches[branchIdx % branches.length].id, to: leaf.id });
              branchIdx++;
            }
          });
      }
    }

    const newMindMapObj = { data: mindMapData, createdAt: new Date() };
    const newMindMaps = [...existingMindMaps, newMindMapObj];

    // Save to MongoDB
    await Document.findByIdAndUpdate(req.params.id, {
      $set: {
        mindMap: mindMapData,
        mindMaps: newMindMaps,
        lastGeneratedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      mindMap: mindMapData,
      mindMaps: newMindMaps,
      cached: false,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const saveChatSession = async (req: any, res: any) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (document.uploadedBy.toString() !== req.user.id && document.uploadedBy.toString() !== req.user._id?.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { chatIndex, messages, title } = req.body;
    let chats = document.chats ? [...document.chats] : [];

    if (chatIndex === null || chatIndex === undefined || chatIndex >= chats.length) {
      let finalTitle = title;
      if (!finalTitle && messages.length > 1) {
        try {
          finalTitle = await generateChatTitle(messages[1].content);
        } catch (e) {
          finalTitle = "New Chat";
        }
      }

      chats.push({
        title: finalTitle || "New Chat",
        messages,
        createdAt: new Date()
      });
    } else {
      chats[chatIndex] = {
        ...chats[chatIndex],
        messages,
        updatedAt: new Date()
      };
      if (title) chats[chatIndex].title = title;
    }

    await Document.findByIdAndUpdate(req.params.id, { $set: { chats } });

    res.status(200).json({ success: true, chats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteChatSession = async (req: any, res: any) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    if (document.uploadedBy.toString() !== req.user.id && document.uploadedBy.toString() !== req.user._id?.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const index = parseInt(req.params.index, 10);
    let chats = document.chats ? [...document.chats] : [];

    if (isNaN(index) || index < 0 || index >= chats.length) {
      return res.status(400).json({ message: "Invalid chat index" });
    }

    chats.splice(index, 1);

    await Document.findByIdAndUpdate(req.params.id, { $set: { chats } });

    res.status(200).json({ success: true, chats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const visualExplainDocument = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    const documentId = req.params.id as string;
    
    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const result = await askVisualDocument(documentId, question);
    
    const cleaned = cleanJsonResponse(result.visualData);
    let parsedData;
    
    try {
      parsedData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse visual data:", cleaned);
      return res.status(500).json({ message: "AI returned invalid visual data" });
    }

    res.json({
      success: true,
      data: parsedData,
      sources: result.sources,
    });
  } catch (error: any) {
    console.error("Visual explain error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};