import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern — prevents connection pool exhaustion in development
export const prisma = global.__prisma ?? new PrismaClient({
  log: [
    { level: 'query',   emit: 'event' },
    { level: 'error',   emit: 'event' },
    { level: 'warn',    emit: 'event' },
  ],
  errorFormat: 'minimal',
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Prisma's event-name typing varies with the generated client; cast keeps the
// event wiring resilient without weakening the rest of the file.
(prisma.$on as any)('error', (e: unknown) => logger.error('Prisma error:', e));
(prisma.$on as any)('warn',  (e: unknown) => logger.warn('Prisma warning:', e));

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}
