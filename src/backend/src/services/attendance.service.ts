import { prisma } from "../lib/prisma";
import { notFound, conflict } from "../utils/errors";
import { officeDay } from "../utils/businessDay";

// The office calendar day, as UTC midnight. See utils/businessDay.ts for why this
// cannot be built from server-local midnight.
const todayDateOnly = (): Date => officeDay();

export async function checkIn(userId: string) {
  const date = todayDateOnly();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } }
  });
  if (existing?.checkIn) throw conflict("Already checked in today");

  if (existing) {
    return prisma.attendance.update({
      where: { id: existing.id },
      data: { checkIn: new Date(), status: "PRESENT" }
    });
  }
  return prisma.attendance.create({
    data: { userId, date, checkIn: new Date(), status: "PRESENT" }
  });
}

export async function checkOut(userId: string) {
  const date = todayDateOnly();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } }
  });
  if (!existing?.checkIn) throw conflict("You must check in before checking out");
  if (existing.checkOut) throw conflict("Already checked out today");

  const workedMinutes = Math.round(
    (new Date().getTime() - existing.checkIn.getTime()) / 60000
  );

  return prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut: new Date(), workedMinutes }
  });
}

export async function listAttendance(params: {
  userId?: string;
  scopeUserIds?: string[]; // for manager: restrict to direct reports
  from?: string;
  to?: string;
}) {
  const where: any = {};
  if (params.userId) where.userId = params.userId;
  else if (params.scopeUserIds) where.userId = { in: params.scopeUserIds };

  if (params.from || params.to) {
    where.date = {};
    if (params.from) where.date.gte = new Date(params.from);
    if (params.to) where.date.lte = new Date(params.to);
  }

  return prisma.attendance.findMany({
    where,
    orderBy: { date: "desc" },
    include: { user: { select: { id: true, name: true } } }
  });
}
export async function getToday(userId: string) {
  const date = todayDateOnly();
  return prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
}