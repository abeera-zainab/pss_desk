import fs from "fs";
import path from "path";
import winston from "winston";

const isProd = process.env.NODE_ENV === "production";

// Log files grow without bound over a deployment's lifetime, so they belong on the
// data volume next to the uploads rather than on the application disk. Console
// output is always kept as well, so `docker compose logs` still works.
function fileTransports(): winston.transport[] {
  const dir = process.env.LOG_DIR;
  if (!dir) return [];
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    return []; // an unwritable log dir must never stop the API from booting
  }
  const rotation = { maxsize: 10 * 1024 * 1024, maxFiles: 5, tailable: true };
  return [
    new winston.transports.File({ filename: path.join(dir, "error.log"), level: "error", ...rotation }),
    new winston.transports.File({ filename: path.join(dir, "combined.log"), ...rotation })
  ];
}

// Winston for structured logging. In dev we keep it human-readable and colorized;
// in production it emits JSON lines suitable for log shipping.
export const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level} ${message}`)
      ),
  transports: [new winston.transports.Console(), ...fileTransports()]
});

// A stream adapter so morgan can pipe HTTP request logs through winston.
export const morganStream = {
  write: (message: string) => logger.info(message.trim())
};
