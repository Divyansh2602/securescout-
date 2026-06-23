import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { JwtService, TokenPayload } from '../services/jwt.service';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { Role } from '@prisma/client';

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: Role[] = [
  'VIEWER', 'DEVELOPER', 'SECURITY_LEAD', 'ORG_ADMIN', 'SUPER_ADMIN'
];

export const authenticate = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new AppError('No token provided', 401);

    const token = header.slice(7);
    const payload = JwtService.verifyAccessToken(token);

    // Look up by hash so the raw bearer token is never stored in the DB
    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({ where: { token: tokenHash } });
    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Session expired or invalidated', 401);
    }

    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
};

// authorize() is a MINIMUM-THRESHOLD check, not an allowlist.
// authorize('SECURITY_LEAD') = "SECURITY_LEAD or above".
// WARNING: authorize('VIEWER') grants access to ALL roles — never use VIEWER as a restriction.
// To require an exact role, compare req.user.role directly instead of using this helper.
export const authorize = (...roles: Role[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { next(new AppError('Not authenticated', 401)); return; }
    if (roles.length === 0) { next(new AppError('Insufficient permissions', 403)); return; }

    const userLevel = ROLE_HIERARCHY.indexOf(req.user.role as Role);
    const hasPermission = roles.some(r => ROLE_HIERARCHY.indexOf(r) <= userLevel);

    if (!hasPermission) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }
    next();
  };

export const requireOrg = (
  req: AuthRequest, res: Response, next: NextFunction
): void => {
  if (!req.user?.orgId) {
    next(new AppError('Organization context required', 403));
    return;
  }
  next();
};
