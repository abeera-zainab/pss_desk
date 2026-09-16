import { z } from "zod";
import { USERNAME_PATTERN, normalizeUsername } from "../lib/username";

export const loginSchema = z.object({
  body: z
    .object({
      identifier: z.string().min(1).optional(),
      email: z.string().min(1).optional(),
      password: z.string().min(1, "Password is required")
    })
    .refine((d) => Boolean((d.identifier ?? d.email)?.trim()), {
      message: "Email or username is required",
      path: ["identifier"]
    })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters")
  })
});

export const usernameField = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be at most 32 characters")
  .transform(normalizeUsername)
  .refine((v) => USERNAME_PATTERN.test(v) && !v.includes("@"), {
    message: "Use letters, numbers, dots, underscores, or hyphens"
  });
