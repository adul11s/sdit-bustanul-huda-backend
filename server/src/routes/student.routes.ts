import { Router, Request, Response } from 'express';
import { academicService } from '../services/academic.service.js';
import { paymentService } from '../services/payment.service.js';
import { gradeCalculationService } from '../services/grade-calculation.service.js';
import { roleMiddleware } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.use(roleMiddleware(['STUDENT']));

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, gender: true, birthDate: true, birthPlace: true, avatar: true } },
        class: {
          include: {
            level: true,
            homeroomTeacher: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        enrollments: {
          where: { isActive: true },
          include: {
            subject: {
              include: {
                teacher: {
                  include: {
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        grades: { include: { subject: true, assignment: true, exam: true }, orderBy: { createdAt: 'desc' }, take: 50 },
        attendances: { orderBy: { date: 'desc' }, take: 30 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Fetch submissions separately since they need exam details
    const submissions = await prisma.submission.findMany({
      where: { studentId: student.id },
      include: { exam: { include: { subject: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        ...student,
        submissions,
      },
    });
  } catch (error: any) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const enrollments = await academicService.getEnrollments(student!.id);
    res.json({ success: true, data: enrollments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const schedules = await academicService.getSchedules(student?.classId || undefined);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/exams', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id, isActive: true },
      select: { subjectId: true },
    });

    // Filter exams by target: class-based OR student-specific
    const exams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        subjectId: { in: enrollments.map(e => e.subjectId) },
        OR: [
          { targetType: 'CLASS', classId: student.classId },
          { targetType: 'STUDENT', studentTargets: { some: { studentId: student.id } } },
        ],
      },
      include: { subject: true, submissions: { where: { studentId: student.id } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: exams.map(e => ({ ...e, date: e.createdAt })) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/exams/:id/questions', async (req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      where: { examId: req.params.id },
      select: { id: true, text: true, type: true, options: true },
      orderBy: { order: 'asc' },
    });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/exams/:id/submit', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const { answers } = req.body;
    const submitted = [];
    for (const answer of answers) {
      const submittedAnswer = await prisma.studentAnswer.create({
        data: { studentId: student!.id, questionId: answer.questionId, answer: answer.content, submissionId: '' },
      });
      submitted.push(submittedAnswer);
    }
    res.json({ success: true, data: submitted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/grades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const grades = await academicService.getGrades(student!.id);
    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/grades/:subjectId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const grades = await academicService.getStudentGrades(student!.id, req.params.subjectId);
    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/attendance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const { startDate, endDate } = req.query;
    const attendance = await academicService.getAttendance(
      student!.id,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/billing', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const billing = await paymentService.getStudentFinancialSummary(student!.id);
    res.json({ success: true, data: billing });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const invoices = await paymentService.getInvoices(student!.id);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/bulletins', async (req: Request, res: Response) => {
  try {
    const bulletins = await academicService.getBulletins();
    res.json({ success: true, data: bulletins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ranking', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    const ranking = await academicService.getRanking(student!.classId || '');
    const myRank = ranking.findIndex(r => r.studentId === student!.id) + 1;
    res.json({ success: true, data: { ranking, myRank } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Final grade calculation per subject
router.get('/final-grades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const results = await gradeCalculationService.calculateAllSubjectGrades(student.id);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/final-grades/:subjectId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    const result = await gradeCalculationService.calculateFinalGrade(student.id, req.params.subjectId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;