import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, TokenPayload } from '../utils/auth.js';
import prisma from '../utils/prisma.js';
import type { Role } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export interface RolePermissions {
  roles: Role[];
  allowAll?: boolean;
}

function getToken(req: Request): string | null {
  return extractToken(req.headers.authorization) || req.cookies?.token || null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  verifyToken(token).then(payload => {
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
    req.user = payload;
    next();
  }).catch(() => {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  });
}

export function roleMiddleware(allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token' });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    req.user = payload;

    if (!allowedRoles.includes(payload.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: insufficient permissions' });
    }

    next();
  };
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getToken(req);

  if (!token) {
    return next();
  }

  (async () => {
    const payload = await verifyToken(token);
    if (payload) {
      req.user = payload;
    }
    next();
  })();
}