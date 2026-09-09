import { z } from "zod";

const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const taskStatus = z.enum([
  "LOCKED",
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "COMPLETED",
  "REJECTED"
]);
const taskType = z.enum(["FR", "GEO_LOCATION", "CYBER_INT"]);

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    instructions: z.string().optional(),
    priority,
    taskType,
    assignedUserId: z.string().uuid(),
    caseId: z.string().uuid(),
    dependsOnTaskId: z.string().uuid().optional(),
    deadline: z.coerce.date()
  })
});

export const listTasksSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    caseId: z.string().uuid().optional(),
    status: taskStatus.optional(),
    assignedUserId: z.string().uuid().optional(),
    taskType: taskType.optional()
  })
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ status: taskStatus })
});

export const assignTaskSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ assignedUserId: z.string().uuid() })
});

export const rejectTaskSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ comment: z.string().min(1, "A rejection comment is required") })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});

export const createTaskLinkSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    url: z.string().url(),
    label: z.string().optional()
  })
});

export const deleteTaskLinkSchema = z.object({
  params: z.object({ id: z.string().uuid(), linkId: z.string().uuid() })
});
export const editTaskSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    instructions: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    assignedUserId: z.string().uuid().optional(),
    deadline: z.coerce.date().optional()
  })
});
// In your task.validator.ts file, add this schema:

export const assignMultipleUsersSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    userIds: z.array(z.string().uuid()).min(1, "At least one user must be assigned")
  })
});