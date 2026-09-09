import { z } from "zod";

const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const caseStatus = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CLOSED"]);
const taskType = z.enum(["FR", "GEO_LOCATION", "CYBER_INT"]);

const caseTaskSchema = z.object({
  taskType,
  title: z.string().min(1),
  description: z.string().min(1),
  assignedUserId: z.string().uuid(),
  assignedUserIds: z.array(z.string().uuid()).optional(),
  priority,
  deadline: z.coerce.date()
});

export const createCaseSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    priority,
    assignedManagerId: z.string().uuid(),
    deadline: z.coerce.date(),
    requiredDocuments: z.array(z.string().min(1)).default([]),
    tasks: z.array(caseTaskSchema).optional()
  })
});

export const updateCaseSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    priority: priority.optional(),
    status: caseStatus.optional(),
    assignedManagerId: z.string().uuid().optional(),
    deadline: z.coerce.date().optional(),
    requiredDocuments: z.array(z.string().min(1)).optional()
  })
});

export const listCasesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: caseStatus.optional()
  })
});