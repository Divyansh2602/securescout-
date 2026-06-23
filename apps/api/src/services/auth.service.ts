import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { JwtService, TokenPair } from './jwt.service';
import { AuditService } from './audit.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../middleware/auth';

interface RegisterInput {
  email:    string;
  password: string;
  name:     string;
  orgName:  string;
}

interface LoginInput {
  email:     string;
  password:  string;
  ipAddress: string;
  userAgent: string;
}

export class AuthService {
  // ── Register ────────────────────────────────────────────────────────────────
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError('Email already registered', 409);

    // Password strength enforced at validation layer (zod) before reaching here
    const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
    const orgSlug = input.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + uuidv4().slice(0, 6);

    // Single transaction — orphaned org rows are impossible if user creation fails
    const { org, user } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.orgName, slug: orgSlug },
      });
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          name:  input.name,
          role:  'ORG_ADMIN',
          orgId: org.id,
        },
        select: { id: true, email: true, name: true, role: true, orgId: true },
      });
      return { org, user };
    });

    logger.info(`New user registered: ${user.email} (org: ${org.slug})`);
    return { user, org };
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  static async login(input: LoginInput): Promise<TokenPair & { user: object }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // Constant-time response to prevent user enumeration via timing.
    // Hash must be exactly 60 chars for bcryptjs to run full key-scheduling work.
    if (!user) {
      await bcrypt.compare(input.password, '$2b$12$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
      throw new AppError('Invalid credentials', 401);
    }

    // Return the same 401 for locked/disabled accounts to avoid account enumeration.
    // Lockout is still enforced — we just don't reveal whether the account exists.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(input.password, user.passwordHash);

    if (!valid) {
      // Atomic increment to prevent race condition on concurrent login attempts
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: { increment: 1 } },
        select: { loginAttempts: true },
      });
      if (updated.loginAttempts >= config.MAX_LOGIN_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: { loginAttempts: 0, lockedUntil: new Date(Date.now() + config.LOCKOUT_DURATION * 60000) },
        });
      }
      throw new AppError('Invalid credentials', 401);
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const sessionId = uuidv4();
    const tokens = JwtService.generateTokenPair({
      userId: user.id, orgId: user.orgId,
      role: user.role, email: user.email, sessionId,
    });

    // Store token hashes — never persist raw bearer tokens in the DB
    await prisma.session.create({
      data: {
        id: sessionId, userId: user.id,
        token: hashToken(tokens.accessToken),
        refreshToken: hashToken(tokens.refreshToken),
        ipAddress: input.ipAddress, userAgent: input.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await AuditService.log({
      action: 'USER_LOGIN', userId: user.id, orgId: user.orgId,
      ipAddress: input.ipAddress, userAgent: input.userAgent,
    });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  // ── Refresh Token ─────────────────────────────────────────────────────────────
  static async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = JwtService.verifyRefreshToken(refreshToken);

    const session = await prisma.session.findUnique({ where: { refreshToken: hashToken(refreshToken) } });
    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const newTokens = JwtService.generateTokenPair({
      userId: payload.userId, orgId: payload.orgId,
      role: payload.role, email: payload.email, sessionId: session.id,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: hashToken(newTokens.accessToken),
        refreshToken: hashToken(newTokens.refreshToken),
      },
    });

    return newTokens;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  static async logout(sessionId: string, userId: string, orgId: string) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    await AuditService.log({ action: 'USER_LOGOUT', userId, orgId });
  }
}
