import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuditService } from '../services/audit.service';
import { AppError } from '../utils/errors';

export const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/', authorize('ORG_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { orgId: req.user!.orgId },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
    res.json({ data: users });
  } catch (err) { next(err); }
});

userRouter.get('/audit-logs', authorize('ORG_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page  = Number(req.query.page  || 1);
    const limit = Number(req.query.limit || 50);
    const result = await AuditService.list(req.user!.orgId, page, limit);
    res.json({ data: result });
  } catch (err) { next(err); }
});

userRouter.patch('/:id/role', authorize('ORG_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    // Verify the target user belongs to the caller's org before updating
    const target = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.user!.orgId } });
    if (!target) { next(new AppError('User not found', 404)); return; }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    await AuditService.log({ action: 'ROLE_CHANGED', userId: req.user!.userId, orgId: req.user!.orgId, resourceId: user.id });
    res.json({ data: user });
  } catch (err) { next(err); }
});
