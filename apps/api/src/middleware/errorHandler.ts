import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error, req: Request, res: Response, next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error:   err.message,
      ...(err.details ? { details: err.details } : {}),
      requestId: req.headers['x-request-id'],
    });
    return;
  }

  // Prisma unique constraint
  if ((err as any).code === 'P2002') {
    res.status(409).json({ error: 'Resource already exists' });
    return;
  }

  // Prisma not found
  if ((err as any).code === 'P2025') {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  logger.error('Unhandled error:', { message: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Internal server error', requestId: req.headers['x-request-id'] });
};
