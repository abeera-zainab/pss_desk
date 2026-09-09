import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { forbidden, notFound } from "../utils/errors";
import { emitToTask } from "../sockets";
import { canViewTask } from "./access.service";

// assignments must be included: canViewTask grants access to workers attached
// through TaskAssignment as well as the primary assignedUserId, and without the
// relation loaded that branch can never match - every co-assigned worker was
// getting a 403 on a task they could see in their own list.
async function loadTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { case: true, assignments: true }
  });
  if (!task) throw notFound("Task not found");
  return task;
}

export async function addComment(user: AuthUser, taskId: string, message: string) {
  const task = await loadTask(taskId);
  if (!canViewTask(user, task)) throw forbidden();
  // Locked tasks are fully read-only until they unlock.
  if (task.status === "LOCKED") throw forbidden("This task is locked");

  const comment = await prisma.comment.create({
    data: { taskId, authorId: user.id, message },
    include: { author: { select: { id: true, name: true, role: true } } }
  });
  emitToTask(taskId, "comment:new", comment);
  return comment;
}

export async function listComments(user: AuthUser, taskId: string) {
  const task = await loadTask(taskId);
  if (!canViewTask(user, task)) throw forbidden();
  return prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" }
  });
}
