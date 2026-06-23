import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV:          z.enum(['development', 'staging', 'production']).default('development'),
  PORT:              z.coerce.number().default(4000),
  DATABASE_URL:      z.string().url(),
  REDIS_URL:         z.string().url().default('redis://localhost:6379'),
  JWT_SECRET:        z.string().min(32),
  JWT_REFRESH_SECRET:z.string().min(32),
  JWT_EXPIRES_IN:    z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS:      z.string().default('http://localhost:3000'),
  BCRYPT_ROUNDS:     z.coerce.number().min(10).max(14).default(12),
  MAX_LOGIN_ATTEMPTS:z.coerce.number().default(5),
  LOCKOUT_DURATION:  z.coerce.number().default(15),
  LOG_LEVEL:         z.enum(['error','warn','info','debug']).default('info'),
  SCANNER_WORKERS:   z.coerce.number().default(4),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
