import { Request, Response } from "express";
import * as attendanceService from "../services/attendance.service";
import * as userService from "../services/user.service";
import { logActivity } from "../services/activity.service";
import { forbidden } from "../utils/errors";

export async function checkIn(req: Request, res: Response) {
  const record = await attendanceService.checkIn(req.user!.id);
  await logActivity(req.user!.id, "ATTENDANCE_CHECKIN", "ATTENDANCE", record.id, "");
  res.status(201).json(record);
}

export async function checkOut(req: Request, res: Response) {
  const record = await attendanceService.checkOut(req.user!.id);
  await logActivity(req.user!.id, "ATTENDANCE_CHECKOUT", "ATTENDANCE", record.id, "");
  res.json(record);
}

export async function list(req: Request, res: Response) {
  const { userId, from, to } = req.query as { userId?: string; from?: string; to?: string };
  const role = req.user!.role;

  let scopeUserIds: string[] | undefined;
  let filterUserId: string | undefined = userId;

  if (role === "WORKER") {
    filterUserId = req.user!.id; // worker can only ever see their own
  } else if (role === "MANAGER") {
    const reports = await userService.getDirectReports(req.user!.id);
    const allowed = [req.user!.id, ...reports.map((u) => u.id)];
    // The scoping used to be skipped entirely whenever ?userId was supplied,
    // which let any manager read any employee's attendance history. A manager
    // may filter to one person, but only inside their own team.
    if (userId && !allowed.includes(userId)) throw forbidden("That user is not in your team");
    if (!userId) scopeUserIds = allowed;
  }
  // ADMIN with no userId -> no filter, sees everyone

  const data = await attendanceService.listAttendance({ userId: filterUserId, scopeUserIds, from, to });
  res.json(data);
}
export async function today(req: Request, res: Response) {
  const record = await attendanceService.getToday(req.user!.id);
  res.json(record);
}