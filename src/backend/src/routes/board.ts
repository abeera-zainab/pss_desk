import { Router } from "express";
import * as c from "../controllers/board.controller";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/error";
import { makeUploader } from "../services/file.service";
import { moveBoardItemSchema, updateDescriptionSchema } from "../validators/board.validator";

const router = Router({ mergeParams: true }); // required so req.params.caseId is visible
router.use(requireAuth);

const upload = makeUploader("board");

router.get("/", asyncHandler(c.list));
router.post("/", upload.single("file"), asyncHandler(c.add));
router.put("/:id/move", validate(moveBoardItemSchema), asyncHandler(c.move));
router.put("/:id/description", validate(updateDescriptionSchema), asyncHandler(c.updateDescription));
router.delete("/:id", asyncHandler(c.remove));
router.get("/connections", asyncHandler(c.listConn));
router.post("/connections", asyncHandler(c.addConn));
router.delete("/connections/:id", asyncHandler(c.removeConn));

export default router;