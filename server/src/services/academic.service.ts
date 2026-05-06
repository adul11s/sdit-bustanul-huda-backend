import prisma from '../utils/prisma.js';
import type { CreateClassDto, CreateSubjectDto, CreateAssignmentDto, CreateExamDto, CreateQuestionDto, CreateGradeDto, CreateAttendanceDto, CreateBulletinDto, UpdateBulletinDto, CreateScheduleDto, PromotionDto } from '../types/index.js';
import { calendarService } from './calendar.service.js';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export class AcademicService {
  // Class Levels
  async getClassLevels() {
    return prisma.classLevel.findMany({
      orderBy: { name: 'asc' },
      include: {
        classes: {
          include: {
            homeroomTeacher: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
            _count: { select: { students: true } },
          },
        },
      },
    });
  }

  async createClassLevel(name: string) {
    return prisma.classLevel.create({ data: { name } });
  }

  async createClass(data: CreateClassDto) {
    return prisma.class.create({ data });
  }

  async assignHomeroomTeacher(classId: string, teacherId: string) {
    // Find the class being assigned
    const targetClass = await prisma.class.findUnique({ where: { id: classId }, include: { homeroomTeacher: { include: { user: true } } } });

    // Revert previous homeroom teacher's role if they have no other homeroom classes
    if (targetClass?.homeroomTeacherId && targetClass.homeroomTeacherId !== teacherId) {
      const otherClasses = await prisma.class.count({ where: { homeroomTeacherId: targetClass.homeroomTeacherId, id: { not: classId } } });
      if (otherClasses === 0) {
        await prisma.user.update({
          where: { id: targetClass.homeroomTeacher.userId },
          data: { role: 'TEACHER' },
        });
      }
    }

    // Clear previous homeroom assignment for the new teacher (if any)
    await prisma.class.updateMany({
      where: { homeroomTeacherId: teacherId },
      data: { homeroomTeacherId: null },
    });

    // Update new teacher's user role to HOMEROOM_TEACHER
    const newTeacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });
    if (newTeacher && newTeacher.user.role === 'TEACHER') {
      await prisma.user.update({
        where: { id: newTeacher.userId },
        data: { role: 'HOMEROOM_TEACHER' },
      });
    }

    return prisma.class.update({ where: { id: classId }, data: { homeroomTeacherId: teacherId } });
  }

  // Subjects
  async getSubjects(teacherId?: string) {
    const where = teacherId ? { teacherId } : {};
    return prisma.subject.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: { select: { enrollments: true, assignments: true, exams: true } },
      },
    });
  }

  async createSubject(data: CreateSubjectDto) {
    return prisma.subject.create({ data });
  }

  async deleteSubject(id: string) {
    return prisma.subject.delete({ where: { id } });
  }

  // Enrollments
  async enrollStudent(studentId: string, subjectId: string) {
    return prisma.enrollment.create({ data: { studentId, subjectId } });
  }

  async unenrollStudent(studentId: string, subjectId: string) {
    return prisma.enrollment.update({ where: { studentId_subjectId: { studentId, subjectId } }, data: { isActive: false } });
  }

  async getEnrollments(studentId: string) {
    return prisma.enrollment.findMany({
      where: { studentId, isActive: true },
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
    });
  }

  // Assignments
  async getAssignments(subjectId: string, studentId?: string) {
    const where: any = { subjectId };
    if (studentId) {
      where.OR = [
        { targetType: 'CLASS', classId: (await prisma.student.findUnique({ where: { id: studentId } }))?.classId },
        { targetType: 'STUDENT', studentTargets: { some: { studentId } } },
      ];
    }
    return prisma.assignment.findMany({
      where,
      orderBy: { dueDate: 'desc' },
      include: { subject: true, grades: true, studentTargets: true },
    });
  }

  async createAssignment(data: CreateAssignmentDto) {
    const { studentIds, ...rest } = data;
    const assignment = await prisma.assignment.create({
      data: {
        ...rest,
        dueDate: new Date(data.dueDate),
      },
    });

    // If targeting specific students, create junction records
    if (data.targetType === 'STUDENT' && studentIds && studentIds.length > 0) {
      await prisma.assignmentStudentTarget.createMany({
        data: studentIds.map((sid) => ({ assignmentId: assignment.id, studentId: sid })),
        skipDuplicates: true,
      });
    }

    return assignment;
  }

  async submitAssignment(studentId: string, assignmentId: string, content: string) {
    return prisma.grade.create({
      data: { studentId, subjectId: (await prisma.assignment.findUnique({ where: { id: assignmentId } }))!.subjectId, assignmentId, value: 0, comment: content },
    });
  }

  // Exams
  async getExams(subjectId?: string, studentId?: string) {
    const where: any = subjectId ? { subjectId } : {};
    if (studentId) {
      where.OR = [
        { targetType: 'CLASS', classId: (await prisma.student.findUnique({ where: { id: studentId } }))?.classId },
        { targetType: 'STUDENT', studentTargets: { some: { studentId } } },
      ];
    }
    return prisma.exam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { subject: { include: { teacher: true } }, questions: { orderBy: { order: 'asc' } }, grades: true },
    });
  }

  async createExam(data: CreateExamDto) {
    const { date, duration, studentIds, ...rest } = data;
    const exam = await prisma.exam.create({
      data: {
        ...rest,
        dueDate: date ? new Date(date) : undefined,
        timeLimit: duration || 60,
      },
    });

    if (rest.targetType === 'STUDENT' && studentIds && studentIds.length > 0) {
      await prisma.examStudentTarget.createMany({
        data: studentIds.map((sid) => ({ examId: exam.id, studentId: sid })),
        skipDuplicates: true,
      });
    }

    return exam;
  }

  async createQuestion(examId: string, data: CreateQuestionDto) {
    const { answer, ...rest } = data;
    return prisma.question.create({
      data: {
        ...rest,
        correctAnswer: answer,
        examId,
      },
    });
  }

  async submitAnswer(studentId: string, questionId: string, answerText: string, submissionId: string) {
    return prisma.studentAnswer.create({
      data: { studentId, questionId, answer: answerText, submissionId },
    });
  }

  // Grades
  async getGrades(studentId: string, subjectId?: string) {
    const where: any = { studentId };
    if (subjectId) where.subjectId = subjectId;
    return prisma.grade.findMany({
      where,
      include: { subject: true, assignment: true, exam: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStudentGrades(studentId: string, subjectId: string) {
    return prisma.grade.findMany({
      where: { studentId, subjectId },
      include: { assignment: true, exam: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createGrade(data: CreateGradeDto) {
    const grade = await prisma.grade.create({ data });
    await prisma.notification.create({
      data: { userId: data.studentId, type: 'GRADE', title: 'New Grade', message: `You received a grade of ${data.value} ` },
    });
    return grade;
  }

  // Attendance
  async getAttendance(studentId: string, startDate?: Date, endDate?: Date) {
    const where: any = { studentId };
    if (startDate) where.date = { ...where.date, gte: startDate };
    if (endDate) where.date = { ...where.date, lte: endDate };
    return prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
  }

  async markAttendance(data: CreateAttendanceDto) {
    // Check calendar for attendance-blocking events
    const isBlocked = await calendarService.isAttendanceBlocked(new Date(data.date));
    if (isBlocked) {
      throw new Error('Attendance cannot be marked on this date due to a calendar event (holiday or special event)');
    }
    return prisma.attendance.upsert({
      where: { studentId_date: { studentId: data.studentId, date: data.date } },
      create: data,
      update: data,
    });
  }

  async bulkAttendance(classId: string, date: Date, status: string) {
    // Check calendar for attendance-blocking events
    const isBlocked = await calendarService.isAttendanceBlocked(date);
    if (isBlocked) {
      throw new Error('Attendance cannot be marked on this date due to a calendar event (holiday or special event)');
    }
    const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
    const attendanceData = students.map(s => ({ studentId: s.id, date, status } as any));
    return prisma.attendance.createMany({ data: attendanceData, skipDuplicates: true });
  }

  // Bulletins
  async getBulletins(category?: string, status?: string, includeUnpublished = false) {
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (!includeUnpublished) where.isPublished = true;
    return prisma.bulletin.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } }, media: { orderBy: { order: 'asc' } } },
    });
  }

  async getBulletinById(id: string) {
    return prisma.bulletin.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true } }, media: { orderBy: { order: 'asc' } } },
    });
  }

  private sanitizeBulletinData(data: any) {
    const sanitized: any = { ...data };
    // Convert empty strings to null for DateTime fields
    if (sanitized.eventDate === '' || sanitized.eventDate === undefined) {
      sanitized.eventDate = null;
    } else if (sanitized.eventDate) {
      sanitized.eventDate = new Date(sanitized.eventDate);
    }
    // Remove media from bulletin data (handled separately)
    delete sanitized.media;
    return sanitized;
  }

  async createBulletin(authorId: string, data: CreateBulletinDto) {
    const { media, ...rest } = data;
    const bulletinData = this.sanitizeBulletinData(rest);
    const bulletin = await prisma.bulletin.create({
      data: { ...bulletinData, authorId },
    });

    if (media && media.length > 0) {
      await prisma.bulletinMedia.createMany({
        data: media.map((image, index) => ({
          bulletinId: bulletin.id,
          image,
          order: index,
        })),
      });
    }

    return this.getBulletinById(bulletin.id);
  }

  async updateBulletin(id: string, data: UpdateBulletinDto) {
    const { media, ...rest } = data;
    const bulletinData = this.sanitizeBulletinData(rest);
    const bulletin = await prisma.bulletin.update({
      where: { id },
      data: bulletinData,
    });

    if (media !== undefined) {
      // Delete existing media and recreate
      await prisma.bulletinMedia.deleteMany({ where: { bulletinId: id } });
      if (media.length > 0) {
        await prisma.bulletinMedia.createMany({
          data: media.map((image, index) => ({
            bulletinId: id,
            image,
            order: index,
          })),
        });
      }
    }

    return this.getBulletinById(bulletin.id);
  }

  async deleteBulletin(id: string) {
    return prisma.bulletin.delete({ where: { id } });
  }

  // Schedules
  async getSchedules(classId?: string, academicYearId?: string) {
    const where: any = {};
    if (classId) where.classId = classId;
    if (academicYearId) where.academicYearId = academicYearId;
    return prisma.schedule.findMany({
      where,
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
        class: { include: { level: true } },
        academicYear: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createSchedule(data: CreateScheduleDto) {
    // 1. Get the teacher for this subject
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
      select: { teacherId: true },
    });
    if (!subject) throw new Error('Subject not found');

    // 2. Check for schedule conflicts for the teacher
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        subject: { teacherId: subject.teacherId },
        dayOfWeek: data.dayOfWeek,
      },
      include: { subject: true, class: true },
    });

    const newStart = this.timeToMinutes(data.startTime);
    const newEnd = this.timeToMinutes(data.endTime);

    for (const existing of existingSchedules) {
      const existStart = this.timeToMinutes(existing.startTime);
      const existEnd = this.timeToMinutes(existing.endTime);

      // Overlap check: newStart < existEnd && newEnd > existStart
      if (newStart < existEnd && newEnd > existStart) {
        throw new Error(
          `Schedule conflict: Teacher is already assigned to class ${existing.class.name} ` +
          `(${existing.startTime} - ${existing.endTime}) on this day. ` +
          `Cannot assign to ${data.startTime} - ${data.endTime}.`
        );
      }
    }

    return prisma.schedule.create({ data });
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Promotion System
  async promoteStudents(data: PromotionDto[]) {
    const results = [];
    for (const p of data) {
      const student = await prisma.student.update({
        where: { id: p.studentId },
        data: { classId: p.toClassId },
      });
      const history = await prisma.promotionHistory.create({
        data: { studentId: p.studentId, toClassId: p.toClassId, yearId: p.academicYearId },
      });
      await prisma.notification.create({
        data: { userId: (await prisma.student.findUnique({ where: { id: p.studentId }, include: { user: true } }))!.userId, type: 'PROMOTION', title: 'Promoted', message: `You have been promoted to a new class` },
      });
      results.push({ student, history });
    }
    return results;
  }

  async getPromotions(studentId: string) {
    return prisma.promotionHistory.findMany({
      where: { studentId },
      include: { fromClass: true, toClass: true, year: true },
      orderBy: { promotedAt: 'desc' },
    });
  }

  // Academic Year
  async getAcademicYears() {
    return prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  async setCurrentAcademicYear(id: string) {
    await prisma.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return prisma.academicYear.update({ where: { id }, data: { isCurrent: true } });
  }

  async createAcademicYear(name: string, startDate: Date, endDate: Date) {
    return prisma.academicYear.create({ data: { name, startDate, endDate } });
  }

  // Statistics
  async getClassStats(classId: string) {
    const [totalStudents, avgGrade, attendanceRate] = await Promise.all([
      prisma.student.count({ where: { classId } }),
      prisma.grade.aggregate({
        where: { student: { classId } },
        _avg: { value: true },
      }),
      prisma.attendance.findMany({
        where: { student: { classId }, status: 'PRESENT' },
      }),
    ]);
    return { totalStudents, avgGrade: avgGrade._avg.value || 0, attendanceRate };
  }

  async getRanking(classId: string, subjectId?: string) {
    const where: any = { student: { classId } };
    if (subjectId) where.subjectId = subjectId;
    return prisma.grade.findMany({
      where,
      include: { student: { include: { user: { select: { name: true } } } }, subject: true },
    }).then(grades => {
      const studentScores: Record<string, { total: number; count: number; name: string }> = {};
      grades.forEach(g => {
        if (!studentScores[g.studentId]) studentScores[g.studentId] = { total: 0, count: 0, name: g.student.user.name };
        studentScores[g.studentId].total += g.value;
        studentScores[g.studentId].count++;
      });
      return Object.entries(studentScores)
        .map(([id, data]) => ({ studentId: id, name: data.name, average: (data as any).total / (data as any).count }))
        .sort((a, b) => (b as any).average - (a as any).average);
    });
  }

  // Generate Monthly Invoices
  async generateMonthlyInvoices(year: number, month: number, amount: number, dueDate: Date) {
    const students = await prisma.student.findMany({ where: { classId: { not: null } } });
    const invoices = [];
    for (const student of students) {
      const existing = await prisma.invoice.findFirst({
        where: { studentId: student.id, year, month, type: 'TUITION' },
      });
      if (!existing) {
        const invoice = await prisma.invoice.create({
          data: { studentId: student.id, title: `SPP ${MONTH_NAMES[month - 1]} ${year}`, amount, type: 'TUITION', month, year, dueDate },
        });
        invoices.push(invoice);
      }
    }
    return invoices;
  }
}

export const academicService = new AcademicService();