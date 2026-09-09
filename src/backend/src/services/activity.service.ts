import { prisma } from "../lib/prisma";

type EntityType = "CASE" | "TASK" | "USER" | "FILE" | "ATTENDANCE" | "LEAVE";

// Writes an immutable audit-trail row. Never throws into the caller's flow.
export async function logActivity(
  userId: string,
  action: string,
  entityType: EntityType,
  entityId: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entityType, entityId, details }
    });
  } catch {
    // Audit logging must never break the main operation.
  }
}
