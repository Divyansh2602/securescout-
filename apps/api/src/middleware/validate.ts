import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { AppError } from '../utils/errors';

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body:   req.body,
      query:  req.query,
      params: req.params,
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      next(new AppError('Validation failed', 400, errors));
      return;
    }

    // Replace with parsed (sanitized) data
    req.body   = result.data.body   ?? req.body;
    req.query  = result.data.query  ?? req.query;
    req.params = result.data.params ?? req.params;
    next();
  };

// ── Schemas ───────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    email:   z.string().email().toLowerCase().trim(),
    password:z.string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    name:    z.string().min(2).max(100).trim(),
    orgName: z.string().min(2).max(100).trim(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email:    z.string().email().toLowerCase().trim(),
    password: z.string().min(1),
  }),
});

// Allowlist of characters safe for scan target paths — no traversal sequences
const SAFE_PATH_RE = /^[a-zA-Z0-9_\-./\\: ]+$/;

export const createScanSchema = z.object({
  body: z.object({
    name:   z.string().min(1).max(200).trim(),
    target: z.string().min(1).max(500).trim()
      .refine((v) => !v.includes('..'), { message: 'Path traversal sequences are not allowed' })
      .refine((v) => SAFE_PATH_RE.test(v),  { message: 'Target path contains invalid characters' }),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page:  z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
});
