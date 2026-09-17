import { z } from "zod";
import { usernameField } from "./auth.validator";

const role = z.enum(["ADMIN", "MANAGER", "WORKER"]);

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    role: role.optional()
  })
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    username: usernameField,
    loginNo: z.string().min(1).max(32).optional(),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role,
      managerId: z.string().uuid().nullable().optional(),
      domains: z.array(z.enum(["FR", "GEO_LOCATION", "CYBER_INT", "PSS_DEFENSIVE", "PSS_OPS", "PSS_OFFENSIVE", "PSS_PRODUCT"])).optional()  
  })
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).optional(),
    username: usernameField.optional(),
    role: role.optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional(), 
    managerId: z.string().uuid().nullable().optional(),
    domains: z.array(z.enum(["FR", "GEO_LOCATION", "CYBER_INT", "PSS_DEFENSIVE", "PSS_OPS", "PSS_OFFENSIVE", "PSS_PRODUCT"])).optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});
