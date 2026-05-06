import { prisma } from '../../../../core/database/prisma.js';
import type { TeacherProfile, Subject, ClassWithLevel } from '../interfaces/teacher.types.js';

export interface ITeacherRepository {
  findByUserId(userId: string): Promise<TeacherProfile | null>;
  getSubjects(teacherId: string): Promise<Subject[]>;
  getClassLevels(): Promise<ClassWithLevel[]>;
}

export class TeacherRepository implements ITeacherRepository {
  async findByUserId(userId: string): Promise<TeacherProfile | null> {
    return prisma.teacher.findFirst({
      where: { userId },
      include: { user: true },
    }) as Promise<TeacherProfile | null>;
  }

  async getSubjects(teacherId: string): Promise<Subject[]> {
    return prisma.subject.findMany({
      where: { teacherId },
      include: { teacher: { include: { user: true } }, _count: { select: { enrollments: true, assignments: true, exams: true } } },
    }) as Promise<Subject[]>;
  }

  async getClassLevels(): Promise<ClassWithLevel[]> {
    return prisma.classLevel.findMany({
      orderBy: { name: 'asc' },
      include: { classes: { include: { homeroomTeacher: { include: { user: true } }, _count: { select: { students: true } } } } },
    }) as Promise<ClassWithLevel[]>;
  }
}

export const teacherRepository = new TeacherRepository();