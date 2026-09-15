import { Request, Response } from "express";
import * as reportService from "../services/report.service";
import { sendExcel } from "../utils/exportExcel";
import { sendPdf, sendCaseReportPdf } from "../utils/exportPdf";
import { canViewCase, getCaseOrThrow } from "../services/access.service";
import { forbidden } from "../utils/errors";
import { prisma } from "../lib/prisma";

async function resolveScope(req: Request): Promise<string[]> {
  const queryUserId = req.query.userId as string | undefined;
  if (queryUserId) return [queryUserId];
  const all = await prisma.user.findMany({ select: { id: true } });
  return all.map((u) => u.id);
}

const attendanceColumns = [
  { header: "Employee", key: "name", width: 24 },
  { header: "Present", key: "present" },
  { header: "Absent", key: "absent" },
  { header: "On Leave", key: "onLeave" },
  { header: "Half Day", key: "halfDay" },
  { header: "Hours (min)", key: "hoursMinutes" },
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