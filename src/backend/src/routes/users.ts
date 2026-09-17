import { Router } from "express";
import * as c from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import {
  listUsersSchema,
  createUserSchema,
  updateUserSchema,
  idParamSchema
} from "../validators/user.validator";

const router = Router();
router.use(requireAuth);

// Assignment dropdowns (must come before the /:id routes below)
router.get("/managers", requireRole("ADMIN"), asyncHandler(c.listManagers));
router.get("/workers", requireRole("ADMIN", "MANAGER"), asyncHandler(c.listWorkers));

router.get("/", requireRole("ADMIN"), validate(listUsersSchema), asyncHandler(c.list));
router.post("/", requireRole("ADMIN"), validate(createUserSchema), asyncHandler(c.create));
router.put("/:id", requireRole("ADMIN"), validate(updateUserSchema), asyncHandler(c.update));
router.delete("/:id/permanent", requireRole("ADMIN"), validate(idParamSchema), asyncHandler(c.permanentlyRemove));
router.delete("/:id", requireRole("ADMIN"), validate(idParamSchema), asyncHandler(c.remove));

export default router;
