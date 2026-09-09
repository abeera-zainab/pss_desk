import { z } from "zod";

export const moveBoardItemSchema = z.object({
  body: z.object({
    x: z.number(),
    y: z.number()
  })
});

export const updateDescriptionSchema = z.object({
  body: z.object({
    description: z.string().max(2000)
  })
});