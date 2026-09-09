import type { TaskStatus, Priority, CaseStatus } from "@shared/types";

// Kanban columns - MUST match the TaskStatus enum, in workflow order.
export const TASK_COLUMNS: { key: TaskStatus; label: string; className: string }[] = [
  { key: "LOCKED", label: "Locked", className: "text-text-mute" },
  { key: "PENDING", label: "Pending", className: "text-text-mute" },
  { key: "IN_PROGRESS", label: "In Progress", className: "text-accent-progress" },
  { key: "SUBMITTED", label: "Submitted", className: "text-accent-info" },
  { key: "UNDER_REVIEW", label: "Under Review", className: "text-accent-info" },
  { key: "COMPLETED", label: "Completed", className: "text-accent-approve" },
  { key: "REJECTED", label: "Rejected", className: "text-accent-reject" }
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  LOCKED: "Locked",
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  COMPLETED: "Completed",
  REJECTED: "Rejected"
};

export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  LOCKED: "bg-gray-200 text-gray-600",
  PENDING: "bg-gray-100 text-text-mute",
  IN_PROGRESS: "bg-amber-100 text-accent-progress",
  SUBMITTED: "bg-blue-100 text-accent-info",
  UNDER_REVIEW: "bg-indigo-100 text-accent-info",
  COMPLETED: "bg-emerald-100 text-accent-approve",
  REJECTED: "bg-red-100 text-accent-reject"
};

export const PRIORITY_BADGE: Record<Priority, string> = {
  LOW: "bg-gray-100 text-text-mute",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-red-100 text-accent-reject"
};

export const CASE_STATUS_BADGE: Record<CaseStatus, string> = {
  OPEN: "bg-gray-100 text-text-mute",
  IN_PROGRESS: "bg-amber-100 text-accent-progress",
  COMPLETED: "bg-emerald-100 text-accent-approve",
  CLOSED: "bg-gray-200 text-gray-600"
};
