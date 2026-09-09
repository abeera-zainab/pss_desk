import { z } from "zod";

export const listAttendanceSchema = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    from: z.string().optional(),
    to: z.string().optional()
  })
});