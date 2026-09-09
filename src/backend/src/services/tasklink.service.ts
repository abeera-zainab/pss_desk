import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { forbidden, notFound } from "../utils/errors";
import { emitToTask } from "../sockets";
import { canManageCase } from "./access.service";

async function loadTaskWithCase(id: string) {
  const task = await prisma.task.findUnique({ where: { id }, include: { case: true } });
  if (!task) throw notFound("Task not found");
  return task;
}

function assertCanEditLinks(user: AuthUser, task: { assignedUserId: string; case: any }) {
  const isOwner = task.assignedUserId === user.id;
  const isManager = canManageCase(user, task.case);
  if (!isOwner && !isManager) throw forbidden();
}

export async function addTaskLink(
  user: AuthUser,
  taskId: string,
  url: string,
  label?: string
) {
  const task = await loadTaskWithCase(taskId);
  assertCanEditLinks(user, task);

  const link = await prisma.taskLink.create({
    data: { taskId, url, label }
  });

  emitToTask(taskId, "link:new", link);
  return link;
}

export async function listTaskLinks(user: AuthUser, taskId: string) {
  const task = await loadTaskWithCase(taskId);
  assertCanEditLinks(user, task);

  return prisma.taskLink.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" }
  });
}

export async function deleteTaskLink(user: AuthUser, taskId: string, linkId: string) {
  const task = await loadTaskWithCase(taskId);
  assertCanEditLinks(user, task);

  const link = await prisma.taskLink.findUnique({ where: { id: linkId } });
  if (!link || link.taskId !== taskId) throw notFound("Link not found");

  await prisma.taskLink.delete({ where: { id: linkId } });
  emitToTask(taskId, "link:deleted", { id: linkId });
}