import { z } from "zod";

const leaveType = z.enum(["SICK", "CASUAL", "EARNED", "UNPAID"]);
const leaveStatus = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createLeaveSchema = z.object({
  body: z.object({
    type: leaveType,
    startDate: z.string(),
    endDate: z.string(),
    reason: z.string().min(1)
  })
});

export const listLeaveSchema = z.object({
  query: z.object({
    userId: z.string().uuid().optional(),
    status: leaveStatus.optional()
  })
});

export const rejectLeaveSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ reviewComment: z.string().min(1) })
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() })
});