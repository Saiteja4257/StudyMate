import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor to attach auth token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('studymate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for 401 handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('studymate_token');
      localStorage.removeItem('studymate_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const documentAPI = {
  getAll: () => API.get('/documents'),
  getById: (id: string) => API.get(`/documents/${id}`),
  delete: (id: string) => API.delete(`/documents/${id}`),
  upload: (formData: FormData) =>
    API.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const aiAPI = {
  generateSummary: (id: string, regenerate = false) =>
    API.post(`/ai/summarize/${id}${regenerate ? '?regenerate=true' : ''}`),
  deleteSummary: (id: string, index: number) =>
    API.delete(`/ai/summarize/${id}/${index}`),
  generateQuiz: (id: string, regenerate = false) =>
    API.post(`/ai/quiz/${id}${regenerate ? '?regenerate=true' : ''}`),
  generateFlashcards: (id: string, regenerate = false) =>
    API.post(`/ai/flashcards/${id}${regenerate ? '?regenerate=true' : ''}`),
  submitQuizAttempt: (id: string, quizIndex: number, userAnswers: string[], score: number) =>
    API.post(`/ai/quiz/${id}/attempt`, { quizIndex, userAnswers, score }),
  chat: (id: string, question: string, chatHistory: { role: string; content: string }[] = []) =>
    API.post(`/ai/chat/${id}`, { question, chatHistory }),
  generateMindMap: (documentId: string, regenerate?: boolean) =>
    API.post(`/ai/mindmap/${documentId}${regenerate ? '?regenerate=true' : ''}`),
  saveChat: (documentId: string, chatIndex: number | null, messages: any[], title?: string) =>
    API.post(`/ai/chat/${documentId}/save`, { chatIndex, messages, title }),
  deleteChat: (documentId: string, index: number) =>
    API.delete(`/ai/chat/${documentId}/${index}`),
};

export const analyticsAPI = {
  getAnalytics: (documentId?: string) => API.get(`/analytics${documentId ? `?documentId=${documentId}` : ''}`),
};

export const studyPlanAPI = {
  generate: (data: { examDate: Date; availableHoursPerDay: number; subjects: string[] }) => 
    API.post('/study-plan/generate', data),
  getAll: () => API.get('/study-plan'),
  updateTask: (planId: string, taskId: string, completed: boolean) => 
    API.patch(`/study-plan/task/${planId}/${taskId}`, { completed }),
  getTaskContent: (planId: string, taskId: string) => 
    API.get(`/study-plan/${planId}/task/${taskId}/content`),
  deletePlan: (id: string) => API.delete(`/study-plan/${id}`),
};

export default API;
