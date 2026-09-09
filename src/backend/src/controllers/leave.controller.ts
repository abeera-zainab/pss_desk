import { Request, Response } from "express";
import * as leaveService from "../services/leave.service";
import * as userService from "../services/user.service";
import { logActivity } from "../services/activity.service";
import { forbidden, notFound } from "../utils/errors";
import { prisma } from "../lib/prisma";

export async function create(req: Request, res: Response) {
  const leave = await leaveService.requestLeave(req.user!.id, req.body);
  await logActivity(req.user!.id, "LEAVE_REQUESTED", "LEAVE", leave.id, leave.type);
  res.status(201).json(leave);
}

export async function list(req: Request, res: Response) {
  const { userId, status } = req.query as { userId?: string; status?: any };
  const role = req.user!.role;

  let scopeUserIds: string[] | undefined;
  let filterUserId: string | undefined = userId;

  if (role === "WORKER") {
    filterUserId = req.user!.id;
  } else if (role === "MANAGER") {
    const reports = await userService.getDirectReports(req.user!.id);
    const allowed = [req.user!.id, ...reports.map((u) => u.id)];
    // Same inverted guard as the attendance list: supplying ?userId used to skip
    // the team scope altogether and expose any employee's leave history,
    // including the free-text reason, which routinely carries medical detail.
    if (userId && !allowed.includes(userId)) throw forbidden("That user is not in your team");
    if (!userId) scopeUserIds = allowed;
  }

  const data = await leaveService.listLeaveRequests({ userId: filterUserId, scopeUserIds, status });
  res.json(data);
}

// Manager can only act on a request from one of their own direct reports; Admin can act on anyone.
async function assertCanReview(reviewerId: string, reviewerRole: string, leaveId: string) {
  const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
  if (!leave) throw notFound("Leave request not found");

  if (reviewerRole === "MANAGER") {
    const target = await prisma.user.findUnique({ where: { id: leave.userId } });
    if (!target || target.managerId !== reviewerId) {
      throw forbidden("You can only review leave requests for your direct reports");
    }
  }
}

export async function approve(req: Request, res: Response) {
  await assertCanReview(req.user!.id, req.user!.role, req.params.id);
  const leave = await leaveService.approveLeave(req.params.id, req.user!.id);
  await logActivity(req.user!.id, "LEAVE_APPROVED", "LEAVE", leave.id, "");
  res.json(leave);
}

export async function reject(req: Request, res: Response) {
  await assertCanReview(req.user!.id, req.user!.role, req.params.id);
  const leave = await leaveService.rejectLeave(req.params.id, req.user!.id, req.body.reviewComment);
  await logActivity(req.user!.id, "LEAVE_REJECTED", "LEAVE", leave.id, req.body.reviewComment);
  res.json(leave);
}