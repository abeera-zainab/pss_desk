import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  AccessPayload
} from "../utils/tokens";
import { durationToMs } from "../utils/duration";
import { unauthorized } from "../utils/errors";

function accessPayload(user: {
  id: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
  name: string;
  email: string;
}): AccessPayload {
  return { id: user.id, role: user.role, name: user.name, email: user.email };
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: { id: string; name: string; email: string; role: "ADMIN" | "MANAGER" | "WORKER" };
}

// Verify credentials, issue a short-lived access token and a persisted refresh token.
export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw unauthorized("Invalid credentials");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw unauthorized("Invalid credentials");

  return issueTokens(user);
}

async function issueTokens(user: {
  id: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
  name: string;
  email: string;
}): Promise<AuthResult> {
  const accessToken = signAccessToken(accessPayload(user));
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(
    Date.now() + durationToMs(process.env.REFRESH_TOKEN_EXPIRY || "7d")
  );

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: refreshExpiresAt }
  });

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  };
}

// Validate a refresh token, rotate it (revoke old, mint new) and issue a fresh access token.
export async function refresh(rawToken: string | undefined): Promise<AuthResult> {
  if (!rawToken) throw unauthorized("No refresh token");
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) }
  });
  if (!record || record.revoked || record.expiresAt < new Date()) {
    throw unauthorized("Invalid or expired refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) throw unauthorized("Account is inactive");

  // Rotate: kill the used token before issuing a replacement.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  return issueTokens(user);
}

// Revoke a specific refresh token (logout on this device/session).
export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(rawToken), revoked: false },
    data: { revoked: true }
  });
}

// Revoke every session a user has, everywhere. Called when an admin resets a
// password or deactivates an account: without it, "reset the password of the
// compromised account" does not actually end the intruder's session, because
// their existing refresh token keeps rotating happily against the new hash.
//
// Access tokens already issued stay valid until they expire (up to
// ACCESS_TOKEN_EXPIRY), since they are stateless by design. The window is short
// and bounded, and closing it entirely would mean a database lookup on every
// request.
export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true }
  });
  return result.count;
}
