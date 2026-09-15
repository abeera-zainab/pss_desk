import { prisma } from "../lib/prisma";
import { notFound, badRequest } from "../utils/errors";
import { dateOnly, daysBetweenInclusive, eachDayInclusive } from "../utils/businessDay";

export async function requestLeave(userId: string, input: {
  type: "SICK" | "CASUAL" | "EARNED" | "UNPAID";
  startDate: string;
  endDate: string;
  reason: string;
}) {
  // Normalised to calendar days so the stored range, the day count and the
  // attendance rows written on approval all agree on which days are covered.
  const startDate = dateOnly(input.startDate);
  const endDate = dateOnly(input.endDate);
  if (endDate < startDate) throw badRequest("End date cannot be before start date");

  const days = daysBetweenInclusive(startDate, endDate);
  if (days > 30) throw badRequest("Leave requests cannot exceed 30 days");   // NEW

  return prisma.leaveRequest.create({
    data: {
      userId,
      type: input.type,
      startDate,
      endDate,
      days,
      reason: input.reason,
      status: "PENDING"
    }
  });
}

export async function listLeaveRequests(params: {
  userId?: string;
  scopeUserIds?: string[]; // manager: direct reports only
  status?: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const where: any = {};
  if (params.userId) where.userId = params.userId;
  else if (params.scopeUserIds) where.userId = { in: params.scopeUserIds };
  if (params.status) where.status = params.status;

  return prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, managerId: true } } }
  });
}

// Approve: atomic - flips status AND marks every date in range as ON_LEAVE.
// If either half fails, the whole thing rolls back (no mismatch).
export async function approveLeave(id: string, reviewedById: string) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) throw notFound("Leave request not found");
  if (leave.status !== "PENDING") throw badRequest("Only pending requests can be approved");

  const dates = eachDayInclusive(leave.startDate, leave.endDate);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedById }
    });

    for (const date of dates) {
      await tx.attendance.upsert({
        where: { userId_date: { userId: leave.userId, date } },
        create: { userId: leave.userId, date, status: "ON_LEAVE" },
        update: { status: "ON_LEAVE" }
      });
    }

    return updated;
  });
}

export async function rejectLeave(id: string, reviewedById: string, reviewComment: string) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) throw notFound("Leave request not found");
  if (leave.status !== "PENDING") throw badRequest("Only pending requests can be rejected");

  return prisma.leaveRequest.update({
    where: { id },
    data: { status: "REJECTED", reviewedById, reviewComment }
  });
}