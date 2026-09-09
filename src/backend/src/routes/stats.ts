import { Router } from "express";
import * as c from "../controllers/stats.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";

const router = Router();
router.use(requireAuth);

router.get("/dashboard", asyncHandler(c.dashboard));

export default router;
