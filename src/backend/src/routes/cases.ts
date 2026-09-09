import { Router } from "express";
import * as c from "../controllers/case.controller";
import * as fileCtrl from "../controllers/file.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { makeUploader } from "../services/file.service";
import { createCaseSchema, updateCaseSchema, listCasesSchema } from "../validators/case.validator";
import { idParamSchema } from "../validators/common";
import boardRouter from "./board";
const router = Router();
const uploadCase = makeUploader("cases");

router.use(requireAuth);

router.get("/", validate(listCasesSchema), asyncHandler(c.list));
router.post("/", requireRole("ADMIN"), validate(createCaseSchema), asyncHandler(c.create));
router.get("/:id", validate(idParamSchema), asyncHandler(c.getOne));
router.put("/:id", requireRole("ADMIN"), validate(updateCaseSchema), asyncHandler(c.update));
router.use("/:caseId/board", boardRouter);
// File attachments on a case (Admin/Manager perms enforced in the service)
router.post("/:id/files", uploadCase.single("file"), asyncHandler(fileCtrl.uploadToCase));
router.delete("/:id", asyncHandler(c.deleteCase));

export default router;
