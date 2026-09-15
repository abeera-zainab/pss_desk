// ---------- Enums ----------
//
// These mirror the enums in backend/prisma/schema.prisma and must stay in step
// with them: the values below are exactly what Postgres stores and what the API
// sends over the wire.
//
// They are const objects plus a derived union rather than `enum` declarations.
// A TypeScript `enum` is a nominal type, so the string "PENDING" parsed out of an
// API response is NOT assignable to it even though it is the identical value at
// runtime - which is why every literal in the UI failed to compile. This form
// gives us the value (TaskStatus.PENDING), the union type (TaskStatus), and
// assignability from plain strings, and it erases completely at build time.

export const Role = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  WORKER: "WORKER"
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Priority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT"
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const CaseStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CLOSED: "CLOSED"
} as const;
export type CaseStatus = (typeof CaseStatus)[keyof typeof CaseStatus];

export const TaskStatus = {
  LOCKED: "LOCKED",
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED"
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  HALF_DAY: "HALF_DAY",
  LATE: "LATE",
  ON_LEAVE: "ON_LEAVE"
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const LeaveType = {
  SICK: "SICK",
  CASUAL: "CASUAL",
  EARNED: "EARNED",
  UNPAID: "UNPAID"
} as const;
export type LeaveType = (typeof LeaveType)[keyof typeof LeaveType];

export const LeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED"
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];

export const TaskType = {
  FR: "FR",
  GEO_LOCATION: "GEO_LOCATION",
  CYBER_INT: "CYBER_INT",
  PSS_DEFENSIVE: "PSS_DEFENSIVE",
  PSS_OPS: "PSS_OPS",
  PSS_OFFENSIVE: "PSS_OFFENSIVE",
  PSS_PRODUCT: "PSS_PRODUCT"
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const BoardItemType = {
  FILE: "FILE",
  LINK: "LINK",
  NOTE: "NOTE"
} as const;
export type BoardItemType = (typeof BoardItemType)[keyof typeof BoardItemType];

export const CaseFileFolder = {
  INITIAL_OSINT: "INITIAL_OSINT",
  LOCATION_ANALYSIS: "LOCATION_ANALYSIS",
  THREAT_ALERT: "THREAT_ALERT"
} as const;
export type CaseFileFolder = (typeof CaseFileFolder)[keyof typeof CaseFileFolder];

// ---------- User DTOs ----------

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  managerId?: string;
  manager?: UserDTO;
  domains: TaskType[];
}

// ---------- Case DTOs ----------

export interface CaseDTO {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  priority: Priority;
  status: CaseStatus;
  createdBy: string;
  creator?: UserDTO;
  assignedManagerId: string;
  assignedManager?: UserDTO;
  deadline: string;
  requiredDocuments: string[];
  createdAt: string;
  updatedAt: string;
  tasks?: TaskDTO[];
  files?: FileDTO[];
  boardItems?: BoardItemDTO[];
}

// ---------- Task DTOs ----------

export interface TaskAssignmentDTO {
  id: string;
  taskId: string;
  userId: string;
  user?: UserDTO;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  referenceId: string;
  taskType: TaskType;
  title: string;
  description: string;
  instructions?: string;
  status: TaskStatus;
  priority: Priority;
  assignedUserId: string;
  assignedUser?: UserDTO;
  assignedUsers?: UserDTO[];
  caseId: string;
  case?: CaseDTO;
  dependsOnTaskId?: string;
  dependsOn?: TaskDTO;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  comments?: CommentDTO[];
  files?: FileDTO[];
  history?: TaskHistoryEntry[];
  assignments?: TaskAssignmentDTO[];
}

export interface TaskHistoryEntry {
  id: string;
  action: string;
  details?: string | null;
  actor?: string;
  createdAt: string;
}

// ---------- Activity Log DTO ----------

export interface ActivityLogDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

// ---------- Comment DTOs ----------

export interface CommentDTO {
  id: string;
  taskId: string;
  authorId: string;
  author?: UserDTO;
  message: string;
  createdAt: string;
}

// ---------- File DTOs ----------

export interface FileDTO {
  id: string;
  filename: string;
  storedName: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  uploader?: UserDTO;
  taskId?: string;
  caseId?: string;
  folder?: CaseFileFolder | null;
  createdAt: string;
}

// ---------- Board DTOs ----------

export interface BoardItemDTO {
  id: string;
  fileId: string;
  file: FileDTO;
  caseId: string;
  x: number;
  y: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardConnectionDTO {
  id: string;
  fromItemId: string;
  toItemId: string;
  label?: string;
  createdAt: string;
}

// ---------- Notification DTOs ----------

export interface NotificationDTO {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

// ---------- Attendance DTOs ----------

export interface AttendanceDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatus;
  workedMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ---------- Leave DTOs ----------

export interface LeaveRequestDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string;
  reviewedBy?: UserDTO;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Report DTOs ----------

export interface AttendanceReportDTO {
  month: string;
  data: AttendanceReportRow[];
}

export interface AttendanceReportRow {
  userId: string;
  name: string;
  present: number;
  absent: number;
  onLeave: number;
  halfDay: number;
  late: number;
  hoursMinutes: number;
}

export interface PerformanceReportDTO {
  month: string;
  data: PerformanceReportRow[];
}

export interface PerformanceReportRow {
  userId: string;
  name: string;
  tasksCompleted: number;
  tasksRejected: number;
  reworkRate: number;
  avgDaysToComplete: number;
  onTimePercent: number;
}

// ---------- Pagination ----------

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------- Auth ----------

export interface AuthResponse {
  accessToken: string;
  user: UserDTO;
}

// ---------- Case File ----------

export interface CaseFileDTO {
  id: string;
  filename: string;
  size: number;
  mimetype: string;
  uploadedBy: string;
  uploader?: UserDTO;
  caseId: string;
  folder?: CaseFileFolder | null;
  createdAt: string;
}