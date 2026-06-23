import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { config } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { authRouter } from './routes/auth';
import { scanRouter } from './routes/scans';
import { reportRouter } from './routes/reports';
import { userRouter } from './routes/users';
import { healthRouter } from './routes/health';
import { prisma } from './config/database';
import { redis, makeRateLimitStore } from './config/redis';

const app: Application = express();

// ── Security Headers (OWASP) ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.CORS_ORIGINS.split(',').map(o => o.trim());
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
}));

// ── Global Rate Limiting ──────────────────────────────────────────────────────
// Stores are Redis-backed when REDIS_URL is a real server (shared across all
// instances + survives restarts), else fall back to per-instance memory.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
  store: makeRateLimitStore('rl:global:'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts.' },
  store: makeRateLimitStore('rl:auth:'),
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Scan rate limit exceeded.' },
  store: makeRateLimitStore('rl:scan:'),
});

app.use(globalLimiter);
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/scans', scanLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(hpp());
app.use(compression());

// ── Request Tracking ──────────────────────────────────────────────────────────
app.use(requestId);
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// ── Trust Proxy (for proper IP detection behind load balancer) ────────────────
app.set('trust proxy', 1);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health',         healthRouter);
app.use('/api/v1/auth',    authRouter);
app.use('/api/v1/scans',   scanRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/users',   userRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  if (redis) await redis.quit().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = config.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`SecureScout API v3.0.0 running on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

export default app;
