import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { authRepository } from '../repositories/auth.repository';
import { AuthController } from '../controllers/auth.controller';
import { verifyToken, extractToken } from '../../../core/utils/auth';

const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

const router = Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  await authController.login(req, res, next);
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  await authController.register(req, res, next);
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const payload = await verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  (req as Request & { user: { userId: string; email: string; role: string } }).user = { 
    userId: payload.userId, 
    email: payload.email, 
    role: payload.role 
  };
  await authController.getProfile(req, res, next);
});

router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const payload = await verifyToken(token);
  
  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  (req as Request & { user: { userId: string; email: string; role: string } }).user = { 
    userId: payload.userId, 
    email: payload.email, 
    role: payload.role 
  };
  await authController.changePassword(req, res, next);
});

export default router;