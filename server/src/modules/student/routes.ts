import { Router, Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service.js';
import { studentRepository } from '../repositories/student.repository.js';
import { successResponse, errorResponse } from '../../../../core/utils/response.js';

const studentService = new StudentService(studentRepository);
const router = Router();

router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const profile = await studentService.getProfile(userId);
    successResponse(res, profile);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/subjects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const subjects = await studentService.getSubjects(userId);
    successResponse(res, subjects);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const { prisma } = await import('../../../../core/database/prisma.js');
    const student = await prisma.student.findFirst({ where: { userId } });
    const schedules = await prisma.schedule.findMany({
      where: { classId: student?.classId || '' },
      include: { subject: { include: { teacher: true } }, class: { include: { level: true } }, academicYear: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    successResponse(res, schedules);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/grades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const { prisma } = await import('../../../../core/database/prisma.js');
    const student = await prisma.student.findFirst({ where: { userId } });
    const grades = await prisma.grade.findMany({
      where: { studentId: student!.id },
      include: { subject: true, assignment: true, exam: true },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, grades);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/billing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const { prisma } = await import('../../../../core/database/prisma.js');
    const student = await prisma.student.findFirst({ where: { userId } });
    const invoices = await prisma.invoice.findMany({
      where: { studentId: student!.id },
      orderBy: { createdAt: 'desc' },
    });
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    successResponse(res, { totalBilled, totalPaid, totalOutstanding: totalBilled - totalPaid, invoices });
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;