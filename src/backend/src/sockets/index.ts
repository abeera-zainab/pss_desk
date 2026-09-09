import { Server } from "socket.io";
import type http from "http";
import { verifyAccessToken } from "../utils/tokens";
import { logger } from "../utils/logger";
import { prisma } from "../lib/prisma";
import { canViewCase, canViewTask, getCaseOrThrow } from "../services/access.service";

let io: Server;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: (process.env.FRONTEND_ORIGIN || "*").split(","),
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token provided"));
    try {
      (socket as any).user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    socket.join(`user:${user.id}`);

    // Room membership is an authorisation boundary, not a routing convenience:
    // everything broadcast into a case or task room is the same data the REST
    // endpoints guard. Joining is therefore gated by the identical predicates,
    // otherwise the socket is simply a second, unguarded way to read a case.
    socket.on("subscribe:case", async (caseId: string) => {
      if (typeof caseId !== "string" || !caseId) return;
      try {
        const kase = await getCaseOrThrow(caseId);
        if (await canViewCase(user, kase)) socket.join(`case:${caseId}`);
      } catch {
        // Unknown case, or the lookup failed. Silently decline to join: the
        // client cannot distinguish "does not exist" from "not yours".
      }
    });
    socket.on("unsubscribe:case", (caseId: string) => socket.leave(`case:${caseId}`));

    socket.on("subscribe:task", async (taskId: string) => {
      if (typeof taskId !== "string" || !taskId) return;
      try {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { case: true, assignments: true }
        });
        if (task && canViewTask(user, task)) socket.join(`task:${taskId}`);
      } catch {
        // As above.
      }
    });
    socket.on("unsubscribe:task", (taskId: string) => socket.leave(`task:${taskId}`));

    socket.on("disconnect", () => {});
  });

  logger.info("Socket.io initialized");
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized yet");
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  safeEmit(`user:${userId}`, event, payload);
}
export function emitToCase(caseId: string, event: string, payload: unknown) {
  safeEmit(`case:${caseId}`, event, payload);
}
export function emitToTask(taskId: string, event: string, payload: unknown) {
  safeEmit(`task:${taskId}`, event, payload);
}

export function emitBoard(caseId: string, event: string, payload: unknown) {
  emitToCase(caseId, event, payload);
}

function safeEmit(room: string, event: string, payload: unknown) {
  try {
    getIO().to(room).emit(event, payload);
  } catch {
    // Socket server may not be up in some contexts (e.g. seed/tests) - ignore.
  }
}