import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { notFound, forbidden } from "../utils/errors";

export async function getCaseOrThrow(caseId: string) {
  const kase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kase) throw notFound("Case not found");
  return kase;
}

export async function getTaskOrThrow(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { case: true } });
  if (!task) throw notFound("Task not found");
  return task;
}

type CaseLike = { assignedManagerId: string };

export function canManageCase(user: AuthUser, kase: CaseLike): boolean {
  if (user.role === "ADMIN") return true;
  return user.role === "MANAGER" && kase.assignedManagerId === user.id;
}

export async function canViewCase(_user: AuthUser, _kase: CaseLike & { id: string }): Promise<boolean> {
  return true;
}

type TaskLike = { id: string; assignedUserId: string; case: CaseLike };

export function canViewTask(user: AuthUser, task: any): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "MANAGER") {
    return task.case?.assignedManagerId === user.id;
  }
  if (user.role === "WORKER") {
    // Check if user is the primary assignee
    if (task.assignedUserId === user.id) return true;
    // Check if user is in the assignments array
    if (task.assignments && task.assignments.some((a: any) => a.userId === user.id)) return true;
    return false;
  }
  return false;
}

export async function assertCaseManager(user: AuthUser, kase: CaseLike) {
  if (!canManageCase(user, kase)) throw forbidden();
}