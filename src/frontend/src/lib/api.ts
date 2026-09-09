import axios, { AxiosError } from "axios";
import type {
  UserDTO,
  CaseDTO,
  TaskDTO,
  CommentDTO,
  NotificationDTO,
  PaginatedResult,
  Role,
  Priority,
  CaseStatus,
  TaskStatus,
  TaskType,
  AttendanceDTO,
  LeaveRequestDTO,
  LeaveType,
  LeaveStatus,
  AttendanceReportDTO,
  PerformanceReportDTO,
  BoardItemDTO,
  BoardConnectionDTO
} from "@shared/types";

// Relative by default: the app and the API are served from the same origin (nginx
// proxies /api and /socket.io through to the backend container), so the built
// bundle works on any host or IP without being rebuilt. Override VITE_API_BASE
// only when pointing the UI at an API on a different origin.
export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onTokenRefreshed: ((token: string) => void) | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;
export const setOnUnauthorized = (cb: () => void) => {
  onUnauthorized = cb;
};
// Notified whenever a silent refresh mints a new access token, so holders of a
// long-lived connection (the websocket) can update their copy instead of
// carrying the token they were handed at login until it expires.
export const setOnTokenRefreshed = (cb: (token: string) => void) => {
  onTokenRefreshed = cb;
};

