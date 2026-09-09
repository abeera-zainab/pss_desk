import { Router } from "express";
import * as c from "../controllers/file.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { idParamSchema } from "../validators/common";

const router = Router();
router.use(requireAuth);

// Permission-checked streaming download (never exposes the storage folder directly).
router.get("/:id/download", validate(idParamSchema), asyncHandler(c.download));

export default router;
