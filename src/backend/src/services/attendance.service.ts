import { prisma } from "../lib/prisma";
import { conflict } from "../utils/errors";
import { isAfterOfficeClock, officeDay } from "../utils/businessDay";
import type { AttendanceStatus } from "@prisma/client";

// The office calendar day, as UTC midnight. See utils/businessDay.ts for why this
// cannot be built from server-local midnight.
const todayDateOnly = (): Date => officeDay();

/** First check-in after 09:45 office time is late. */
export const LATE_AFTER_HOUR = 9;
export const LATE_AFTER_MINUTE = 45;

function isLateCheckIn(at: Date): boolean {
  return isAfterOfficeClock(at, LATE_AFTER_HOUR, LATE_AFTER_MINUTE);
}

function statusOnFirstCheckIn(at: Date): AttendanceStatus {
  return isLateCheckIn(at) ? "LATE" : "PRESENT";
}

/** Keep an existing LATE mark; otherwise LATE if this check-in is after 09:45. */
export function visibleAttendanceStatus(
  status: AttendanceStatus,
  checkIn: Date | null | undefined
): AttendanceStatus {
  if (status === "LATE") return "LATE";
  if (status === "PRESENT" && checkIn && isLateCheckIn(checkIn)) return "LATE";
  return status;
}

function withVisibleStatus<T extends { status: AttendanceStatus; checkIn: Date | null }>(row: T): T {
  return { ...row, status: visibleAttendanceStatus(row.status, row.checkIn) };
}

export async function checkIn(userId: string) {
  const date = todayDateOnly();
  const now = new Date();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } }
  });
  const openSession = !!(existing?.checkIn && !existing.checkOut);
  if (openSession) throw conflict("Already checked in");

  const status: AttendanceStatus = existing?.checkIn
    ? existing.status === "LATE"
      ? "LATE"
      : existing.status === "PRESENT" || existing.status === "HALF_DAY"
        ? existing.status
        : statusOnFirstCheckIn(now)
    : statusOnFirstCheckIn(now);

  if (existing) {
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkIn: now, checkOut: null, status }
    });
    return withVisibleStatus(updated);
  }
  const created = await prisma.attendance.create({
    data: { userId, date, checkIn: now, status }
  });
  return withVisibleStatus(created);
}

export async function checkOut(userId: string) {
  const date = todayDateOnly();
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId, date } }
  });
  if (!existing?.checkIn) throw conflict("You must check in before checking out");
  if (existing.checkOut) throw conflict("Already checked out");

  const sessionMinutes = Math.round(
    (new Date().getTime() - existing.checkIn.getTime()) / 60000
  );
  const workedMinutes = (existing.workedMinutes ?? 0) + sessionMinutes;

  const updated = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOut: new Date(), workedMinutes }
  });
  return withVisibleStatus(updated);
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

  const rows = await prisma.attendance.findMany({
    where,
    orderBy: { date: "desc" },
    include: { user: { select: { id: true, name: true } } }
  });
  return rows.map(withVisibleStatus);
}
export async function getToday(userId: string) {
  const date = todayDateOnly();
  const row = await prisma.attendance.findUnique({ where: { userId_date: { userId, date } } });
  return row ? withVisibleStatus(row) : row;
}