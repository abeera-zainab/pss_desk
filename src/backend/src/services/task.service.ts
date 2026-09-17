import { Prisma, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { parsePagination, paginated } from "../utils/pagination";
import { notify } from "./notification.service";
import { logActivity } from "./activity.service";
import { emitToCase, emitToTask } from "../sockets";
import { canManageCase, canViewTask, getCaseOrThrow } from "./access.service";
import { generateTaskReferenceId } from "../lib/generateReferenceId";

const taskInclude = {
  assignedUser: { select: { id: true, name: true, email: true, role: true } },
  case: { select: { id: true, title: true, assignedManagerId: true } },
  files: true,
  links: true,
  assignments: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    }
  }
} satisfies Prisma.TaskInclude;

function withAssignedUsers<T extends { assignments?: { user: { id: string; name: string; email: string } }[] }>(
  task: T
) {
  const { assignments, ...rest } = task;
  return { ...rest, assignedUsers: assignments ? assignments.map((a) => a.user) : [] };
}

async function loadTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: { case: true, assignments: true }
  });
  if (!task) throw notFound("Task not found");
  return task;
}

async function assertCanAssignUsers(actor: AuthUser, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  const assignees = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, deletedAt: null }
  });
  if (assignees.length !== uniqueIds.length) {
    throw badRequest("One or more users are invalid or inactive");
  }

  for (const assignee of assignees) {
    if (!assignee.isActive) throw badRequest("Assigned user must be active");
    if (assignee.role === "ADMIN") throw badRequest("Tasks cannot be assigned to an Admin");
    if (actor.role === "ADMIN") continue;
    if (actor.role === "MANAGER" && assignee.managerId !== actor.id) {
      throw forbidden("You can only assign tasks to your own team");
    }
  }
}

export async function createTask(
  user: AuthUser,
  input: {
    title: string;
    description: string;
    instructions?: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    taskType: TaskType;
    assignedUserId: string;
    caseId: string;
    dependsOnTaskId?: string;
    deadline: Date;
  }
) {
  const kase = await getCaseOrThrow(input.caseId);
  if (!canManageCase(user, kase)) throw forbidden("You can only add tasks to your own cases");

  await assertCanAssignUsers(user, [input.assignedUserId]);

  let status: TaskStatus = "PENDING";
  if (input.dependsOnTaskId) {
    const dep = await prisma.task.findUnique({ where: { id: input.dependsOnTaskId } });
    if (!dep || dep.caseId !== input.caseId) {
      throw badRequest("dependsOnTaskId must reference another task in the same case");
    }
    status = dep.status === "COMPLETED" ? "PENDING" : "LOCKED";
  }

  const referenceId = await generateTaskReferenceId(input.taskType);

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      instructions: input.instructions,
      priority: input.priority,
      taskType: input.taskType,
      referenceId,
      assignedUserId: input.assignedUserId,
      caseId: input.caseId,
      dependsOnTaskId: input.dependsOnTaskId,
      deadline: input.deadline,
      status,
      assignments: { create: { userId: input.assignedUserId } }
    },
    include: taskInclude
  });

  const msg =
    status === "LOCKED"
      ? `You were assigned "${task.title}" (locked until its dependency is completed)`
      : `You were assigned a new task: "${task.title}"`;
  await notify(task.assignedUserId, msg, "TASK_ASSIGNED");
  await logActivity(user.id, "TASK_CREATED", "TASK", task.id, task.title);
  emitToCase(task.caseId, "task:created", withAssignedUsers(task));
  return withAssignedUsers(task);
}

export async function listTasks(user: AuthUser, query: any) {
  const p = parsePagination(query);
  const where: Prisma.TaskWhereInput = {};
  if (query.caseId) where.caseId = query.caseId;
  if (query.status) where.status = query.status;
  if (query.assignedUserId) where.assignedUserId = query.assignedUserId;

  if (user.role === "MANAGER") {
    where.case = { assignedManagerId: user.id };
  } else if (user.role === "WORKER") {
    // A worker sees tasks where they are the primary assignee or a co-assignee.
    where.OR = [
      { assignedUserId: user.id },
      { assignments: { some: { userId: user.id } } }
    ];
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        ...taskInclude,
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        }
      },
      orderBy: { createdAt: "asc" },
      skip: p.skip,
      take: p.take
    }),
    prisma.task.count({ where })
  ]);
  return paginated(data, total, p);
}

export async function getTask(user: AuthUser, id: string) {
  const task = await loadTask(id);
  if (!canViewTask(user, task)) throw forbidden();

  const full = await prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      dependsOn: { select: { id: true, title: true, status: true } },
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const logs = await prisma.activityLog.findMany({
    where: { entityType: "TASK", entityId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" }
  });
  const history = logs.map((l) => ({
    id: l.id,
    action: l.action,
    details: l.details,
    createdAt: l.createdAt,
    actor: l.user?.name
  }));

  return { ...full, history };
}
const WORKER_TRANSITIONS: Record<string, TaskStatus[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["SUBMITTED"]
};
const MANAGER_TRANSITIONS: Record<string, TaskStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["SUBMITTED"]
};

