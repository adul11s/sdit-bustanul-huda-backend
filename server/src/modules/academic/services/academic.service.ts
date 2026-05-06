import type { IAcademicRepository } from '../interfaces/academic.repository.interface.js';

export interface IAcademicService {
  getClassLevels(): Promise<unknown[]>;
  getClasses(): Promise<unknown[]>;
  getSubjects(teacherId?: string): Promise<unknown[]>;
  getAcademicYears(): Promise<unknown[]>;
  setCurrentAcademicYear(id: string): Promise<unknown>;
  createClass(data: { name: string; levelId: string }): Promise<unknown>;
  createSubject(data: { name: string; code?: string; description?: string; teacherId: string }): Promise<unknown>;
  createSchedule(data: { subjectId: string; classId: string; academicYearId: string; dayOfWeek: number; startTime: string; endTime: string }): Promise<unknown>;
  createAcademicYear(data: { name: string; startDate: Date; endDate: Date }): Promise<unknown>;
  getSchedules(classId?: string): Promise<unknown[]>;
  enrollStudent(studentId: string, subjectId: string): Promise<unknown>;
  unenrollStudent(studentId: string, subjectId: string): Promise<unknown>;
}

export class AcademicService implements IAcademicService {
  constructor(private readonly repository: IAcademicRepository) {}

  async getClassLevels(): Promise<unknown[]> {
    return this.repository.getClassLevels();
  }

  async getClasses(): Promise<unknown[]> {
    return this.repository.getClasses();
  }

  async getSubjects(teacherId?: string): Promise<unknown[]> {
    return this.repository.getSubjects(teacherId);
  }

  async getAcademicYears(): Promise<unknown[]> {
    return this.repository.getAcademicYears();
  }

  async setCurrentAcademicYear(id: string): Promise<unknown> {
    const { prisma } = await import('../../../core/database/prisma.js');
    await prisma.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return prisma.academicYear.update({ where: { id }, data: { isCurrent: true } });
  }

  async createClass(data: { name: string; levelId: string }): Promise<unknown> {
    return this.repository.createClass(data);
  }

  async createSubject(data: { name: string; code?: string; description?: string; teacherId: string }): Promise<unknown> {
    return this.repository.createSubject(data);
  }

  async createSchedule(data: { subjectId: string; classId: string; academicYearId: string; dayOfWeek: number; startTime: string; endTime: string }): Promise<unknown> {
    return this.repository.createSchedule(data);
  }

  async createAcademicYear(data: { name: string; startDate: Date; endDate: Date }): Promise<unknown> {
    return this.repository.createAcademicYear(data);
  }

  async getSchedules(classId?: string): Promise<unknown[]> {
    return this.repository.getSchedules(classId);
  }

  async enrollStudent(studentId: string, subjectId: string): Promise<unknown> {
    const { prisma } = await import('../../../core/database/prisma.js');
    return prisma.enrollment.create({ data: { studentId, subjectId } });
  }

  async unenrollStudent(studentId: string, subjectId: string): Promise<unknown> {
    const { prisma } = await import('../../../core/database/prisma.js');
    return prisma.enrollment.update({
      where: { studentId_subjectId: { studentId, subjectId } },
      data: { isActive: false },
    });
  }
}