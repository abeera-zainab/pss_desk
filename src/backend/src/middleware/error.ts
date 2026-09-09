import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

// Central error handler - every thrown/next(err) lands here and becomes clean JSON.
// Must be registered last, after all routes.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: err.issues });
  }
  if (err instanceof MulterError) {
    const msg =
      err.code === "LIMIT_FILE_SIZE" ? "File is too large" : `Upload error: ${err.message}`;
    return res.status(400).json({ error: msg });
  }
  // Prisma known-error codes we care about
  const anyErr = err as any;
  if (anyErr?.code === "P2002") {
    return res.status(409).json({ error: "A record with that unique value already exists" });
  }
  if (anyErr?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  logger.error(`Unhandled error: ${anyErr?.stack || anyErr?.message || String(err)}`);
  return res.status(500).json({ error: "Internal server error" });
}

// Wrap async route handlers so thrown errors reach the error handler.
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
