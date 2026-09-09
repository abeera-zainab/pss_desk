import { Router } from "express";
import * as c from "../controllers/report.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { reportQuerySchema } from "../validators/report.validator";

const router = Router();
router.use(requireAuth);

router.get("/attendance", validate(reportQuerySchema), asyncHandler(c.attendance));
router.get("/performance", validate(reportQuerySchema), asyncHandler(c.performance));
router.get("/case/:id", asyncHandler(c.caseReport));

export default router;