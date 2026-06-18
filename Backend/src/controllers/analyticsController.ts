import { Request, Response } from "express";
import { Document } from "../models/Document";
import { StudyPlan } from "../models/StudyPlan";

export const getDashboardAnalytics = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;

    const documents = await Document.find({ uploadedBy: userId });
    const studyPlans = await StudyPlan.find({ userId });

    // 1. Basic Counts
    const totalDocumentsUploaded = documents.length;
    
    // 2. Quiz Stats & Topic Mastery
    let totalQuestionsAsked = 0;
    let totalQuizAttempts = 0;
    let totalScoreSum = 0;
    let totalPossiblePoints = 0;
    
    const weakTopicsMap = new Map<string, number>();
    const topicScores = new Map<string, { total: number, count: number }>();
    
    // Monthly Activity (Simple mock based on doc uploads and plan creation)
    const currentMonth = new Date().toLocaleString('default', { month: 'short' });
    let currentMonthActivity = 0;

    documents.forEach((doc) => {
      // Real monthly activity is handled later

      // Quiz analytics
      if (doc.quizzes && doc.quizzes.length > 0) {
        doc.quizzes.forEach((quiz: any) => {
          totalQuestionsAsked += (quiz.questions?.length || 0);
          
          if (quiz.attempts && quiz.attempts.length > 0) {
            totalQuizAttempts += quiz.attempts.length;
            
            quiz.attempts.forEach((attempt: any) => {
              if (typeof attempt.score === 'number') {
                totalScoreSum += attempt.score;
                const possiblePoints = quiz.questions?.length || 1;
                totalPossiblePoints += possiblePoints;
                
                // Track topic mastery score (as a percentage for this attempt)
                const percentage = (attempt.score / possiblePoints) * 100;
                const docTitle = doc.title.replace('.pdf', '');
                const currentScore = topicScores.get(docTitle) || { total: 0, count: 0 };
                topicScores.set(docTitle, { 
                  total: currentScore.total + percentage, 
                  count: currentScore.count + 1 
                });
              }

              if (attempt.weakTopics) {
                attempt.weakTopics.forEach((topic: string) => {
                  weakTopicsMap.set(topic, (weakTopicsMap.get(topic) || 0) + 1);
                });
              }
            });
          }
        });
      }
    });

    const averageQuizScore = totalPossiblePoints > 0 ? Math.round((totalScoreSum / totalPossiblePoints) * 100) : 0;

    // Sort and identify strong/weak topics
    const weakTopicsArray = Array.from(weakTopicsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 5); // top 5 weak topics

    const topicPerformance: Record<string, number> = {};
    const strongTopicsArray: string[] = [];

    topicScores.forEach((value, key) => {
      const avg = Math.round(value.total / value.count);
      topicPerformance[key] = avg;
      if (avg >= 80) strongTopicsArray.push(key);
    });

    // 3. Study Plan Progress
    let totalTasks = 0;
    let completedTasks = 0;

    studyPlans.forEach((plan) => {
      // Real monthly activity is handled later

      if (plan.generatedPlan) {
        totalTasks += plan.generatedPlan.length;
        completedTasks += plan.generatedPlan.filter((t: any) => t.completed).length;
      }
    });

    const studyPlanCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Monthly Activity trend (Real data for last 6 months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthIdx = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyActivity: { name: string; year: number; monthIdx: number; activity: number; }[] = [];
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      let monthIdx = currentMonthIdx - i;
      let year = currentYear;
      if (monthIdx < 0) {
        monthIdx += 12;
        year -= 1;
      }
      monthlyActivity.push({
        name: months[monthIdx],
        year: year,
        monthIdx: monthIdx,
        activity: 0
      });
    }

    // Populate with real data
    documents.forEach((doc) => {
      const date = new Date(doc.createdAt || new Date());
      const docMonth = date.getMonth();
      const docYear = date.getFullYear();
      const monthObj = monthlyActivity.find(m => m.monthIdx === docMonth && m.year === docYear);
      if (monthObj) monthObj.activity++;
    });

    studyPlans.forEach((plan) => {
      const date = new Date(plan.createdAt || new Date());
      const planMonth = date.getMonth();
      const planYear = date.getFullYear();
      const monthObj = monthlyActivity.find(m => m.monthIdx === planMonth && m.year === planYear);
      if (monthObj) monthObj.activity++;
    });

    // Remove year/monthIdx before sending to frontend
    const finalMonthlyActivity = monthlyActivity.map(({ name, activity }) => ({ name, activity }));

    // Prepare response
    res.status(200).json({
      totalDocumentsUploaded,
      totalQuestionsAsked,
      totalQuizAttempts,
      averageQuizScore,
      studyPlanCompletionPercentage,
      weakTopics: weakTopicsArray,
      strongTopics: strongTopicsArray,
      topicPerformance,
      monthlyActivity: finalMonthlyActivity,
      studyProgress: {
        completedTasks,
        remainingTasks: totalTasks - completedTasks,
        totalTasks
      }
    });

  } catch (error: any) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};

export const getDocumentAnalytics = async (req: any, res: Response) => {
  try {
    const documentId = req.query.documentId;
    const userId = req.user?.id || req.user?._id;

    if (!documentId) {
      return getDashboardAnalytics(req, res);
    }

    const document = await Document.findOne({ _id: documentId, uploadedBy: userId });
    
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const totalSummaries = document.summaries?.length || (document.summary ? 1 : 0);
    const totalQuizzes = document.quizzes?.length || (document.quiz?.length > 0 ? 1 : 0);
    const totalFlashcards = document.flashcardDecks?.length || (document.flashcards?.length > 0 ? 1 : 0);

    const stats = {
      totalDocuments: 1,
      totalSummaries,
      totalQuizzes,
      totalFlashcards,
    };

    const weakTopicsMap = new Map<string, number>();

    if (document.quizzes && document.quizzes.length > 0) {
      document.quizzes.forEach((q: any) => {
        if (q.attempts && q.attempts.length > 0) {
          q.attempts.forEach((attempt: any) => {
            if (attempt.weakTopics) {
              attempt.weakTopics.forEach((topic: string) => {
                weakTopicsMap.set(topic, (weakTopicsMap.get(topic) || 0) + 1);
              });
            }
          });
        }
      });
    }

    const weakTopics = Array.from(weakTopicsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => ({ name: entry[0], count: entry[1] }))
      .slice(0, 5);

    return res.status(200).json({ stats, weakTopics });

  } catch (error: any) {
    console.error("Document Analytics Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch document analytics" });
  }
};
