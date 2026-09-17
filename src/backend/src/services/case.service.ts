import { Prisma, TaskType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { parsePagination, paginated } from "../utils/pagination";
import { notify } from "./notification.service";
import { logActivity } from "./activity.service";
import { emitToCase } from "../sockets";
import { canViewCase, getCaseOrThrow } from "./access.service";
import { generateCaseNumber, generateTaskReferenceId } from "../lib/generateReferenceId";

const caseInclude = {
  assignedManager: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true } },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
      assignedUserId: true,
      priority: true,
      assignments: { select: { user: { select: { id: true, name: true } } } }
    }
  },
  files: {
    where: { boardItem: { is: null } },
    orderBy: { createdAt: "desc" }
  }
} satisfies Prisma.CaseInclude;

export async function createCase(
  admin: AuthUser,
  input: {
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assignedManagerId: string;
    deadline: Date;
    requiredDocuments: string[];
    tasks?: {
      taskType: TaskType;
      title: string;
      description: string;
      assignedUserId: string;
      assignedUserIds?: string[];
      priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      deadline: Date;
    }[];
  }
) {
  const manager = await prisma.user.findUnique({ where: { id: input.assignedManagerId } });
  if (!manager || manager.role !== "MANAGER" || !manager.isActive || manager.deletedAt) {
    throw badRequest("assignedManagerId must reference an active MANAGER");
  }

  const caseNumber = await generateCaseNumber();

  const kase = await prisma.case.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      assignedManagerId: input.assignedManagerId,
      deadline: input.deadline,
      requiredDocuments: input.requiredDocuments,
      createdBy: admin.id,
      caseNumber
    },
    include: caseInclude
  });

  await notify(manager.id, `You were assigned a new case: "${kase.title}"`, "CASE_ASSIGNED");
  await logActivity(admin.id, "CASE_CREATED", "CASE", kase.id, `Assigned to ${manager.name}`);
  emitToCase(kase.id, "case:created", kase);

  if (input.tasks && input.tasks.length > 0) {
    for (const t of input.tasks) {
      const referenceId = await generateTaskReferenceId(t.taskType);
      const allUserIds = Array.from(new Set([t.assignedUserId, ...(t.assignedUserIds || [])]));

      const task = await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          taskType: t.taskType,
          referenceId,
          priority: t.priority,
          assignedUserId: t.assignedUserId,
          caseId: kase.id,
          deadline: t.deadline,
          status: "PENDING",
          assignments: { create: allUserIds.map((userId) => ({ userId })) }
        }
      });

      for (const userId of allUserIds) {
        await notify(userId, `You were assigned a new task: "${task.title}"`, "TASK_ASSIGNED");
      }
      await logActivity(admin.id, "TASK_CREATED", "TASK", task.id, `Created with case ${kase.caseNumber}`);
      emitToCase(kase.id, "task:created", task);
    }
  }

  return kase;
}

export async function listCases(_user: AuthUser, query: any) {
  const p = parsePagination(query);
  const where: Prisma.CaseWhereInput = {};

  if (query.status) where.status = query.status;
  if (query.priority) where.priority = query.priority;

  const [data, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        ...caseInclude,
        tasks: {
          include: {
            assignedUser: { select: { id: true, name: true } },
            assignments: {
              include: {
                user: { select: { id: true, name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip: p.skip,
      take: p.take
    }),
    prisma.case.count({ where })
  ]);
  return paginated(data, total, p);
}

export async function getCase(user: AuthUser, id: string) {
  const exists = await prisma.case.findUnique({ where: { id } });
  if (!exists) throw notFound("Case not found");
  if (!(await canViewCase(user, exists))) throw forbidden();

  return prisma.case.findUnique({
    where: { id },
    include: {
      ...caseInclude,
      tasks: {
        include: {
          assignedUser: { select: { id: true, name: true, email: true } },
          assignments: { include: { user: { select: { id: true, name: true, email: true } } } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function updateCase(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
    assignedManagerId: string;
    deadline: Date;
    requiredDocuments: string[];
  }>
) {
  await getCaseOrThrow(id);
  if (input.assignedManagerId) {
    const manager = await prisma.user.findUnique({ where: { id: input.assignedManagerId } });
    if (!manager || manager.role !== "MANAGER" || !manager.isActive || manager.deletedAt) {
      throw badRequest("assignedManagerId must reference a MANAGER");
    }
  }
  const updated = await prisma.case.update({ where: { id }, data: input, include: caseInclude });
  emitToCase(id, "case:updated", updated);
  return updated;
}
// Add this function at the end of case.service.ts
export async function deleteCase(user: AuthUser, id: string) {
  // Only ADMIN can delete cases
  if (user.role !== "ADMIN") {
    throw forbidden("Only admins can delete cases");
  }

  // Check if case exists
  const kase = await prisma.case.findUnique({
    where: { id },
    include: {
      tasks: {
        include: {
          comments: true,
          files: true,
          assignments: true
        }
      },
      files: true,
      boardItems: {
        include: {
          connectionsFrom: true,
          connectionsTo: true
        }
      }
    }
  });

  if (!kase) {
    throw notFound("Case not found");
  }

  // Delete all related data in correct order (cascade will handle most)
  
  // 1. Delete board connections
  for (const item of kase.boardItems) {
    await prisma.boardConnection.deleteMany({
      where: {
        OR: [
          { fromItemId: item.id },
          { toItemId: item.id }
        ]
      }
    });
  }

  // 2. Delete board items
  await prisma.boardItem.deleteMany({
    where: { caseId: id }
  });

  // 3. Delete task assignments
  await prisma.taskAssignment.deleteMany({
    where: { task: { caseId: id } }
  });

  // 4. Delete task comments
  await prisma.comment.deleteMany({
    where: { task: { caseId: id } }
  });

  // 5. Delete task files
  await prisma.file.deleteMany({
    where: { task: { caseId: id } }
  });

  // 6. Delete task links
  await prisma.taskLink.deleteMany({
    where: { task: { caseId: id } }
  });

  // 7. Delete tasks
  await prisma.task.deleteMany({
    where: { caseId: id }
  });

  // 8. Delete case files
  await prisma.file.deleteMany({
    where: { caseId: id }
  });

  // 9. Finally delete the case
  const deleted = await prisma.case.delete({
    where: { id }
  });

  // Log activity
  await logActivity(user.id, "CASE_DELETED", "CASE", id, `Deleted case: ${deleted.caseNumber} - ${deleted.title}`);

  // Emit socket event
  emitToCase(id, "case:deleted", { id });

  return { id, message: "Case deleted successfully" };
}