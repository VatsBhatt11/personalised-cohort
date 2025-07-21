import axios, { AxiosResponse } from "axios";

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface TaskInPlan {
  id: string;
  resourceId: string;
  dayIndex: number;
  status: "PENDING" | "COMPLETED";
  resource: Resource;
  day?: string; // Add optional day property for display
}

interface PlanTaskCreate {
  resourceId: string;
  dayIndex: number;
}

export interface Plan {
  id: string;
  cohortId: string;
  tasks: TaskInPlan[];
}

// Keeping the original Task interface for other uses if any, renaming it to GenericTask
interface GenericTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "PENDING" | "COMPLETED";
}

interface Streak {
  currentStreak: number;
  bestStreak: number;
  lastUpdated: string;
  weeklyStreak: number;
  lastWeeklyStreakAwardedWeek: number;
}

export interface WeeklyProgress {
  week: number;
  completedTasks: number;
  totalTasks: number;
  progress: number;
}

export interface LeaderboardEntry {
  email: string;
  completionRate: number;
  dailyStreak: number;
  weeklyStreak: number;
  shortestCompletionTime: number;
}

export interface Resource {
  id: string;
  title: string;
  type: "VIDEO" | "ARTICLE" | "DOCUMENT";
  url: string;
  duration: number;
  tags: string[];
  weekNumber?: number;
  isOptional?: boolean;
}

export interface WeekResource {
  week: number;
  resources: Resource[];
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

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
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
    cohortId?: string
  ): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/signup", {
      email,
      password,
      role,
      cohortId,
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
};
