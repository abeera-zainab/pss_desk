import { Router } from "express";
import * as c from "../controllers/notification.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { idParamSchema } from "../validators/common";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(c.list));
router.put("/:id/read", validate(idParamSchema), asyncHandler(c.markRead));

export default router;