const http = axios.create({ baseURL: API_BASE, withCredentials: true });

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string> | null = null;
// Shared in-flight promise: several requests failing with 401 at once must
// trigger one refresh between them, not one each.
export async function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
      .then((r) => {
        accessToken = r.data.accessToken;
        onTokenRefreshed?.(accessToken as string);
        return accessToken as string;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original: any = error.config;
    const isAuthCall = original?.url?.includes("/auth/");
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const t = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${t}`;
        return http(original);
      } catch (e) {
        onUnauthorized?.();
        throw e;
      }
    }
    throw error;
  }
);

export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return (e.response?.data as any)?.error || e.message || "Request failed";
  }
  return (e as Error)?.message || "Request failed";
}

export const api = {
  // auth
  login: (email: string, password: string) =>
    http.post("/auth/login", { email, password }).then((r) => r.data as { accessToken: string; user: UserDTO }),
  refresh: () => http.post("/auth/refresh").then((r) => r.data as { accessToken: string; user: UserDTO }),
  logout: () => http.post("/auth/logout").then((r) => r.data),
  me: () => http.get("/auth/me").then((r) => r.data),

  // stats
  dashboard: () => http.get("/stats/dashboard").then((r) => r.data),

  // users
  getUsers: (params?: { page?: number; limit?: number; role?: Role }) =>
    http.get("/users", { params }).then((r) => r.data as PaginatedResult<UserDTO>),
  getManagers: () => http.get("/users/managers").then((r) => r.data as UserDTO[]),
  getWorkers: () => http.get("/users/workers").then((r) => r.data as UserDTO[]),
  createUser: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    managerId?: string;
    domains?: TaskType[];
  }) => http.post("/users", data).then((r) => r.data as UserDTO),
  updateUser: (
    id: string,
    data: Partial<{
      name: string;
      role: Role;
      isActive: boolean;
      password: string;
      managerId: string | null;
      domains: TaskType[];
    }>
  ) => http.put(`/users/${id}`, data).then((r) => r.data as UserDTO),
  deleteUser: (id: string) => http.delete(`/users/${id}`).then((r) => r.data as UserDTO),

  // cases
  getCases: (params?: { page?: number; limit?: number; status?: CaseStatus }) =>
    http.get("/cases", { params }).then((r) => r.data as PaginatedResult<CaseDTO>),
  getCase: (id: string) => http.get(`/cases/${id}`).then((r) => r.data as CaseDTO),
 createCase: (data: {
    title: string;
    description: string;
    priority: Priority;
    assignedManagerId: string;
    deadline: string;
    requiredDocuments: string[];
    tasks?: {
      taskType: TaskType;
      title: string;
      description: string;
      assignedUserId: string;
      priority: Priority;
      deadline: string;
    }[];
  }) => http.post("/cases", data).then((r) => r.data as CaseDTO),
  deleteCase: (id: string) => http.delete(`/cases/${id}`).then((r) => r.data),

  // tasks
  getTasks: (params?: { caseId?: string; status?: TaskStatus; assignedUserId?: string; limit?: number }) =>
    http.get("/tasks", { params }).then((r) => r.data as PaginatedResult<TaskDTO>),
  getTask: (id: string) => http.get(`/tasks/${id}`).then((r) => r.data as TaskDTO),
  createTask: (data: {
    title: string;
    description: string;
    instructions?: string;
    taskType: TaskType;
    priority: Priority;
    assignedUserId: string;
    caseId: string;
    dependsOnTaskId?: string;
    deadline: string;
  }) => http.post("/tasks", data).then((r) => r.data as TaskDTO),
  editTask: (
    id: string,
    data: Partial<{
      title: string;
      description: string;
      instructions: string;
      priority: Priority;
      assignedUserId: string;
      deadline: string;
    }>
  ) => http.put(`/tasks/${id}/edit`, data).then((r) => r.data as TaskDTO),
  updateTaskStatus: (id: string, status: TaskStatus) =>
    http.put(`/tasks/${id}/status`, { status }).then((r) => r.data as TaskDTO),
  assignTask: (id: string, assignedUserId: string) =>
    http.put(`/tasks/${id}/assign`, { assignedUserId }).then((r) => r.data as TaskDTO),
  assignMultipleUsers: async (taskId: string, userIds: string[]) => {
    const res = await http.put(`/tasks/${taskId}/assign-multiple`, { userIds });
    return res.data;
  },
  approveTask: (id: string) => http.put(`/tasks/${id}/approve`).then((r) => r.data as TaskDTO),
  rejectTask: (id: string, comment: string) =>
    http.put(`/tasks/${id}/reject`, { comment }).then((r) => r.data as TaskDTO),

  // comments
  getComments: (taskId: string) => http.get(`/tasks/${taskId}/comments`).then((r) => r.data as CommentDTO[]),
  addComment: (taskId: string, message: string) =>
    http.post(`/tasks/${taskId}/comments`, { message }).then((r) => r.data as CommentDTO),

  // files
  uploadTaskFile: (taskId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/tasks/${taskId}/files`, form).then((r) => r.data);
  },
  uploadCaseFile: (caseId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post(`/cases/${caseId}/files`, form).then((r) => r.data);
  },
  downloadUrl: (fileId: string) => `${API_BASE}/files/${fileId}/download`,
  downloadFile: async (fileId: string, filename: string) => {
    const res = await http.get(`/files/${fileId}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // notifications
  getNotifications: (unreadOnly = false) =>
    http.get("/notifications", { params: { unreadOnly } }).then((r) => r.data as NotificationDTO[]),
  markNotificationRead: (id: string) => http.put(`/notifications/${id}/read`).then((r) => r.data),

  // attendance
  checkIn: () => http.post("/attendance/check-in").then((r) => r.data as AttendanceDTO),
  checkOut: () => http.post("/attendance/check-out").then((r) => r.data as AttendanceDTO),
  getAttendance: (params?: { userId?: string; from?: string; to?: string }) =>
    http.get("/attendance", { params }).then((r) => r.data as AttendanceDTO[]),
  getTodayAttendance: () => http.get("/attendance/today").then((r) => r.data as AttendanceDTO | null),

  // leave
  requestLeave: (data: { type: LeaveType; startDate: string; endDate: string; reason: string }) =>
    http.post("/leave", data).then((r) => r.data as LeaveRequestDTO),
  getLeaveRequests: (params?: { userId?: string; status?: LeaveStatus }) =>
    http.get("/leave", { params }).then((r) => r.data as LeaveRequestDTO[]),
  approveLeave: (id: string) => http.put(`/leave/${id}/approve`).then((r) => r.data as LeaveRequestDTO),
  rejectLeave: (id: string, reviewComment: string) =>
    http.put(`/leave/${id}/reject`, { reviewComment }).then((r) => r.data as LeaveRequestDTO),

  // reports
  getAttendanceReport: (params?: { month?: string; userId?: string }) =>
    http.get("/reports/attendance", { params }).then((r) => r.data as AttendanceReportDTO),
  getPerformanceReport: (params?: { month?: string; userId?: string }) =>
    http.get("/reports/performance", { params }).then((r) => r.data as PerformanceReportDTO),

  downloadReport: async (
    type: "attendance" | "performance",
    format: "pdf" | "xlsx",
    params: { month?: string; userId?: string }
  ) => {
    const res = await http.get(`/reports/${type}`, {
      params: { ...params, format },
      responseType: "blob"
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report-${params.month || "current"}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // board
  getBoard: (caseId: string) =>
    http.get(`/cases/${caseId}/board`).then((r) => r.data as BoardItemDTO[]),
  addBoardItem: (caseId: string, file: File, x: number, y: number) => {
    const form = new FormData();
    form.append("file", file);
    form.append("x", String(x));
    form.append("y", String(y));
    return http.post(`/cases/${caseId}/board`, form).then((r) => r.data as BoardItemDTO);
  },
  moveBoardItem: (caseId: string, id: string, x: number, y: number) =>
    http.put(`/cases/${caseId}/board/${id}/move`, { x, y }).then((r) => r.data as BoardItemDTO),
  updateBoardItemDescription: (caseId: string, id: string, description: string) =>
    http.put(`/cases/${caseId}/board/${id}/description`, { description }).then((r) => r.data as BoardItemDTO),
  deleteBoardItem: (caseId: string, id: string) =>
    http.delete(`/cases/${caseId}/board/${id}`).then((r) => r.data as { id: string }),

  getFileBlobUrl: async (fileId: string) => {
    const res = await http.get(`/files/${fileId}/download`, { responseType: "blob" });
    return URL.createObjectURL(res.data);
  },
  getConnections: (caseId: string) =>
    http.get(`/cases/${caseId}/board/connections`).then((r) => r.data as BoardConnectionDTO[]),
  addConnection: (caseId: string, fromItemId: string, toItemId: string, label?: string) =>
    http.post(`/cases/${caseId}/board/connections`, { fromItemId, toItemId, label }).then((r) => r.data as BoardConnectionDTO),
  deleteConnection: (caseId: string, id: string) =>
    http.delete(`/cases/${caseId}/board/connections/${id}`).then((r) => r.data),

  downloadCaseReport: async (caseId: string, caseNumber: string) => {
    const res = await http.get(`/reports/case/${caseId}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `case-report-${caseNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
};

