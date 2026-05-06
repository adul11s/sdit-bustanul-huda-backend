import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { academicService } from '../services/academic.service.js';
import { calendarService } from '../services/calendar.service.js';
import { profileService } from '../services/profile.service.js';
import { successResponse, errorResponse } from '../core/utils/response.js';

function sanitizeInput(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

const router = Router();

// GET /api/public/bulletins - List published bulletins (no auth required)
router.get('/bulletins', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    const bulletins = await prisma.bulletin.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { name: true } },
        media: { orderBy: { order: 'asc' } },
      },
    });

    const sanitized = bulletins.map((b) => ({
      ...b,
      content: stripHtml(b.content),
    }));

    return successResponse(res, sanitized);
  } catch (error: any) {
    return errorResponse(res, 500, error.message);
  }
});

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// GET /api/public/bulletins/:id - Get single published bulletin
router.get('/bulletins/:id', async (req, res) => {
  try {
    const bulletin = await prisma.bulletin.findUnique({
      where: { id: req.params.id, isPublished: true },
      include: {
        author: { select: { name: true } },
        media: { orderBy: { order: 'asc' } },
      },
    });
    if (!bulletin) {
      return errorResponse(res, 404, 'Bulletin not found');
    }
    return successResponse(res, { ...bulletin, content: stripHtml(bulletin.content) });
  } catch (error: any) {
    return errorResponse(res, 500, error.message);
  }
});

// GET /api/public/calendar-events - List public calendar events
router.get('/calendar-events', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const events = await calendarService.getEvents(startDate, endDate);
    return successResponse(res, events);
  } catch (error: any) {
    return errorResponse(res, 500, error.message);
  }
});

// GET /api/public/teachers - List public teacher profiles (no auth required)
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await profileService.getPublicTeachers();
    return successResponse(res, teachers);
  } catch (error: any) {
    return errorResponse(res, 500, error.message);
  }
});

// POST /api/public/inquiry - Submit enrollment inquiry (no auth required)
router.post('/inquiry', async (req, res) => {
  try {
    const { parentName, studentName, phone, email, gradeInterest, message } = req.body;

    if (!parentName || !studentName || !phone || !gradeInterest) {
      return errorResponse(res, 400, 'Parent name, student name, phone, and grade interest are required');
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        parentName: sanitizeInput(parentName),
        studentName: sanitizeInput(studentName),
        phone: sanitizeInput(phone),
        email: sanitizeInput(email || ''),
        gradeInterest: sanitizeInput(gradeInterest),
        message: sanitizeInput(message || ''),
      },
    });

    return successResponse(res, inquiry, 'Inquiry submitted successfully');
  } catch (error: any) {
    return errorResponse(res, 500, error.message);
  }
});

export default router;
