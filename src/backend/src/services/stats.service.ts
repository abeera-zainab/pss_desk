import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";

// Dashboard metrics, scoped to what the requester is allowed to see.
export async function dashboard(user: AuthUser) {
  // Build a task filter that matches the role's visibility.
  const taskWhere: Prisma.TaskWhereInput = {};
  if (user.role === "MANAGER") {
    taskWhere.case = { assignedManagerId: user.id };
  } else if (user.role === "WORKER") {
    taskWhere.OR = [
      { assignedUserId: user.id },
      { assignments: { some: { userId: user.id } } }
    ];
  }

  const [totalUsers, totalCases, activeTasks, completedTasks, pendingApprovals] = await Promise.all([
    user.role === "ADMIN" ? prisma.user.count({ where: { deletedAt: null } }) : Promise.resolve(0),
    prisma.case.count(),
    prisma.task.count({
      where: { ...taskWhere, status: { in: ["PENDING", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"] } }
    }),
    prisma.task.count({ where: { ...taskWhere, status: "COMPLETED" } }),
    prisma.task.count({ where: { ...taskWhere, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } })
  ]);

  // Activity feed: org-wide for admins, otherwise the user's own actions.
  const activity = await prisma.activityLog.findMany({
    where: user.role === "ADMIN" ? {} : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 15
  });

  return { totalUsers, totalCases, activeTasks, completedTasks, pendingApprovals, activity };
}