export async function changeStatus(user: AuthUser, id: string, to: TaskStatus) {
  const task = await loadTask(id);

  if (task.status === "LOCKED") {
    throw forbidden("This task is locked until its dependency is completed");
  }
  if (to === "COMPLETED" || to === "REJECTED") {
    throw badRequest("Use the approve or reject action for this transition");
  }

  const isManager = canManageCase(user, task.case);
  const isAssignee =
    task.assignedUserId === user.id || task.assignments.some((a) => a.userId === user.id);

  if (user.role === "WORKER") {
    if (!isAssignee) throw forbidden("This task is not assigned to you");
    if (!WORKER_TRANSITIONS[task.status]?.includes(to)) {
      throw badRequest(`Cannot move a task from ${task.status} to ${to}`);
    }
  } else if (isManager) {
    if (!MANAGER_TRANSITIONS[task.status]?.includes(to)) {
      throw badRequest(`Cannot move a task from ${task.status} to ${to}`);
    }
  } else {
    throw forbidden();
  }

  const updated = await prisma.task.update({ where: { id }, data: { status: to }, include: taskInclude });
  await logActivity(user.id, `TASK_STATUS_${to}`, "TASK", id, `${task.status} → ${to}`);
  emitToCase(updated.caseId, "task:updated", withAssignedUsers(updated));
  emitToTask(id, "task:updated", withAssignedUsers(updated));

  if (to === "SUBMITTED") {
    await notify(task.case.assignedManagerId, `Task "${task.title}" was submitted for review`, "TASK_SUBMITTED");
  }
  await syncCaseStatus(updated.caseId);
  return withAssignedUsers(updated);
}

export async function assignTask(user: AuthUser, id: string, assignedUserId: string) {
  const task = await loadTask(id);
  if (!canManageCase(user, task.case)) throw forbidden();
  await assertCanAssignUsers(user, [assignedUserId]);
  const assignee = await prisma.user.findUnique({ where: { id: assignedUserId } });
  if (!assignee) throw badRequest("Assigned user must be active");

  // Check if already assigned
  const existingAssignment = await prisma.taskAssignment.findUnique({
    where: {
      taskId_userId: {
        taskId: id,
        userId: assignedUserId
      }
    }
  });

  if (!existingAssignment) {
    await prisma.taskAssignment.create({
      data: {
        taskId: id,
        userId: assignedUserId
      }
    });
  }

  // Update primary assignee
  const updated = await prisma.task.update({
    where: { id },
    data: { assignedUserId },
    include: {
      ...taskInclude,
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      }
    }
  });

  await notify(assignedUserId, `You were assigned task: "${updated.title}"`, "TASK_ASSIGNED");
  await logActivity(user.id, "TASK_ASSIGNED", "TASK", id, assignee.name);
  emitToCase(updated.caseId, "task:updated", updated);
  return updated;
}

// Replaces the whole team on a task via the TaskAssignment join table.
export async function assignMultipleUsers(
  user: AuthUser,
  taskId: string,
  userIds: string[]
) {
  if (!userIds || userIds.length === 0) {
    throw badRequest("No users provided");
  }

  const task = await loadTask(taskId);
  if (!canManageCase(user, task.case)) throw forbidden();
  await assertCanAssignUsers(user, userIds);

  const validUsers = await prisma.user.findMany({
    where: { id: { in: userIds } }
  });

  // Remove existing assignments for this task
  await prisma.taskAssignment.deleteMany({
    where: { taskId: taskId }
  });

  // Create new assignments for all users
  const assignments = userIds.map(userId => ({
    taskId: taskId,
    userId: userId
  }));

  await prisma.taskAssignment.createMany({
    data: assignments
  });

  // Update the task's primary assignedUserId to the first user (team lead)
  const primaryUserId = userIds[0];
  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { assignedUserId: primaryUserId },
    include: {
      ...taskInclude,
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } }
        }
      }
    }
  });

  // Notify all assigned users
  for (const userId of userIds) {
    const isLead = userId === primaryUserId;
    const message = isLead 
      ? `You are the lead for task: "${updatedTask.title}"`
      : `You were assigned to task: "${updatedTask.title}" (Lead: ${validUsers.find(u => u.id === primaryUserId)?.name})`;
    await notify(userId, message, "TASK_ASSIGNED");
  }

  await logActivity(
    user.id, 
    "TASK_ASSIGNED_MULTIPLE", 
    "TASK", 
    taskId, 
    `Assigned ${userIds.length} users: ${validUsers.map(u => u.name).join(', ')}`
  );

  emitToCase(updatedTask.caseId, "task:updated", updatedTask);
  emitToTask(taskId, "task:updated", updatedTask);

  return updatedTask;
}

