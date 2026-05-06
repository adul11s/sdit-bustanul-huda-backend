import { Router, Request, Response } from 'express';
import { academicService } from '../services/academic.service.js';
import { roleMiddleware } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.use(roleMiddleware(['HOMEROOM_TEACHER']));

// Helper to get teacher with homeroom class
async function getHomeroomTeacher(userId: string) {
  const teacher = await prisma.teacher.findFirst({
    where: { userId },
    include: { homeroomClass: true },
  });
  return teacher;
}

// Timezone-safe date formatter (YYYY-MM-DD in local time)
function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

router.get('/class', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.json({ success: true, data: null, message: 'No homeroom class assigned yet' });
    }
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        level: true,
        homeroomTeacher: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        students: {
          include: {
            user: { select: { id: true, name: true, gender: true } },
          },
        },
      },
    });
    res.json({ success: true, data: classData });
  } catch (error) {
    console.error('Homeroom class error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/students', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.json({ success: true, data: [], message: 'No homeroom class assigned yet' });
    }
    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true, gender: true } },
        enrollments: { include: { subject: true } },
        grades: true,
        attendances: { where: { date: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) } } },
      },
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/grades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    }
    const grades = await prisma.grade.findMany({
      where: { student: { classId } },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        subject: true,
        assignment: true,
        exam: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/attendance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    }
    const { date } = req.query;
    let targetDate: Date;
    if (date && typeof date === 'string') {
      const [y, m, d] = date.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    } else {
      targetDate = new Date();
    }
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true, gender: true } },
        attendances: { where: { date: { gte: startOfDay, lte: endOfDay } } },
      },
      orderBy: { user: { name: 'asc' } },
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/homeroom/attendance
// Body: { date: "2026-04-01", records: [{ studentId, status, note? }] }
router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    }

    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'date and records are required' });
    }

    const [y, m, d] = date.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d);
    targetDate.setHours(0, 0, 0, 0);

    // Validate all students belong to homeroom class
    const studentIds = records.map((r: any) => r.studentId);
    const validStudents = await prisma.student.findMany({
      where: { id: { in: studentIds }, classId },
      select: { id: true },
    });
    const validIds = new Set(validStudents.map((s) => s.id));

    const results = [];
    for (const record of records) {
      if (!validIds.has(record.studentId)) continue;

      const upserted = await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: targetDate,
          },
        },
        update: {
          status: record.status,
          note: record.note || null,
        },
        create: {
          studentId: record.studentId,
          date: targetDate,
          status: record.status,
          note: record.note || null,
        },
      });
      results.push(upserted);
    }

    res.json({ success: true, data: results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// GET /api/homeroom/attendance/monthly?month=2026-04
router.get('/attendance/monthly', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    }

    const { month } = req.query; // e.g. "2026-04"
    const now = new Date();
    const targetMonth = month ? String(month) : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, monthNum] = targetMonth.split('-').map(Number);

    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // Get all students in class
    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true } },
        attendances: {
          where: { date: { gte: startOfMonth, lte: endOfMonth } },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    const summary = students.map((student) => {
      const counts = {
        PRESENT: 0,
        ABSENT: 0,
        SICK: 0,
        PERMISSION: 0,
      };
      for (const a of student.attendances) {
        if (counts.hasOwnProperty(a.status)) {
          (counts as any)[a.status]++;
        }
      }
      return {
        studentId: student.id,
        studentName: student.user.name,
        summary: counts,
        totalDays: student.attendances.length,
      };
    });

    // Matrix data: raw attendance per student per date
    const matrix = students.map((student) => ({
      studentId: student.id,
      studentName: student.user.name,
      records: student.attendances.map((a) => ({
        date: formatDateLocal(a.date),
        status: a.status,
        note: a.note,
      })),
    }));

    // Get all calendar events that affect attendance (holidays)
    const holidays = await prisma.calendarEvent.findMany({
      where: {
        type: 'HOLIDAY',
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
      select: { title: true, startDate: true, endDate: true },
    });

    // Generate all dates in the month for column headers
    const dates: string[] = [];
    const d = new Date(startOfMonth);
    while (d <= endOfMonth) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dates.push(formatDateLocal(d));
      }
      d.setDate(d.getDate() + 1);
    }

    res.json({ success: true, data: summary, matrix, dates, month: targetMonth, holidays });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/ranking', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    }
    const ranking = await academicService.getRanking(classId);
    res.json({ success: true, data: ranking });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await getHomeroomTeacher(userId);
    const classId = teacher?.homeroomClass?.id;
    if (!classId) {
      return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    }
    const stats = await academicService.getClassStats(classId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;