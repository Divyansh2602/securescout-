import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', version: '3.0.0', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});
