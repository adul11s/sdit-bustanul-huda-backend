import { Router, Request, Response } from 'express';
import { academicService } from '../services/academic.service.js';
import { roleMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, status } = req.query;
    const bulletins = await academicService.getBulletins(category as string, status as string);
    res.json({ success: true, data: bulletins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bulletin = await prisma.bulletin.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: bulletin });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/', roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const bulletin = await academicService.createBulletin(userId, req.body);
    if (!bulletin) {
      res.status(500).json({ success: false, error: 'Failed to create bulletin' });
      return;
    }

    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        type: 'BULLETIN',
        title: bulletin.title,
        message: bulletin.content.substring(0, 100),
      })),
    });
    
    res.json({ success: true, data: bulletin });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/:id', roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const bulletin = await prisma.bulletin.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: bulletin });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/:id', roleMiddleware(['ADMIN']), async (req: Request, res: Response) => {
  try {
    await prisma.bulletin.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Bulletin deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;