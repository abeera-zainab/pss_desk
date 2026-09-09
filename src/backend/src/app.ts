import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import attendanceRoutes from "./routes/attendance";
import leaveRoutes from "./routes/leave";

import { morganStream } from "./utils/logger";
import { errorHandler } from "./middleware/error";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import caseRoutes from "./routes/cases";
import taskRoutes from "./routes/tasks";
import fileRoutes from "./routes/files";
import notificationRoutes from "./routes/notifications";
import statsRoutes from "./routes/stats";
import reportRoutes from "./routes/report";
import boardRoutes from "./routes/board";

// Builds the Express app (no server binding) so it can be imported by tests.
export function createApp() {
  const app = express();
  const isTest = process.env.NODE_ENV === "test";

  app.set("trust proxy", 1); // behind Nginx on the office LAN
  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.FRONTEND_ORIGIN || "http://localhost:11802")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
      credentials: true
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  if (!isTest) app.use(morgan("dev", { stream: morganStream }));

  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", time: new Date().toISOString() })
  );

  // Throttle auth endpoints to blunt brute-force attempts.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest
  });

  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/cases", caseRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/leave", leaveRoutes);
  app.use("/api/reports", reportRoutes);
 app.use("/api/cases/:caseId/board", boardRoutes);
  app.use(errorHandler);
  return app;
}
