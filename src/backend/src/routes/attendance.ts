import { Router } from "express";
import * as c from "../controllers/attendance.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { listAttendanceSchema } from "../validators/attendance.validator";

const router = Router();
router.use(requireAuth);

router.post("/check-in", asyncHandler(c.checkIn));
router.post("/check-out", asyncHandler(c.checkOut));
router.get("/today", asyncHandler(c.today));
router.get("/", validate(listAttendanceSchema), asyncHandler(c.list));

export default router;