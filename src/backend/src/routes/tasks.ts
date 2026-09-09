import { Router } from "express";
import * as c from "../controllers/task.controller";
import * as fileCtrl from "../controllers/file.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { makeUploader } from "../services/file.service";
import {
  createTaskSchema,
  listTasksSchema,
  updateStatusSchema,
  editTaskSchema,  
  assignTaskSchema,
  assignMultipleUsersSchema,
  rejectTaskSchema,
  idParamSchema,
  createTaskLinkSchema,
  deleteTaskLinkSchema
} from "../validators/task.validator";
import { createCommentSchema, listCommentsSchema } from "../validators/comment.validator";

const router = Router();
const uploadTask = makeUploader("tasks");

router.use(requireAuth);

router.get("/", validate(listTasksSchema), asyncHandler(c.list));
router.post("/", requireRole("MANAGER", "ADMIN"), validate(createTaskSchema), asyncHandler(c.create));
router.get("/:id", validate(idParamSchema), asyncHandler(c.getOne));

router.put("/:id/status", validate(updateStatusSchema), asyncHandler(c.updateStatus));
router.put("/:id/assign", requireRole("MANAGER", "ADMIN"), validate(assignTaskSchema), asyncHandler(c.assign));

// Assign multiple users to a task
router.put("/:id/assign-multiple", requireRole("MANAGER", "ADMIN"), validate(assignMultipleUsersSchema), asyncHandler(c.assignMultiple));

router.put("/:id/approve", requireRole("MANAGER", "ADMIN"), validate(idParamSchema), asyncHandler(c.approve));
router.put("/:id/reject", requireRole("MANAGER", "ADMIN"), validate(rejectTaskSchema), asyncHandler(c.reject));
router.post("/:id/comments", validate(createCommentSchema), asyncHandler(c.addComment));
router.get("/:id/comments", validate(listCommentsSchema), asyncHandler(c.listComments));
router.put("/:id/edit", validate(editTaskSchema), asyncHandler(c.edit));

// Worker/Manager uploads to a task (perms enforced in the service)
router.post("/:id/files", uploadTask.single("file"), asyncHandler(fileCtrl.uploadToTask));

// Task links (map URLs, external refs etc.) - perms enforced in the service
router.post("/:id/links", validate(createTaskLinkSchema), asyncHandler(c.addLink));
router.get("/:id/links", validate(idParamSchema), asyncHandler(c.listLinks));
router.delete("/:id/links/:linkId", validate(deleteTaskLinkSchema), asyncHandler(c.removeLink));

export default router;