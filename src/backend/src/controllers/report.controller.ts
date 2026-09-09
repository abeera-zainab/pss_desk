import { Request, Response } from "express";
import * as reportService from "../services/report.service";
import * as userService from "../services/user.service";
import { sendExcel } from "../utils/exportExcel";
import { sendPdf, sendCaseReportPdf } from "../utils/exportPdf";
import { canViewCase, getCaseOrThrow } from "../services/access.service";
import { forbidden } from "../utils/errors";

async function resolveScope(req: Request): Promise<string[]> {
  const role = req.user!.role;
  const queryUserId = req.query.userId as string | undefined;

  if (role === "WORKER") return [req.user!.id];

  if (role === "MANAGER") {
    const reports = await userService.getDirectReports(req.user!.id);
    const allowed = [req.user!.id, ...reports.map((u) => u.id)];
    // A manager may narrow the report to one person, but only within their own
    // team. Returning [queryUserId] unchecked let any manager pull the report of
    // an admin or another team's staff just by passing ?userId=.
    if (queryUserId) {
      if (!allowed.includes(queryUserId)) throw forbidden("That user is not in your team");
      return [queryUserId];
    }
    return allowed;
  }

  if (queryUserId) return [queryUserId];
  const all = await userService.listUsers({ limit: 1000 });
  return all.data.map((u) => u.id);
}

const attendanceColumns = [
  { header: "Employee", key: "name", width: 24 },
  { header: "Present", key: "present" },
  { header: "Absent", key: "absent" },
  { header: "On Leave", key: "onLeave" },
  { header: "Half Day", key: "halfDay" },
  { header: "Late", key: "late" }
];

const performanceColumns = [
  { header: "Employee", key: "name", width: 24 },
  { header: "Completed", key: "tasksCompleted" },
  { header: "Rejected", key: "tasksRejected" },
  { header: "Rework %", key: "reworkRate" },
  { header: "Avg Days", key: "avgDaysToComplete" },
  { header: "On-Time %", key: "onTimePercent" }
];

export async function attendance(req: Request, res: Response) {
  const userIds = await resolveScope(req);
  const month = req.query.month as string | undefined;
  const format = req.query.format as string | undefined;
  const data = await reportService.attendanceReport({ userIds, month });

  if (format === "xlsx") {
    return sendExcel(res, `attendance-report-${month || "current"}`, "Attendance", attendanceColumns, data.data);
  }
  if (format === "pdf") {
    return sendPdf(
      res,
      `attendance-report-${month || "current"}`,
      "Attendance Report",
      `Period: ${new Date(data.from).toLocaleDateString()} - ${new Date(data.to).toLocaleDateString()}`,
      attendanceColumns,
      data.data
    );
  }
  res.json(data);
}

export async function performance(req: Request, res: Response) {
  const userIds = await resolveScope(req);
  const month = req.query.month as string | undefined;
  const format = req.query.format as string | undefined;
  const data = await reportService.performanceReport({ userIds, month });

  if (format === "xlsx") {
    return sendExcel(res, `performance-report-${month || "current"}`, "Performance", performanceColumns, data.data);
  }
  if (format === "pdf") {
    return sendPdf(
      res,
      `performance-report-${month || "current"}`,
      "Performance Report",
      `Period: ${new Date(data.from).toLocaleDateString()} - ${new Date(data.to).toLocaleDateString()}`,
      performanceColumns,
      data.data
    );
  }
  res.json(data);
}
export async function caseReport(req: Request, res: Response) {
  const caseId = req.params.id;
  // This PDF contains the whole dossier: description, manager, every board item
  // and the connection graph. It is case-scoped data and needs the same
  // visibility check the rest of the case endpoints apply.
  const kaseRow = await getCaseOrThrow(caseId);
  if (!(await canViewCase(req.user!, kaseRow))) throw forbidden();

  const result = await reportService.caseReport(caseId);
  if (!result) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  const { kase, connections } = result;
  sendCaseReportPdf(res, `case-report-${kase.caseNumber}`, kase, connections);
}