import axios, { AxiosResponse } from "axios";
export interface Quiz {
  id?: string;
  cohortId: string;
  weekNumber: number;
  questions: Question[];
}
interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface Option {
  id?: string;
  optionText: string;
  isCorrect?: boolean;
}

export interface Question {
  id?: string;
  questionText: string;
  questionType: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  options: Option[];
}

export interface QuizAttemptData {
  quizId: string;
  answers: Array<{
    questionId: string;
    selectedOptionId?: string;
    shortAnswerText?: string;
  }>;
}

export interface PlanTaskCreate {
  resource_id: string;
  is_completed: boolean;
}

export interface TaskInPlan {
  id: string;
  resource_id: string;
  is_completed: boolean;
  time_spent_seconds: number;
  resource: Resource;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

export interface QuizAttemptStatus {
  hasAttempted: boolean;
  lastAttemptId?: string;
}

export interface Plan {
  id: string;
  cohort_id: string;
  week_number: number;
  tasks: TaskInPlan[];
}

export interface GenericTask {
  id: string;
  resource_id: string;
  is_completed: boolean;
}

export interface Streak {
  currentStreak: number;
  weeklyStreak?: number;
  lastCompletedDate?: string | null;
}

export interface WeeklyProgress {
  week: number;
  completedTasks: number;
  totalTasks: number;
  progress: number;
}

export interface QuizFeedbackData {
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_questions: number;
  attempt_id?: string;
  feedback_text: string;
}

export interface Resource {
  id: string;
  title: string;
  type: "VIDEO" | "ARTICLE" | "DOCUMENT" | "QUIZ";
  url: string;
  duration: number;
  tags: string[];
  isOptional?: boolean;
}

export interface WeekResource {
  week: number;
  resources: Resource[];
}

export interface LeaderboardEntry {
  email: string;
  completionRate: number;
  dailyStreak: number;
  weeklyStreak: number;
  shortestCompletionTime: number;
}

interface Cohort {
  id: string;
  name: string;
  totalWeeks: number;
}

interface DashboardMetrics {
  total_learners: number;
  total_resources: number;
  completion_percentage: number;
  average_streak: number;
  monthlyProgress: Array<{
    month: string;
    completionRate: number;
  }>;
  learnerProgress: Array<{
    learnerId: string;
    completedTasks: number;
    totalTasks: number;
    currentStreak: number;
  }>;
}

// const API_BASE_URL = "http://localhost:8000";
// const API_BASE_URL = "https://one00x-be.onrender.com";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      localStorage.clear();
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const auth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },
  signup: async (
    email: string,
    password: string,
    role: string,
    cohortId?: string,
    name?: string,
    phoneNumber?: string
  ): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/signup", {
      email,
      password,
      role,
      cohortId,
      name,
      phoneNumber,
    });
    return response.data;
  },
};

// Learner APIs
export const learner = {
  createPlan: async (
    cohortId: string,
    tasks: PlanTaskCreate[]
  ): Promise<Plan> => {
    const response = await api.post<Plan>("/api/plans", { cohortId, tasks });
    return response.data;
  },
  trackResourceTime: async (
    taskId: string,
    timeSpentSeconds: number
  ): Promise<void> => {
    await api.post(`/api/track-resource-time`, { taskId, timeSpentSeconds });
  },
  trackQuizTime: async (
    quizId: string,
    timeSpentSeconds: number
  ): Promise<void> => {
    await api.post(`/api/track-quiz-time`, { quizId, timeSpentSeconds });
  },
  getPlan: async (
    cohortId: string,
    weekNumber?: number
  ): Promise<Plan | null> => {
    const url =
      weekNumber !== undefined
        ? `/api/plans/${cohortId}?week_number=${weekNumber}`
        : `/api/plans/${cohortId}`;
    const response = await api.get<{
      success: boolean;
      data: Plan | null;
      message: string;
    }>(url);
    return response.data.data;
  },
  completeTask: async (taskId: string): Promise<GenericTask> => {
    const response = await api.patch<{
      success: boolean;
      data: { task: GenericTask; streak: Streak };
      message: string;
    }>(`/api/tasks/${taskId}/complete`);
    return response.data.data.task;
  },
  getStreak: async (): Promise<Streak> => {
    const response = await api.get<{
      success: boolean;
      data: Streak;
      message: string;
    }>("/api/streaks/me");
    return response.data.data;
  },
  getWeeklyProgress: async (): Promise<WeeklyProgress[]> => {
    const response = await api.get<{
      success: boolean;
      data: WeeklyProgress[];
      message: string;
    }>("/api/progress/weekly");
    return response.data.data;
  },
  getCurrentCohort: async (): Promise<Cohort> => {
    const response = await api.get<{
      success: boolean;
      data: Cohort;
      message: string;
    }>("/api/cohorts/current");
    return response.data.data;
  },
  getAllResources: async (cohortId: string): Promise<WeekResource[]> => {
    const response = await api.get<{
      success: boolean;
      data: WeekResource[];
      message: string;
    }>(`/api/resources/all_by_cohort/${cohortId}`);
    return response.data.data;
  },
  getLeaderboard: async (): Promise<LeaderboardEntry[]> => {
    const response = await api.get<{
      success: boolean;
      data: LeaderboardEntry[];
      message: string;
    }>("/api/leaderboard");
    return response.data.data;
  },
  getQuiz: async (
    quizId: string
  ): Promise<{
    success: boolean;
    data: Quiz;
    message: string;
  }> => {
    const response = await api.get<{
      success: boolean;
      data: Quiz;
      message: string;
    }>(`/api/quizzes/${quizId}`);
    return response.data;
  },
  submitQuizAttempt: async (
    quizId: string,
    answers: { questionId: string; selectedOptionId: string }[]
  ): Promise<{ attempt_id: string }> => {
    const response = await api.post<{ attempt_id: string }>(
      `/api/quiz-attempts`,
      { quizId, answers }
    );
    return response.data;
  },
  getQuizFeedback: async (attemptId: string): Promise<QuizFeedbackData> => {
    const response = await api.get<{
      success: boolean;
      data: QuizFeedbackData;
      message: string;
    }>(`/api/quiz-attempts/${attemptId}/feedback`);
    return response.data.data;
  },
  getQuizAttemptStatus: async (quizId: string): Promise<QuizAttemptStatus> => {
    const response = await api.get<{
      success: boolean;
      data: QuizAttemptStatus;
      message: string;
    }>(`/api/quiz-attempts/${quizId}/status`);
    return response.data.data;
  },
};

