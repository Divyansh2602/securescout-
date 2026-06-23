import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { validate, registerSchema, loginSchema } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({ message: 'Registration successful', data: result });
  } catch (err) { next(err); }
});

authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.login({
      ...req.body,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });
    res.json({ message: 'Login successful', data: result });
  } catch (err) { next(err); }
});

authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ error: 'Refresh token required' }); return; }
    const tokens = await AuthService.refresh(refreshToken);
    res.json({ data: tokens });
  } catch (err) { next(err); }
});

authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await AuthService.logout(req.user!.sessionId, req.user!.userId, req.user!.orgId);
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ data: req.user });
});
