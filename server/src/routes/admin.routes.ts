import { Router, Request, Response } from 'express';
import { userService } from '../services/user.service.js';
import { academicService } from '../services/academic.service.js';
import { scheduleValidationService } from '../services/schedule-validation.service.js';
import { workloadCalculationService } from '../services/workload-calculation.service.js';
import { studentManagementService } from '../services/student-management.service.js';
import { calendarService } from '../services/calendar.service.js';
import { roleMiddleware } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import prisma from '../utils/prisma.js';
import type { Role } from '../types/index.js';

const router = Router();

router.use(roleMiddleware(['ADMIN']));

router.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', role } = req.query;
    const result = await userService.findAll(Number(page), Number(limit), role as string);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const requestingUserId = (req as any).user?.userId;
    const requestingRole = (req as any).user?.role;
    const user = await userService.findById(req.params.id, requestingUserId, requestingRole);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/users', auditLog('CREATE', 'User'), async (req: Request, res: Response) => {
  try {
    const user = await userService.create(req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/users/:id', auditLog('UPDATE', 'User', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const user = await userService.update(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/users/:id', auditLog('DELETE', 'User', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    await userService.delete(req.params.id);
    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/users/bulk', auditLog('CREATE', 'User'), async (req: Request, res: Response) => {
  try {
    const { users, defaultPassword } = req.body;
    const results = [];
    const errors = [];
    for (const userData of users) {
      try {
        const password = userData.password || defaultPassword || 'password123';
        const user = await userService.create({ ...userData, password });
        results.push(user);
      } catch (err: any) {
        errors.push({ user: userData.email || userData.name, error: err.message });
      }
    }
    res.json({ success: true, data: { created: results.length, errors, users: results } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/users/:id/activate', auditLog('STATUS_CHANGE', 'User', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const user = await userService.activate(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await userService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/class-levels', async (req: Request, res: Response) => {
  try {
    const levels = await academicService.getClassLevels();
    res.json({ success: true, data: levels });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/class-levels', async (req: Request, res: Response) => {
  try {
    const level = await academicService.createClassLevel(req.body.name);
    res.json({ success: true, data: level });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/classes', auditLog('CREATE', 'Class'), async (req: Request, res: Response) => {
  try {
    const classData = await academicService.createClass(req.body);
    res.json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/classes/:id/homeroom', auditLog('UPDATE', 'Class', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const classData = await academicService.assignHomeroomTeacher(req.params.id, req.body.teacherId);
    res.json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const subjects = await academicService.getSubjects();
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/subjects', auditLog('CREATE', 'Subject'), async (req: Request, res: Response) => {
  try {
    const subject = await academicService.createSubject(req.body);
    res.json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/subjects/:id', auditLog('UPDATE', 'Subject', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const subject = await prisma.subject.update({
      where: { id: req.params.id },
      data: req.body,
      include: { teacher: { include: { user: { select: { id: true, name: true } } } } },
    });
    res.json({ success: true, data: subject });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.delete('/subjects/:id', auditLog('DELETE', 'Subject', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    await academicService.deleteSubject(req.params.id);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/academic-years', async (req: Request, res: Response) => {
  try {
    const years = await academicService.getAcademicYears();
    res.json({ success: true, data: years });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/academic-years', auditLog('CREATE', 'AcademicYear'), async (req: Request, res: Response) => {
  try {
    const year = await academicService.createAcademicYear(req.body.name, new Date(req.body.startDate), new Date(req.body.endDate));
    res.json({ success: true, data: year });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/academic-years/:id/set-current', auditLog('UPDATE', 'AcademicYear', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const year = await academicService.setCurrentAcademicYear(req.params.id);
    res.json({ success: true, data: year });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/promotions', auditLog('UPDATE', 'PromotionHistory'), async (req: Request, res: Response) => {
  try {
    const result = await academicService.promoteStudents(req.body.students);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/schedules', auditLog('CREATE', 'Schedule'), async (req: Request, res: Response) => {
  try {
    // Validate schedule before creating
    const validation = await scheduleValidationService.validateSchedule(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const schedule = await academicService.createSchedule(req.body);
    res.json({ success: true, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/schedules', async (req: Request, res: Response) => {
  try {
    const schedules = await academicService.getSchedules(req.query.classId as string, req.query.academicYearId as string);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Teacher schedules
router.get('/teacher-schedules/:teacherId', async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { subject: { teacherId: req.params.teacherId } },
      include: { subject: true, class: { include: { level: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Class schedules
router.get('/class-schedules/:classId', async (req: Request, res: Response) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: { classId: req.params.classId },
      include: { subject: { include: { teacher: { include: { user: true } } } } },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Teacher availability
router.get('/teacher-availability/:teacherId/:dayOfWeek', async (req: Request, res: Response) => {
  try {
    const slots = await scheduleValidationService.getTeacherAvailability(
      req.params.teacherId,
      Number(req.params.dayOfWeek)
    );
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Class availability
router.get('/class-availability/:classId/:dayOfWeek', async (req: Request, res: Response) => {
  try {
    const slots = await scheduleValidationService.getClassAvailability(
      req.params.classId,
      Number(req.params.dayOfWeek)
    );
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Teacher workload
router.get('/workload/:teacherId', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const summary = await workloadCalculationService.getTeacherWorkloadSummary(req.params.teacherId, year);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/workload', async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const workloads = await workloadCalculationService.getAllTeachersWorkload(year);
    res.json({ success: true, data: workloads });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Teacher workload detail with schedule info
router.get('/workload/:teacherId/detail', async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.teacherId;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const [schedules, summary] = await Promise.all([
      prisma.schedule.findMany({
        where: {
          subject: { teacherId },
          createdAt: { gte: startOfYear, lte: endOfYear },
        },
        include: {
          subject: true,
          class: { include: { level: true } },
          academicYear: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      workloadCalculationService.getTeacherWorkloadSummary(teacherId, year),
    ]);

    res.json({
      success: true,
      data: {
        summary,
        schedules: schedules.map((s) => ({
          id: s.id,
          className: `${s.class.level.name} - ${s.class.name}`,
          subjectName: s.subject.name,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          durationHours: ((parseInt(s.endTime.split(':')[0]) * 60 + parseInt(s.endTime.split(':')[1])) -
            (parseInt(s.startTime.split(':')[0]) * 60 + parseInt(s.startTime.split(':')[1]))) / 60,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Student class management
router.get('/students/unassigned', async (req: Request, res: Response) => {
  try {
    const students = await studentManagementService.getUnassignedStudents();
    res.json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/classes/:classId/students', async (req: Request, res: Response) => {
  try {
    const students = await studentManagementService.getClassStudents(req.params.classId);
    res.json({ success: true, data: students });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/students/:studentId/assign-class', auditLog('UPDATE', 'Student', (req) => req.params.studentId), async (req: Request, res: Response) => {
  try {
    const student = await studentManagementService.assignStudentToClass(req.params.studentId, req.body.classId);
    res.json({ success: true, data: student });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/students/transfer', auditLog('UPDATE', 'ClassTransferHistory'), async (req: Request, res: Response) => {
  try {
    const result = await studentManagementService.transferStudent(req.body);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/students/:studentId/transfer-history', async (req: Request, res: Response) => {
  try {
    const history = await studentManagementService.getTransferHistory(req.params.studentId);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Applicant access (Admin & Finance only)
router.get('/inquiries', async (req: Request, res: Response) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/inquiries/:id/status', async (req: Request, res: Response) => {
  try {
    const inquiry = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json({ success: true, data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/invoices/generate-monthly', auditLog('CREATE', 'Invoice'), async (req: Request, res: Response) => {
  try {
    const { year, month, amount, dueDate } = req.body;
    const invoices = await academicService.generateMonthlyInvoices(year, month, amount, new Date(dueDate));
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ================== CALENDAR EVENTS ==================
router.get('/calendar-events', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const events = await calendarService.getEvents(startDate, endDate);
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/calendar-events/:id', async (req: Request, res: Response) => {
  try {
    const event = await calendarService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/calendar-events', auditLog('CREATE', 'CalendarEvent'), async (req: Request, res: Response) => {
  try {
    const event = await calendarService.createEvent(req.body);
    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.put('/calendar-events/:id', auditLog('UPDATE', 'CalendarEvent', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const event = await calendarService.updateEvent(req.params.id, req.body);
    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.delete('/calendar-events/:id', auditLog('DELETE', 'CalendarEvent', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    await calendarService.deleteEvent(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// ================== ENHANCED BULLETINS ==================
router.get('/bulletins', async (req: Request, res: Response) => {
  try {
    const bulletins = await academicService.getBulletins(
      req.query.category as string,
      req.query.status as string,
      true // include unpublished for admin
    );
    res.json({ success: true, data: bulletins });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/bulletins/:id', async (req: Request, res: Response) => {
  try {
    const bulletin = await academicService.getBulletinById(req.params.id);
    if (!bulletin) {
      return res.status(404).json({ success: false, error: 'Bulletin not found' });
    }
    res.json({ success: true, data: bulletin });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/bulletins', auditLog('CREATE', 'Bulletin'), async (req: Request, res: Response) => {
  try {
    const bulletin = await academicService.createBulletin((req as any).user.userId, req.body);
    res.json({ success: true, data: bulletin });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.put('/bulletins/:id', auditLog('UPDATE', 'Bulletin', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    const bulletin = await academicService.updateBulletin(req.params.id, req.body);
    res.json({ success: true, data: bulletin });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.delete('/bulletins/:id', auditLog('DELETE', 'Bulletin', (req) => req.params.id), async (req: Request, res: Response) => {
  try {
    await academicService.deleteBulletin(req.params.id);
    res.json({ success: true, message: 'Bulletin deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;