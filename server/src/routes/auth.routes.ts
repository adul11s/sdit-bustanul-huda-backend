import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { extractToken } from '../utils/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validation.js';
import { generateToken } from '../utils/auth.js';
import type { Role } from '../types/index.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const router = Router();

router.post('/login', authRateLimit, validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const result = await authService.login(email, password);
    if (!result) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = await generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as Role,
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ success: true, data: result.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/register', authRateLimit, async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    if (!result) {
      return res.status(400).json({ success: false, error: 'User already exists or invalid data' });
    }

    const token = await generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as Role,
    });

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ success: true, data: result.user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = extractToken(req.headers.authorization) || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { verifyToken } = await import('../utils/auth.js');
    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    const user = await authService.getProfile(payload.userId);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ success: true, message: 'Logged out' });
});

router.post('/change-password', validateBody(changePasswordSchema), async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user || {};
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, oldPassword, newPassword);
    if (!result) {
      return res.status(400).json({ success: false, error: 'Invalid old password' });
    }
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
