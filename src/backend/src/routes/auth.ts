import { Router } from "express";
import * as c from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { loginSchema, changePasswordSchema } from "../validators/auth.validator";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/error";

const router = Router();

router.post("/login", validate(loginSchema), asyncHandler(c.login));
router.post("/refresh", asyncHandler(c.refresh));
router.post("/logout", asyncHandler(c.logout));
router.get("/me", requireAuth, asyncHandler(c.me));
router.post("/change-password", requireAuth, validate(changePasswordSchema), asyncHandler(c.changePassword));

export default router;
