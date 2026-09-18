// Calendar-day handling for attendance and leave.
//
// Attendance.date, LeaveRequest.startDate and LeaveRequest.endDate are Postgres
// DATE columns. Prisma sends a JavaScript Date and Postgres keeps only the UTC
// date part of it, which makes any Date built from *local* midnight land on the
// wrong day whenever the process timezone is not UTC. Building the key from
// local midnight in Asia/Karachi, for instance, produces 19:00 UTC the previous
// day and every attendance row is filed one day early.
//
// The reverse failure is just as real: leaving the container in UTC while the
// office is not means an early-morning check-in is recorded against yesterday.
//
// So the office timezone is stated explicitly and every day key is UTC midnight
// of the office's calendar day. Both writers then agree on what "a day" is,
// regardless of the timezone the process happens to run in.

const OFFICE_TZ = process.env.APP_TIMEZONE || "UTC";

// en-CA formats as YYYY-MM-DD, which is what we need to rebuild as a UTC instant.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: OFFICE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

/** The office calendar day containing `at`, as UTC midnight. */
export function officeDay(at: Date = new Date()): Date {
  return new Date(`${dayFormatter.format(at)}T00:00:00.000Z`);
}

/** Strips the time component off a date that is already a calendar day. */
export function dateOnly(value: Date | string): Date {
  const d = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Every calendar day from `start` to `end`, inclusive. */
export function eachDayInclusive(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = dateOnly(start);
  const last = dateOnly(end);
  while (cursor <= last) {
    days.push(new Date(cursor));
    // setUTCDate, not setDate: stepping in local time drifts across a DST
    // boundary and can repeat or skip a day.
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Inclusive day count. Exact, because both ends are UTC midnights. */
export function daysBetweenInclusive(start: Date, end: Date): number {
  const ms = dateOnly(end).getTime() - dateOnly(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: OFFICE_TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

/** True when `at` is strictly after hour:minute in the office timezone. */
export function isAfterOfficeClock(at: Date, hour: number, minute: number): boolean {
  const parts = Object.fromEntries(clockFormatter.formatToParts(at).map((p) => [p.type, p.value]));
  const now = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return now > hour * 3600 + minute * 60;
}
