import { z } from "zod";

export const createCommentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ message: z.string().min(1) })
});

export const listCommentsSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});
