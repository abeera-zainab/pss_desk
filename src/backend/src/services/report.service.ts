import { prisma } from "../lib/prisma";

function monthRange(month?: string): { from: Date; to: Date } {
  // month format: "YYYY-MM", defaults to current month
  const now = new Date();
  const [year, mon] = month ? month.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const from = new Date(year, mon - 1, 1);
  const to = new Date(year, mon, 0, 23, 59, 59); // last day of month
  return { from, to };
}

export async function attendanceReport(params: {
  userIds: string[];
  month?: string;
}) {
  const { from, to } = monthRange(params.month);

  const records = await prisma.attendance.findMany({
    where: {
      userId: { in: params.userIds },
      date: { gte: from, lte: to }
    },
    include: { user: { select: { id: true, name: true } } }
  });

  // Group by user
  const byUser: Record<string, { userId: string; name: string; present: number; absent: number; onLeave: number; halfDay: number; late: number; hoursMinutes: number }> = {};
  for (const r of records) {
    if (!byUser[r.userId]) {
      byUser[r.userId] = { userId: r.userId, name: r.user.name, present: 0, absent: 0, onLeave: 0, halfDay: 0, late: 0, hoursMinutes: 0 };
    }
    const bucket = byUser[r.userId];
    bucket.hoursMinutes += r.workedMinutes ?? 0;
    if (r.status === "PRESENT") bucket.present++;
    else if (r.status === "ABSENT") bucket.absent++;
    else if (r.status === "ON_LEAVE") bucket.onLeave++;
    else if (r.status === "HALF_DAY") bucket.halfDay++;
    else if (r.status === "LATE") bucket.late++;
  }

  return { from, to, data: Object.values(byUser) };
}

export async function performanceReport(params: {
  userIds: string[];
  month?: string;
}) {
  const { from, to } = monthRange(params.month);

  const tasks = await prisma.task.findMany({
    where: {
      assignedUserId: { in: params.userIds },
      updatedAt: { gte: from, lte: to },
      status: { in: ["COMPLETED", "REJECTED"] }
    },
    include: { assignedUser: { select: { id: true, name: true } } }
  });

  const byUser: Record<string, {
    userId: string; name: string; completed: number; rejected: number;
    onTime: number; totalDaysToComplete: number; completedCount: number;
  }> = {};

  for (const t of tasks) {
    if (!byUser[t.assignedUserId]) {
      byUser[t.assignedUserId] = {
        userId: t.assignedUserId, name: t.assignedUser.name,
        completed: 0, rejected: 0, onTime: 0, totalDaysToComplete: 0, completedCount: 0
      };
    }
    const bucket = byUser[t.assignedUserId];
    if (t.status === "COMPLETED") {
      bucket.completed++;
      bucket.completedCount++;
      const days = Math.round((t.updatedAt.getTime() - t.createdAt.getTime()) / 86400000);
      bucket.totalDaysToComplete += days;
      if (t.updatedAt <= t.deadline) bucket.onTime++;
    } else if (t.status === "REJECTED") {
      bucket.rejected++;
    }
  }

  const result = Object.values(byUser).map((b) => ({
    userId: b.userId,
    name: b.name,
    tasksCompleted: b.completed,
    tasksRejected: b.rejected,
    reworkRate: b.completed + b.rejected > 0 ? Math.round((b.rejected / (b.completed + b.rejected)) * 100) : 0,
    avgDaysToComplete: b.completedCount > 0 ? Math.round(b.totalDaysToComplete / b.completedCount) : 0,
    onTimePercent: b.completedCount > 0 ? Math.round((b.onTime / b.completedCount) * 100) : 0
  }));

  return { from, to, data: result };
}
export async function caseReport(caseId: string) {
  const kase = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      assignedManager: { select: { name: true } },
      boardItems: {
        include: { file: { select: { filename: true, mimetype: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });
  if (!kase) return null;

  const connections = await prisma.boardConnection.findMany({
    where: { fromItem: { caseId } }
  });

  return { kase, connections };
}