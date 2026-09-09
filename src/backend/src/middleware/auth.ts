import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessPayload } from "../utils/tokens";
import { unauthorized, forbidden } from "../utils/errors";

export type AuthUser = AccessPayload;

// Extend Express's Request type with our authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(unauthorized("Missing or invalid Authorization header"));
  }
  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

// Usage: requireRole("ADMIN") or requireRole("MANAGER", "ADMIN")
export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(forbidden());
    }
    next();
  };
}
