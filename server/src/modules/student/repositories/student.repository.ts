import { prisma } from '../../../../core/database/prisma.js';
import type { StudentWithDetails, Enrollment, Attendance } from '../interfaces/student.types.js';

export interface IStudentRepository {
  findByUserId(userId: string): Promise<StudentWithDetails | null>;
  findById(id: string): Promise<StudentWithDetails | null>;
  getEnrollments(studentId: string): Promise<Enrollment[]>;
  getGrades(studentId: string): Promise<unknown[]>;
  getAttendance(studentId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getSchedule(studentId: string): Promise<unknown[]>;
  getBillingSummary(studentId: string): Promise<unknown>;
  getInvoices(studentId: string): Promise<unknown[]>;
}

export class StudentRepository implements IStudentRepository {
  async findByUserId(userId: string): Promise<StudentWithDetails | null> {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        user: true,
        class: { include: { level: true, homeroomTeacher: { include: { user: true } } } },
        enrollments: { where: { isActive: true }, include: { subject: { include: { teacher: true } } } },
      },
    });
    return student as unknown as Promise<StudentWithDetails | null>;
  }

  async findById(id: string): Promise<StudentWithDetails | null> {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        class: { include: { level: true, homeroomTeacher: { include: { user: true } } } },
        enrollments: { where: { isActive: true }, include: { subject: { include: { teacher: true } } } },
      },
    });
    return student as unknown as Promise<StudentWithDetails | null>;
  }

  async getEnrollments(studentId: string): Promise<Enrollment[]> {
    return prisma.enrollment.findMany({
      where: { studentId, isActive: true },
      include: { subject: { include: { teacher: { include: { user: true } } } } },
    }) as unknown as Enrollment[];
  }

  async getGrades(studentId: string): Promise<unknown[]> {
    return prisma.grade.findMany({
      where: { studentId },
      include: { subject: true, assignment: true, exam: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAttendance(studentId: string, start?: Date, end?: Date): Promise<Attendance[]> {
    const query: Record<string, unknown> = { studentId };
    if (start || end) {
      const dateCond: Record<string, Date> = {};
      if (start) dateCond.gte = start;
      if (end) dateCond.lte = end;
      query.date = dateCond;
    }
    return prisma.attendance.findMany({ where: query, orderBy: { date: 'desc' } }) as unknown as Attendance[];
  }

  async getSchedule(studentId: string): Promise<unknown[]> {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    return prisma.schedule.findMany({
      where: { classId: student?.classId || '' },
      include: { subject: { include: { teacher: true } }, class: { include: { level: true } }, academicYear: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getBillingSummary(studentId: string): Promise<unknown> {
    const invoices = await prisma.invoice.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } });
    const billed = invoices.reduce((s, i) => s + i.amount, 0);
    const paid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const unpaid = invoices.filter(i => i.status !== 'PAID');
    return { totalBilled: billed, totalPaid: paid, totalOutstanding: billed - paid, unpaidCount: unpaid.length, invoices: invoices.slice(0, 5) };
  }

  async getInvoices(studentId: string): Promise<unknown[]> {
    return prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { student: { include: { user: true } }, payments: true },
    });
  }
}

export const studentRepository = new StudentRepository();