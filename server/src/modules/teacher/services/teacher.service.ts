import type { ITeacherRepository } from '../interfaces/teacher.repository.interface.js';
import type { Subject, ClassWithLevel } from '../interfaces/teacher.types.js';

export interface ITeacherService {
  getSubjects(userId: string): Promise<Subject[]>;
  getClassLevels(): Promise<ClassWithLevel[]>;
  getAssignments(subjectId: string): Promise<unknown[]>;
  createAssignment(data: { title: string; content: string; dueDate: string; subjectId: string }): Promise<unknown>;
  getExams(subjectId?: string): Promise<unknown[]>;
  createExam(data: { title: string; date: string; type: string; subjectId: string }): Promise<unknown>;
  createQuestion(examId: string, data: { text: string; type: string; answer: string }): Promise<unknown>;
  createGrade(data: { studentId: string; subjectId: string; value: number; comment?: string }): Promise<unknown>;
  markAttendance(data: { studentId: string; date: Date; status: string }): Promise<unknown>;
  bulkAttendance(classId: string, date: Date, status: string): Promise<unknown>;
  getStudents(classId?: string): Promise<unknown[]>;
  getClassStats(classId: string): Promise<unknown>;
}

export class TeacherService implements ITeacherService {
  constructor(private readonly repository: ITeacherRepository) {}

  async getSubjects(userId: string): Promise<Subject[]> {
    const teacher = await this.repository.findByUserId(userId);
    return this.repository.getSubjects(teacher!.id);
  }

  async getClassLevels(): Promise<ClassWithLevel[]> {
    return this.repository.getClassLevels();
  }

  async getAssignments(subjectId: string): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.assignment.findMany({
      where: { subjectId },
      orderBy: { dueDate: 'desc' },
      include: { subject: true, grades: true },
    });
  }

  async createAssignment(data: { title: string; content: string; dueDate: string; subjectId: string }): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.assignment.create({
      data: { ...data, dueDate: new Date(data.dueDate) },
    });
  }

  async getExams(subjectId?: string): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    const where = subjectId ? { subjectId } : {};
    return prisma.exam.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { subject: { include: { teacher: true } }, questions: { orderBy: { order: 'asc' } }, grades: true },
    });
  }

  async createExam(data: { title: string; date: string; type: string; subjectId: string }): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.exam.create({
      data: { ...data, date: new Date(data.date) },
    });
  }

  async createQuestion(examId: string, data: { text: string; type: string; answer: string }): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.question.create({ data: { ...data, examId } });
  }

  async createGrade(data: { studentId: string; subjectId: string; value: number; comment?: string }): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    const grade = await prisma.grade.create({ data });
    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (student) {
      await prisma.notification.create({
        data: { userId: student.userId, type: 'GRADE', title: 'New Grade', message: `You received a grade of ${data.value}` },
      });
    }
    return grade;
  }

  async markAttendance(data: { studentId: string; date: Date; status: string }): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.attendance.upsert({
      where: { studentId_date: { studentId: data.studentId, date: data.date } },
      create: data,
      update: data,
    });
  }

  async bulkAttendance(classId: string, date: Date, status: string): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
    return prisma.attendance.createMany({
      data: students.map(s => ({ studentId: s.id, date, status })),
    });
  }

  async getStudents(classId?: string): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    const where = classId ? { classId } : {};
    return prisma.student.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, class: { include: { level: true } } },
    });
  }

  async getClassStats(classId: string): Promise<unknown> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    const [totalStudents, avgGrade] = await Promise.all([
      prisma.student.count({ where: { classId } }),
      prisma.grade.aggregate({ where: { student: { classId } }, _avg: { value: true } }),
    ]);
    return { totalStudents, avgGrade: avgGrade._avg.value || 0 };
  }
}