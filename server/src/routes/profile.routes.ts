import { Router, Request, Response } from 'express';
import { profileService } from '../services/profile.service.js';
import { roleMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(roleMiddleware(['ADMIN', 'TEACHER', 'HOMEROOM_TEACHER', 'STUDENT', 'FINANCE']));

/**
 * GET /api/profile
 * Get current user's full profile (including sensitive data)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const profile = await profileService.getProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * PUT /api/profile
 * Update current user's profile
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const allowedFields = ['name', 'phone', 'birthDate', 'birthPlace', 'address', 'avatar', 'title', 'teachingStyle', 'hobby', 'password'];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const profile = await profileService.updateProfile(userId, updateData);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;
