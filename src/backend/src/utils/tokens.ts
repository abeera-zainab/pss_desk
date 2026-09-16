import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface AccessPayload {
  id: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
  name: string;
  username?: string;
  email: string;
}

const ACCESS_SECRET = () => process.env.JWT_ACCESS_SECRET as string;
const ACCESS_EXPIRY = () => (process.env.ACCESS_TOKEN_EXPIRY || "15m") as any;

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: ACCESS_EXPIRY() });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET()) as AccessPayload;
}

// Refresh tokens are opaque random strings. We store only their SHA-256 hash
// in the DB, so a leaked database row cannot be replayed as a valid cookie.
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
