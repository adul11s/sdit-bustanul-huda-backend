import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

/**
 * Middleware: ensure a teacher can only access their own homeroom class students.
 */
export async function requireHomeroomOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).user?.userId;
  const studentId = req.params.studentId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId },
    include: { homeroomClass: { select: { id: true } } },
  });

  if (!teacher?.homeroomClass) {
    return res.status(403).json({ success: false, error: 'Not a homeroom teacher' });
  }

  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student || student.classId !== teacher.homeroomClass.id) {
      return res.status(403).json({ success: false, error: 'Student is not in your class' });
    }
  }

  next();
}

/**
 * Middleware: ensure a teacher can only access their own subjects/classes.
 */
export async function requireTeacherSubjectOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).user?.userId;
  const subjectId = (req.query.subjectId as string) || req.body.subjectId;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (subjectId) {
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    const subject = await prisma.subject.findUnique({ where: { id: subjectId }, select: { teacherId: true } });

    if (!teacher || !subject || subject.teacherId !== teacher.id) {
      return res.status(403).json({ success: false, error: 'You do not teach this subject' });
    }
  }

  next();
}
