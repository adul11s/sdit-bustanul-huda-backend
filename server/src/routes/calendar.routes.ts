import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { calendarService } from '../services/calendar.service.js';

const router = Router();

/**
 * GET /api/calendar/events
 * Public read-only calendar for all authenticated users
 */
router.get('/events', authMiddleware, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const events = await calendarService.getEvents(startDate, endDate);
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;
