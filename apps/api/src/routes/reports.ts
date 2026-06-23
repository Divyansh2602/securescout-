import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuditService } from '../services/audit.service';
import { AppError } from '../utils/errors';

export const reportRouter = Router();
reportRouter.use(authenticate);

reportRouter.get('/scan/:scanId/json', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scan = await prisma.scan.findFirst({
      where: { id: req.params.scanId, orgId: req.user!.orgId },
      include: { findings: true },
    });
    if (!scan) throw new AppError('Scan not found', 404);
    await AuditService.log({ action: 'REPORT_EXPORTED', userId: req.user!.userId, orgId: req.user!.orgId, resourceId: scan.id });
    res.setHeader('Content-Disposition', `attachment; filename="securescout-report-${scan.id}.json"`);
    res.json(scan);
  } catch (err) { next(err); }
});
