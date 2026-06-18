import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('studymate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AnalyticsSummary {
  totalDocumentsUploaded: number;
  totalQuestionsAsked: number;
  totalQuizAttempts: number;
  averageQuizScore: number;
  studyPlanCompletionPercentage: number;
  weakTopics: string[];
  strongTopics: string[];
  topicPerformance: Record<string, number>;
  monthlyActivity: { name: string; activity: number }[];
  studyProgress: {
    completedTasks: number;
    remainingTasks: number;
    totalTasks: number;
  };
}

export const analyticsAPI = {
  getDashboard: () => API.get('/analytics/dashboard'),
  getTopicPerformance: () => API.get('/analytics/topic-performance'),
  getQuizStats: () => API.get('/analytics/quiz-stats'),
  getStudyProgress: () => API.get('/analytics/study-progress'),
};
