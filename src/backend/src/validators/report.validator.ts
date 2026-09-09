
import { z } from "zod";

export const reportQuerySchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    userId: z.string().uuid().optional(),
    format: z.enum(["pdf", "xlsx"]).optional()
  })
});
