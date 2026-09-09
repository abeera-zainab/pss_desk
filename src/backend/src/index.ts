import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { initSocket } from "./sockets";
import { logger } from "./utils/logger";

const app = createApp();
const server = http.createServer(app);

initSocket(server);

const PORT = Number(process.env.PORT) || 11803;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
  logger.info(`CaseDesk API listening on ${HOST}:${PORT}`);
});

// Containers stop with SIGTERM; close the HTTP server so in-flight requests drain
// instead of being cut off mid-response.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