// Instructor APIs
export const instructor = {
  assignResourcesToWeek: async (
    cohortId: string,
    weekNumber: number,
    resources: Omit<Resource, "id" | "isOptional">[]
  ): Promise<Resource[]> => {
    const response = await api.post<{
      success: boolean;
      data: Resource[];
      message: string;
    }>(`/api/resources/${cohortId}/${weekNumber}`, resources);
    return response.data.data;
  },
  generateQuizFromAI: async (
    cohortId: string,
    weekNumber: number,
    transcription: string
  ): Promise<Quiz> => {
    const response = await api.post<Quiz>("/api/quizzes/generate-ai", {
      cohortId,
      weekNumber,
      transcription,
    });
    return response.data;
  },
  deleteWeekResources: async (
    cohortId: string,
    weekNumber: number
  ): Promise<void> => {
    await api.delete(`/api/resources/${cohortId}/${weekNumber}`);
  },
  deleteResource: async (
    resourceId: string,
    weekNumber?: number
  ): Promise<void> => {
    // Ensure resourceId doesn't contain any trailing segments
    const cleanResourceId = resourceId.split("/")[0];
    await api.delete(`/api/resources/${cleanResourceId}`);
  },
  getResources: async (
    cohortId: string,
    weekNumber: number
  ): Promise<Resource[]> => {
    const response = await api.get<Resource[]>(
      `/api/resources/${cohortId}/${weekNumber}`
    );
    return response.data;
  },
  getAllResources: async (cohortId: string): Promise<WeekResource[]> => {
    const response = await api.get<{
      success: boolean;
      data: WeekResource[];
      message: string;
    }>(`/api/resources/all_by_cohort/${cohortId}`);
    return response.data.data;
  },
  getDashboard: async (cohortId: string): Promise<DashboardMetrics> => {
    const response = await api.get<{
      success: boolean;
      data: DashboardMetrics;
      message: string;
    }>(`/api/dashboard/${cohortId}`);
    return response.data.data;
  },
  getCohorts: async (): Promise<Cohort[]> => {
    const response = await api.get<{
      success: boolean;
      data: Cohort[];
      message: string;
    }>("/api/cohorts");
    return response.data.data;
  },
  createCohort: async (cohortData: {
    name: string;
    totalWeeks: number;
  }): Promise<
    AxiosResponse<{ success: boolean; data: Cohort; message: string }>
  > => {
    const response = await api.post<{
      success: boolean;
      data: Cohort;
      message: string;
    }>("/api/cohorts", cohortData);
    return response;
  },
  getQuizzes: async (cohortId?: string): Promise<Quiz[]> => {
    const response = await api.get<{
      success: boolean;
      data: Quiz[];
      message: string;
    }>("/api/quizzes", {
      params: { cohortId },
    });
    return response.data.data;
  },
  createQuiz: async (quizData: Omit<Quiz, "id">): Promise<Quiz> => {
    const response = await api.post<{
      success: boolean;
      data: Quiz;
      message: string;
    }>("/api/quizzes", quizData);
    return response.data.data;
  },
  updateQuiz: async (id: string, quizData: Partial<Quiz>): Promise<Quiz> => {
    const response = await api.put<Quiz>(`/api/quizzes/${id}`, quizData);
    return response.data;
  },
  deleteQuiz: async (id: string): Promise<void> => {
    await api.delete(`/api/quizzes/${id}`);
  },
};
