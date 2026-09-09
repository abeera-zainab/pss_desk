import { prisma } from "../lib/prisma";
import { emitToUser } from "../sockets";

// Mirrors shared/types NotificationType. Kept local so the backend does not
// import across the shared/ boundary at build time.
export type NotificationType =
  | "CASE_ASSIGNED"
  | "TASK_CREATED"
  | "TASK_ASSIGNED"
  | "TASK_UNLOCKED"
  | "FILE_UPLOADED"
  | "TASK_SUBMITTED"
  | "TASK_APPROVED"
  | "TASK_REJECTED";

// Persist first, then emit live. Guarantees offline users see it on next login
// via GET /notifications, while online users get an instant socket push.
export async function notify(userId: string, message: string, type: NotificationType) {
  const notification = await prisma.notification.create({
    data: { userId, message, type }
  });
  emitToUser(userId, "notification:new", notification);
  return notification;
}

export async function listNotifications(userId: string, unreadOnly: boolean) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

// Mark a single notification read - scoped to the owner so users can't touch others'.
export async function markRead(userId: string, id: string) {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true }
  });
  return result.count > 0;
}
