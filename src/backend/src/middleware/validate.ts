import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { badRequest } from "../utils/errors";

// Runs a Zod schema against { body, query, params } before the controller.
// On success, the parsed/coerced values replace the originals so controllers
// receive clean, typed data.
export function validate(schema: ZodSchema<any>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message
      }));
      return next(badRequest("Validation failed", issues));
    }
    if (result.data.body) req.body = result.data.body;
    // query/params are read-only getters on some Express versions; assign defensively
    if (result.data.query) Object.assign(req.query, result.data.query);
    if (result.data.params) Object.assign(req.params, result.data.params);
    next();
  };
}
