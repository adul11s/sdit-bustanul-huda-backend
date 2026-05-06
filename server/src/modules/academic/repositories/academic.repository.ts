import { prisma } from '../../../core/database/prisma.js';

export interface IAcademicRepository {
  getClassLevels(): Promise<unknown[]>;
  getClasses(): Promise<unknown[]>;
  getSubjects(teacherId?: string): Promise<unknown[]>;
  getAcademicYears(): Promise<unknown[]>;
  getSchedules(classId?: string): Promise<unknown[]>;
  createClass(data: { name: string; levelId: string }): Promise<unknown>;
  createSubject(data: { name: string; code?: string; description?: string; teacherId: string }): Promise<unknown>;
  createSchedule(data: { subjectId: string; classId: string; academicYearId: string; dayOfWeek: number; startTime: string; endTime: string }): Promise<unknown>;
  createAcademicYear(data: { name: string; startDate: Date; endDate: Date }): Promise<unknown>;
}

export class AcademicRepository implements IAcademicRepository {
  async getClassLevels(): Promise<unknown[]> {
    return prisma.classLevel.findMany({
      orderBy: { name: 'asc' },
      include: { classes: { include: { homeroomTeacher: { include: { user: true } }, _count: { select: { students: true } } } } },
    });
  }

  async getClasses(): Promise<unknown[]> {
    return prisma.class.findMany({ include: { level: true, homeroomTeacher: { include: { user: true } } } });
  }

  async getSubjects(teacherId?: string): Promise<unknown[]> {
    const where = teacherId ? { teacherId } : {};
    return prisma.subject.findMany({
      where,
      include: { teacher: { include: { user: true } }, _count: { select: { enrollments: true, assignments: true, exams: true } } },
    });
  }

  async getAcademicYears(): Promise<unknown[]> {
    return prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  async getSchedules(classId?: string): Promise<unknown[]> {
    const where = classId ? { classId } : {};
    return prisma.schedule.findMany({
      where,
      include: { subject: { include: { teacher: true } }, class: { include: { level: true } }, academicYear: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createClass(data: { name: string; levelId: string }): Promise<unknown> {
    return prisma.class.create({ data });
  }

  async createSubject(data: { name: string; code?: string; description?: string; teacherId: string }): Promise<unknown> {
    return prisma.subject.create({ data });
  }

  async createSchedule(data: { subjectId: string; classId: string; academicYearId: string; dayOfWeek: number; startTime: string; endTime: string }): Promise<unknown> {
    return prisma.schedule.create({ data });
  }

  async createAcademicYear(data: { name: string; startDate: Date; endDate: Date }): Promise<unknown> {
    return prisma.academicYear.create({ data });
  }
}

export const academicRepository = new AcademicRepository();