export async function editTask(
  user: AuthUser,
  id: string,
  input: Partial<{
    title: string;
    description: string;
    instructions: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assignedUserId: string;
    deadline: Date;
  }>
) {
  const task = await loadTask(id);
  if (!canManageCase(user, task.case)) throw forbidden("You can only edit tasks in your own cases");

  if (input.assignedUserId) {
    await assertCanAssignUsers(user, [input.assignedUserId]);
  }

  const data: Prisma.TaskUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.instructions !== undefined) data.instructions = input.instructions;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.assignedUserId !== undefined) data.assignedUserId = input.assignedUserId;
  if (input.deadline !== undefined) data.deadline = input.deadline;

  const updated = await prisma.task.update({ where: { id }, data, include: taskInclude });

  await logActivity(user.id, "TASK_EDITED", "TASK", id, "Task details updated");
  emitToCase(updated.caseId, "task:updated", withAssignedUsers(updated));
  emitToTask(id, "task:updated", withAssignedUsers(updated));

  if (input.assignedUserId && input.assignedUserId !== task.assignedUserId) {
    await notify(input.assignedUserId, `You were assigned task: "${updated.title}"`, "TASK_ASSIGNED");
  }

  return withAssignedUsers(updated);
}

export async function approveTask(user: AuthUser, id: string) {
  const task = await loadTask(id);
  if (!canManageCase(user, task.case)) throw forbidden();
  if (task.status !== "SUBMITTED" && task.status !== "UNDER_REVIEW") {
    throw badRequest("Only a submitted or under-review task can be approved");
  }

  const updated = await prisma.task.update({ where: { id }, data: { status: "COMPLETED" }, include: taskInclude });
  await logActivity(user.id, "TASK_APPROVED", "TASK", id, task.title);
  await notify(task.assignedUserId, `Your task "${task.title}" was approved`, "TASK_APPROVED");
  emitToCase(updated.caseId, "task:updated", withAssignedUsers(updated));
  emitToTask(id, "task:updated", withAssignedUsers(updated));

  // A task can have many dependents, so every LOCKED one has to be released, not
  // just whichever row came back first. Filtering on status in the query also
  // matters: fetching one dependent and then testing its status meant that if the
  // first row happened to be unlocked already, the genuinely locked siblings were
  // skipped and stayed LOCKED forever, which in turn kept the case from ever
  // reaching COMPLETED.
  const dependents = await prisma.task.findMany({
    where: { dependsOnTaskId: id, status: "LOCKED" }
  });
  for (const dependent of dependents) {
    const unlocked = await prisma.task.update({
      where: { id: dependent.id },
      data: { status: "PENDING" },
      include: taskInclude
    });
    await notify(unlocked.assignedUserId, `A task is now unlocked and ready to start: "${unlocked.title}"`, "TASK_UNLOCKED");
    await logActivity(user.id, "TASK_UNLOCKED", "TASK", unlocked.id, unlocked.title);
    emitToCase(unlocked.caseId, "task:updated", withAssignedUsers(unlocked));
    emitToTask(unlocked.id, "task:updated", withAssignedUsers(unlocked));
  }

  await syncCaseStatus(updated.caseId);
  return withAssignedUsers(updated);
}

export async function rejectTask(user: AuthUser, id: string, comment: string) {
  const task = await loadTask(id);
  if (!canManageCase(user, task.case)) throw forbidden();
  if (task.status !== "SUBMITTED" && task.status !== "UNDER_REVIEW") {
    throw badRequest("Only a submitted or under-review task can be rejected");
  }

  const updated = await prisma.task.update({ where: { id }, data: { status: "IN_PROGRESS" }, include: taskInclude });
  const created = await prisma.comment.create({
    data: { taskId: id, authorId: user.id, message: `Rejected: ${comment}` },
    include: { author: { select: { id: true, name: true, role: true } } }
  });
  await logActivity(user.id, "TASK_REJECTED", "TASK", id, comment);
  await notify(task.assignedUserId, `Your task "${task.title}" was rejected: ${comment}`, "TASK_REJECTED");
  emitToCase(updated.caseId, "task:updated", withAssignedUsers(updated));
  emitToTask(id, "task:updated", withAssignedUsers(updated));
  emitToTask(id, "comment:new", created);
  return withAssignedUsers(updated);
}

async function syncCaseStatus(caseId: string) {
  const tasks = await prisma.task.findMany({ where: { caseId }, select: { status: true } });
  if (tasks.length === 0) return;

  const allCompleted = tasks.every((t) => t.status === "COMPLETED");
  const anyStarted = tasks.some((t) => t.status !== "PENDING" && t.status !== "LOCKED");
  const next = allCompleted ? "COMPLETED" : anyStarted ? "IN_PROGRESS" : "OPEN";

  const kase = await prisma.case.findUnique({ where: { id: caseId }, select: { status: true } });
  if (kase && kase.status !== "CLOSED" && kase.status !== next) {
    const updated = await prisma.case.update({ where: { id: caseId }, data: { status: next } });
    emitToCase(caseId, "case:updated", updated);
  }
}