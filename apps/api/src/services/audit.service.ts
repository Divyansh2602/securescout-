import { prisma } from '../config/database';
import { logger } from '../utils/logger';

interface AuditInput {
  action:       string;
  userId?:      string;
  orgId?:       string;
  resourceId?:  string;
  resourceType?:string;
  ipAddress?:   string;
  userAgent?:   string;
  metadata?:    Record<string, unknown>;
}

export class AuditService {
  static async log(input: AuditInput): Promise<void> {
    try {
      await prisma.auditLog.create({ data: input as any });
    } catch (err) {
      // Never throw — audit failures must not break business logic
      logger.error('Audit log failed:', err);
    }
  }

  static async list(orgId: string, page = 1, limit = 50) {
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where: { orgId } }),
    ]);
    return { logs, total, page, limit, pages: Math.ceil(total / limit) };
  }
}
