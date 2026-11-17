import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/auth.js";
import { HttpError } from "../lib/errors.js";

export type AuthedRequest = Request & { user?: JwtPayload };

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      /* ignore */
    }
  }
  next();
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Authentication required"));
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  requireAuth(req, _res, (err) => {
    if (err) return next(err);
    if (req.user?.role !== "admin") {
      return next(new HttpError(403, "Admin access required"));
    }
    next();
  });
}
