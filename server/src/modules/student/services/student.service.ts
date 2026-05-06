import type { IStudentRepository } from '../interfaces/student.repository.interface.js';
import type { Enrollment, Attendance } from '../interfaces/student.types.js';

export interface IStudentService {
  getProfile(userId: string): Promise<unknown>;
  getSubjects(userId: string): Promise<Enrollment[]>;
  getSchedule(userId: string): Promise<unknown[]>;
  getAssignments(userId: string): Promise<unknown[]>;
  getExams(userId: string): Promise<unknown[]>;
  getExamQuestions(examId: string): Promise<unknown[]>;
  submitExamAnswers(studentId: string, examId: string, answers: Array<{ questionId: string; content: string }>): Promise<unknown[]>;
  getGrades(userId: string, subjectId?: string): Promise<unknown[]>;
  getAttendance(userId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getBilling(userId: string): Promise<unknown>;
  getInvoices(userId: string): Promise<unknown[]>;
  getBulletins(): Promise<unknown[]>;
  getNotifications(userId: string): Promise<unknown[]>;
  markNotificationRead(notificationId: string): Promise<void>;
  getRanking(userId: string): Promise<unknown>;
}

export class StudentService implements IStudentService {
  constructor(private readonly repository: IStudentRepository) {}

  async getProfile(userId: string): Promise<unknown> {
    return this.repository.findByUserId(userId);
  }

  async getSubjects(userId: string): Promise<Enrollment[]> {
    const student = await this.repository.findByUserId(userId);
    return this.repository.getEnrollments(student!.id);
  }

  async getSchedule(userId: string): Promise<unknown[]> {
    const student = await this.repository.findByUserId(userId);
    return this.repository.getSchedule(student!.id);
  }

  async getAssignments(userId: string): Promise<unknown[]> {
    const student = await this.repository.findByUserId(userId);
    const { prisma } = await import('../../../../core/database/prisma.js');
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student!.id, isActive: true },
      select: { subjectId: true },
    });
    return prisma.assignment.findMany({
      where: { subjectId: { in: enrollments.map(e => e.subjectId) } },
      include: { subject: true, grades: { where: { studentId: student!.id } } },
      orderBy: { dueDate: 'desc' },
    });
  }

  async getExams(userId: string): Promise<unknown[]> {
    const student = await this.repository.findByUserId(userId);
    const { prisma } = await import('../../../../core/database/prisma.js');
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student!.id, isActive: true },
      select: { subjectId: true },
    });
    return prisma.exam.findMany({
      where: { subjectId: { in: enrollments.map(e => e.subjectId) }, isPublished: true },
      include: { subject: true, grades: { where: { studentId: student!.id } } },
      orderBy: { date: 'desc' },
    });
  }

  async getExamQuestions(examId: string): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.question.findMany({
      where: { examId },
      select: { id: true, text: true, type: true, options: true },
      orderBy: { order: 'asc' },
    });
  }

  async submitExamAnswers(studentId: string, _examId: string, answers: Array<{ questionId: string; content: string }>): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    const submitted = await prisma.answer.createMany({
      data: answers.map(a => ({ studentId, questionId: a.questionId, content: a.content })),
    });
    return Array(submitted.count).fill({});
  }

  async getGrades(userId: string, subjectId?: string): Promise<unknown[]> {
    const student = await this.repository.findByUserId(userId);
    return this.repository.getGrades(student!.id);
  }

  async getAttendance(userId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    const student = await this.repository.findByUserId(userId);
    return this.repository.getAttendance(student!.id, startDate, endDate);
  }

  async getBilling(userId: string): Promise<unknown> {
    const student = await this.repository.findByUserId(userId);
    return this.repository.getBillingSummary(student!.id);
  }

  async getInvoices(userId: string): Promise<unknown[]> {
    const student = await this.repository.findByUserId(userId);
    return this.repository.getInvoices(student!.id);
  }

  async getBulletins(): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.bulletin.findMany({
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async getNotifications(userId: string): Promise<unknown[]> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const { prisma } = await import('../../../../core/database/prisma.js');
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async getRanking(userId: string): Promise<unknown> {
    const student = await this.repository.findByUserId(userId);
    const { prisma } = await import('../../../../core/database/prisma.js');
    const grades = await prisma.grade.findMany({
      where: { student: { classId: student!.classId } },
      include: { student: { include: { user: true } }, subject: true },
    });
    const studentScores: Record<string, { total: number; count: number; name: string }> = {};
    grades.forEach(g => {
      if (!studentScores[g.studentId]) {
        studentScores[g.studentId] = { total: 0, count: 0, name: g.student.user.name };
      }
      studentScores[g.studentId].total += g.value;
      studentScores[g.studentId].count++;
    });
    const ranking = Object.entries(studentScores)
      .map(([id, data]) => ({ studentId: id, name: data.name, average: data.total / data.count }))
      .sort((a, b) => (b as { average: number }).average - (a as { average: number }).average);
    const myRank = ranking.findIndex(r => r.studentId === student!.id) + 1;
    return { ranking, myRank };
  }
}