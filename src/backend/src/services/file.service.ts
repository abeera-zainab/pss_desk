import path from "path";
import fs from "fs";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import { AuthUser } from "../middleware/auth";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { notify } from "./notification.service";
import { logActivity } from "./activity.service";
import { emitToCase, emitToTask } from "../sockets";
import { canManageCase, canViewCase, canViewTask } from "./access.service";

// Uploaded evidence is the bulk of this system's disk usage, so it is kept out of
// the application directory: the deployment server runs the app from a small SSD
// and mounts the large HDD at /data. STORAGE_ROOT points there in every deployed
// environment; the local fallback only exists for a bare `npm run dev` checkout.
export const STORAGE_ROOT = process.env.STORAGE_ROOT
  ? path.resolve(process.env.STORAGE_ROOT)
  : path.join(__dirname, "..", "..", "storage");

// The declared MIME type is the client's word for it, so it decides only whether
// an upload is accepted. What gets written to disk is named from THIS table, not
// from the client's filename: accepting on the header while storing under an
// attacker-chosen extension is how "an allowed image" ends up on disk as .html.
const ALLOWED_MIME = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["video/mp4", ".mp4"],
  ["video/quicktime", ".mov"],
  ["video/webm", ".webm"],
  ["application/zip", ".zip"],
  ["application/x-zip-compressed", ".zip"]
]);

// Tolerates "500" and "500MB" alike; falls back to 20 MB if unset or unparseable.
const maxBytes = () => {
  const parsed = parseInt(String(process.env.MAX_FILE_SIZE_MB ?? ""), 10);
  return (Number.isFinite(parsed) && parsed > 0 ? parsed : 20) * 1024 * 1024;
};

export function makeUploader(subfolder: "cases" | "tasks" | "reports" | "profiles" | "board") {
  const dest = path.join(STORAGE_ROOT, subfolder);
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    // Server-generated name, server-chosen extension. Nothing the client sent is
    // used to build the path; the original filename survives only as a display
    // label on the File row.
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${ALLOWED_MIME.get(file.mimetype) ?? ".bin"}`)
  });
  return multer({
    storage,
    limits: { fileSize: maxBytes() },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
      cb(badRequest("File type not allowed. Allowed: PDF, DOCX, XLSX, PNG, JPG, MP4, MOV, WEBM, ZIP") as any);
    }
  });
}

function toRecord(file: Express.Multer.File, subfolder: string) {
  return {
    filename: file.originalname,
    storedName: file.filename,
    filepath: path.join(subfolder, file.filename),
    mimetype: file.mimetype,
    size: file.size
  };
}

export async function uploadTaskFile(user: AuthUser, taskId: string, file: Express.Multer.File) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { case: true, assignments: true }
  });
  if (!task) throw notFound("Task not found");

  const isManager = canManageCase(user, task.case);
  // Every worker on the task can upload to it, not only the primary assignee.
  // Checking assignedUserId alone left co-assigned workers unable to deliver
  // their own work: the task showed up in their list but rejected their upload.
  const isOwnerWorker =
    user.role === "WORKER" &&
    (task.assignedUserId === user.id || task.assignments.some((a) => a.userId === user.id));
  if (!isManager && !isOwnerWorker) throw forbidden("You cannot upload to this task");
  if (isOwnerWorker && task.status === "LOCKED") throw forbidden("This task is locked");

  const record = await prisma.file.create({
    data: { ...toRecord(file, "tasks"), taskId, uploadedBy: user.id }
  });
  await logActivity(user.id, "FILE_UPLOADED", "FILE", record.id, `task:${taskId}`);

  const recipient = isOwnerWorker ? task.case.assignedManagerId : task.assignedUserId;
  if (recipient && recipient !== user.id) {
    await notify(recipient, `A file was uploaded to task "${task.title}"`, "FILE_UPLOADED");
  }
  emitToTask(taskId, "file:new", record);
  emitToCase(task.caseId, "file:new", record);
  return publicFile(record);
}

export async function uploadCaseFile(user: AuthUser, caseId: string, file: Express.Multer.File) {
  const kase = await prisma.case.findUnique({ where: { id: caseId } });
  if (!kase) throw notFound("Case not found");
  if (!canManageCase(user, kase)) throw forbidden("You cannot upload to this case");

  const record = await prisma.file.create({
    data: { ...toRecord(file, "cases"), caseId, uploadedBy: user.id }
  });
  await logActivity(user.id, "FILE_UPLOADED", "FILE", record.id, `case:${caseId}`);
  emitToCase(caseId, "file:new", record);
  return publicFile(record);
}

// Case-scoped board upload. Board files belong to a case, so visibility
// follows the same canViewCase rule as everything else on that case.
export async function uploadBoardFile(user: AuthUser, caseId: string, file: Express.Multer.File) {
  const record = await prisma.file.create({
    data: { ...toRecord(file, "board"), caseId, uploadedBy: user.id }
  });
  await logActivity(user.id, "FILE_UPLOADED", "FILE", record.id, `board:${caseId}`);
  return publicFile(record);
}

export async function downloadFile(user: AuthUser, id: string) {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw notFound("File not found");

  if (file.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: file.taskId },
      // assignments is required by canViewTask to recognise co-assigned workers.
      include: { case: true, assignments: true }
    });
    if (!task || !canViewTask(user, task)) throw forbidden();
  } else if (file.caseId) {
    const kase = await prisma.case.findUnique({ where: { id: file.caseId } });
    if (!kase || !(await canViewCase(user, kase))) throw forbidden();
  }

  // filepath is built by the server from a generated UUID, never from client
  // input, but resolve and re-check anyway: this is the one place a bad value in
  // that column would turn into an arbitrary read off the data volume.
  const absolute = path.resolve(STORAGE_ROOT, file.filepath);
  if (absolute !== STORAGE_ROOT && !absolute.startsWith(STORAGE_ROOT + path.sep)) {
    throw forbidden();
  }
  if (!fs.existsSync(absolute)) throw notFound("File missing on disk");
  return { absolute, filename: file.filename, mimetype: file.mimetype };
}

function publicFile(f: {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  taskId: string | null;
  caseId: string | null;
  createdAt: Date;
}) {
  return {
    id: f.id,
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size,
    uploadedBy: f.uploadedBy,
    taskId: f.taskId,
    caseId: f.caseId,
    createdAt: f.createdAt
  };
}