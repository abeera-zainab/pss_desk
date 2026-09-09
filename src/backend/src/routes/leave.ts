import { Router } from "express";
import * as c from "../controllers/leave.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import {
  createLeaveSchema,
  listLeaveSchema,
  rejectLeaveSchema,
  idParamSchema
} from "../validators/leave.validator";

const router = Router();
router.use(requireAuth);

router.post("/", validate(createLeaveSchema), asyncHandler(c.create));
router.get("/", validate(listLeaveSchema), asyncHandler(c.list));
router.put("/:id/approve", requireRole("ADMIN", "MANAGER"), validate(idParamSchema), asyncHandler(c.approve));
router.put("/:id/reject", requireRole("ADMIN", "MANAGER"), validate(rejectLeaveSchema), asyncHandler(c.reject));

export default router;