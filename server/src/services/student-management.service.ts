import prisma from '../utils/prisma.js';

export interface TransferStudentDto {
  studentId: string;
  toClassId: string;
  reason?: string;
}

export interface ClassHistoryEntry {
  id: string;
  studentId: string;
  fromClassId: string | null;
  fromClassName: string | null;
  toClassId: string;
  toClassName: string;
  transferredAt: Date;
  reason: string | null;
}

export class StudentManagementService {
  /**
   * Transfer a student to another class (same grade level)
   */
  async transferStudent(data: TransferStudentDto): Promise<{
    student: any;
    history: any;
  }> {
    const { studentId, toClassId, reason } = data;

    // Get current student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { include: { level: true } } },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get target class info
    const targetClass = await prisma.class.findUnique({
      where: { id: toClassId },
      include: { level: true },
    });

    if (!targetClass) {
      throw new Error('Target class not found');
    }

    // Verify same grade level
    if (student.class && student.class.levelId !== targetClass.levelId) {
      throw new Error(
        `Cannot transfer between different grade levels. ` +
        `Student is in ${student.class.level.name}, target is ${targetClass.level.name}. ` +
        `Use promotion instead.`
      );
    }

    // Prevent transferring to same class
    if (student.classId === toClassId) {
      throw new Error('Student is already in this class');
    }

    // Perform transfer
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { classId: toClassId },
      include: { class: { include: { level: true } }, user: { select: { id: true, name: true, gender: true } } },
    });

    // Record transfer history
    const history = await prisma.classTransferHistory.create({
      data: {
        studentId,
        fromClassId: student.classId,
        toClassId,
        reason: reason || 'Class transfer',
      },
    });

    return { student: updatedStudent, history };
  }

  /**
   * Get class transfer history for a student
   */
  async getTransferHistory(studentId: string): Promise<ClassHistoryEntry[]> {
    const history = await prisma.classTransferHistory.findMany({
      where: { studentId },
      include: {
        fromClass: { include: { level: true } },
        toClass: { include: { level: true } },
      },
      orderBy: { transferredAt: 'desc' },
    });

    return history.map((h) => ({
      id: h.id,
      studentId: h.studentId,
      fromClassId: h.fromClassId,
      fromClassName: h.fromClass ? `${h.fromClass.level.name} - ${h.fromClass.name}` : null,
      toClassId: h.toClassId,
      toClassName: `${h.toClass.level.name} - ${h.toClass.name}`,
      transferredAt: h.transferredAt,
      reason: h.reason,
    }));
  }

  /**
   * Assign a student to a class (initial assignment)
   */
  async assignStudentToClass(studentId: string, classId: string): Promise<any> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.classId) {
      throw new Error('Student is already assigned to a class. Use transfer instead.');
    }

    return prisma.student.update({
      where: { id: studentId },
      data: { classId },
      include: { class: { include: { level: true } }, user: { select: { id: true, name: true, gender: true } } },
    });
  }

  /**
   * Get all students in a class with their details
   */
  async getClassStudents(classId: string): Promise<any[]> {
    return prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true, email: true, gender: true } },
        class: { include: { level: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  /**
   * Get students without a class assignment
   */
  async getUnassignedStudents(): Promise<any[]> {
    return prisma.student.findMany({
      where: { classId: null },
      include: {
        user: { select: { id: true, name: true, email: true, gender: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }
}

export const studentManagementService = new StudentManagementService();
export default studentManagementService;
