import { Request, Response } from "express";
import * as authService from "../services/auth.service";

const REFRESH_COOKIE = "casedesk_refresh";

// Tied to how the app is *served*, not to NODE_ENV. A secure cookie is never sent
// over plain HTTP, so deriving this from NODE_ENV alone breaks the deployed LAN
// install: every session would die silently the moment the 15-minute access token
// expired, because the browser would withhold the refresh cookie. Set
// COOKIE_SECURE=true as soon as the server is behind TLS.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

function refreshCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: COOKIE_SECURE,
    path: "/api/auth",
    ...(expiresAt ? { expires: expiresAt } : {})
  };
}

export async function login(req: Request, res: Response) {
  const identifier = (req.body.identifier ?? req.body.email) as string;
  const result = await authService.login(identifier, req.body.password);
  res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt));
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  const result = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt));
  res.json({ accessToken: result.accessToken, user: result.user });
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json(req.user);
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  res.json({ ok: true });
}
