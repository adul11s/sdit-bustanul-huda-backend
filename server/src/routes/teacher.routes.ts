import { Router, Request, Response } from 'express';
import { academicService } from '../services/academic.service.js';
import { roleMiddleware } from '../middleware/auth.js';
import { requireHomeroomOwnership } from '../middleware/ownership.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.use(roleMiddleware(['TEACHER', 'HOMEROOM_TEACHER']));

router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?.userId;
    const teacherProfile = await prisma.teacher.findFirst({ where: { userId: teacherId } });
    const subjects = await academicService.getSubjects(teacherProfile?.id);
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/classes', async (req: Request, res: Response) => {
  try {
    const levels = await academicService.getClassLevels();
    res.json({ success: true, data: levels });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/assignments', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    const assignments = await academicService.getAssignments(subjectId as string);
    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const assignment = await academicService.createAssignment(req.body);
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/exams', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    const exams = await academicService.getExams(subjectId as string);
    res.json({ success: true, data: exams });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/exams', async (req: Request, res: Response) => {
  try {
    const exam = await academicService.createExam(req.body);
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/exams/:id/questions', async (req: Request, res: Response) => {
  try {
    const questions = await prisma.question.findMany({ where: { examId: req.params.id }, orderBy: { order: 'asc' } });
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/exams/:id/questions', async (req: Request, res: Response) => {
  try {
    const question = await academicService.createQuestion(req.params.id, req.body);
    res.json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/grades', async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId } = req.query;
    const grades = await academicService.getGrades(studentId as string, subjectId as string);
    res.json({ success: true, data: grades });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/grades', async (req: Request, res: Response) => {
  try {
    const grade = await academicService.createGrade(req.body);
    res.json({ success: true, data: grade });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Validate that a teacher has a schedule for a class on a given date
 */
async function validateTeacherSchedule(userId: string, classId: string, date: Date): Promise<{ valid: boolean; schedule?: any; error?: string }> {
  const teacher = await prisma.teacher.findFirst({ where: { userId } });
  if (!teacher) return { valid: false, error: 'Teacher not found' };

  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday (0) to 7

  const schedule = await prisma.schedule.findFirst({
    where: {
      classId,
      subject: { teacherId: teacher.id },
      dayOfWeek,
    },
    include: { subject: true },
  });

  if (!schedule) {
    return { valid: false, error: 'You do not have a scheduled class for this class on this day' };
  }

  return { valid: true, schedule };
}

router.get('/attendance/validate/:classId/:date', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const date = new Date(req.params.date);
    const result = await validateTeacherSchedule(userId, req.params.classId, date);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { studentId, date, status } = req.body;
    const targetDate = new Date(date);

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true } });
    if (!student?.classId) {
      return res.status(400).json({ success: false, error: 'Student not assigned to a class' });
    }

    const validation = await validateTeacherSchedule(userId, student.classId, targetDate);
    if (!validation.valid) {
      return res.status(403).json({ success: false, error: validation.error });
    }

    const attendance = await academicService.markAttendance(req.body);
    res.json({ success: true, data: attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.post('/attendance/bulk', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { classId, date } = req.body;
    const targetDate = new Date(date);

    const validation = await validateTeacherSchedule(userId, classId, targetDate);
    if (!validation.valid) {
      return res.status(403).json({ success: false, error: validation.error });
    }

    const attendance = await academicService.bulkAttendance(classId, targetDate, req.body.status);
    res.json({ success: true, data: attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

router.get('/students', async (req: Request, res: Response) => {
  try {
    const { classId, subjectId } = req.query;
    const where: any = {};
    if (classId) where.classId = classId;
    if (subjectId) where.enrollments = { some: { subjectId, isActive: true } };
    const students = await prisma.student.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, class: { include: { level: true } } },
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/class-students/:classId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

    // Verify teacher has a schedule for this class or is the homeroom teacher
    const classData = await prisma.class.findUnique({
      where: { id: req.params.classId },
      select: { homeroomTeacherId: true },
    });
    const hasSchedule = await prisma.schedule.findFirst({
      where: { classId: req.params.classId, subject: { teacherId: teacher.id } },
    });
    if (classData?.homeroomTeacherId !== teacher.id && !hasSchedule) {
      return res.status(403).json({ success: false, error: 'You do not have access to this class' });
    }

    const students = await prisma.student.findMany({
      where: { classId: req.params.classId },
      include: { user: { select: { name: true, email: true } }, grades: true, attendances: { where: { date: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) } } } },
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/ranking/:classId', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    const ranking = await academicService.getRanking(req.params.classId, subjectId as string);
    res.json({ success: true, data: ranking });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/statistics/:classId', async (req: Request, res: Response) => {
  try {
    const stats = await academicService.getClassStats(req.params.classId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Teacher Schedule
router.get('/schedule', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) return res.status(404).json({ success: false, error: 'Teacher not found' });

    const schedules = await prisma.schedule.findMany({
      where: { subject: { teacherId: teacher.id } },
      include: { subject: true, class: { include: { level: true } }, academicYear: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get attendance for a class on a specific date
router.get('/attendance/:classId/:date', async (req: Request, res: Response) => {
  try {
    const { classId, date } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true } },
        attendances: {
          where: {
            date: { gte: targetDate, lt: nextDay },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Homeroom Teacher - get their class data
router.get('/homeroom/class', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const teacher = await prisma.teacher.findFirst({
      where: { userId },
      include: {
        homeroomClass: {
          include: {
            level: true,
            students: {
              include: {
                user: { select: { id: true, name: true, gender: true } },
              },
            },
          },
        },
      },
    });
    if (!teacher?.homeroomClass) return res.status(404).json({ success: false, error: 'No homeroom class assigned' });
    res.json({ success: true, data: teacher.homeroomClass });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Homeroom Teacher - get student detail
router.get('/homeroom/student/:studentId', requireHomeroomOwnership, async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.studentId },
      include: {
        user: { select: { id: true, name: true, gender: true, avatar: true } },
        class: {
          include: {
            level: true,
            homeroomTeacher: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
        grades: { include: { subject: true, assignment: true, exam: true } },
        attendances: { orderBy: { date: 'desc' }, take: 30 },
        invoices: true,
        submissions: { include: { exam: { include: { subject: true } }, answers: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get students for a specific class (for grading)
router.get('/class-students-grades/:classId/:subjectId', async (req: Request, res: Response) => {
  try {
    const { classId, subjectId } = req.params;
    const students = await prisma.student.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, name: true } },
        grades: {
          where: { subjectId },
          include: { assignment: true, exam: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get grading tasks (assignments + exams) for a class + subject
router.get('/grading-tasks', async (req: Request, res: Response) => {
  try {
    const { classId, subjectId } = req.query;
    if (!classId || !subjectId) {
      return res.status(400).json({ success: false, error: 'classId and subjectId are required' });
    }

    const [assignments, exams] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          subjectId: subjectId as string,
          OR: [
            { targetType: 'CLASS', classId: classId as string },
            { targetType: 'STUDENT' },
          ],
        },
        select: { id: true, title: true, dueDate: true, points: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exam.findMany({
        where: {
          subjectId: subjectId as string,
          isPublished: true,
          OR: [
            { targetType: 'CLASS', classId: classId as string },
            { targetType: 'STUDENT' },
          ],
        },
        select: { id: true, title: true, timeLimit: true, totalScore: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        assignments: assignments.map((a) => ({ ...a, type: 'ASSIGNMENT' })),
        exams: exams.map((e) => ({ ...e, type: 'EXAM' })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Get students + submissions for a specific grading task
router.get('/grading-detail', async (req: Request, res: Response) => {
  try {
    const { taskId, taskType, classId } = req.query;
    if (!taskId || !taskType || !classId) {
      return res.status(400).json({ success: false, error: 'taskId, taskType, and classId are required' });
    }

    const isAssignment = taskType === 'ASSIGNMENT';

    // Get task details to check target type
    const task = isAssignment
      ? await prisma.assignment.findUnique({
          where: { id: taskId as string },
          include: { studentTargets: { select: { studentId: true } }, subject: { select: { name: true } } },
        })
      : await prisma.exam.findUnique({
          where: { id: taskId as string },
          include: { studentTargets: { select: { studentId: true } }, subject: { select: { name: true } }, questions: { where: { isActive: true }, orderBy: { order: 'asc' } } },
        });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Build student filter
    const studentWhere: any = { classId: classId as string };
    if (task.targetType === 'STUDENT') {
      const targetedIds = task.studentTargets.map((t: any) => t.studentId);
      studentWhere.id = { in: targetedIds };
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        user: { select: { id: true, name: true } },
        grades: {
          where: isAssignment
            ? { assignmentId: taskId as string }
            : { examId: taskId as string },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    // Enrich with submission data
    let enriched;
    if (isAssignment) {
      const submissions = await prisma.assignmentSubmission.findMany({
        where: { assignmentId: taskId as string, studentId: { in: students.map((s: any) => s.id) } },
      });
      const subMap = new Map(submissions.map((s: any) => [s.studentId, s]));
      enriched = students.map((s: any) => ({
        ...s,
        submission: subMap.get(s.id) || null,
      }));
    } else {
      const submissions = await prisma.submission.findMany({
        where: { examId: taskId as string, studentId: { in: students.map((s: any) => s.id) } },
        include: { answers: { include: { question: true } } },
      });
      const subMap = new Map(submissions.map((s: any) => [s.studentId, s]));
      enriched = students.map((s: any) => ({
        ...s,
        submission: subMap.get(s.id) || null,
      }));
    }

    // Strip Prisma internal fields from task before sending
    const taskData = isAssignment
      ? { type: 'ASSIGNMENT', title: (task as any).title, content: (task as any).content, points: (task as any).points, dueDate: (task as any).dueDate }
      : { type: 'EXAM', title: (task as any).title, description: (task as any).description, totalScore: (task as any).totalScore, timeLimit: (task as any).timeLimit, questions: (task as any).questions };

    res.json({ success: true, data: enriched, task: taskData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Create grade with task validation
router.post('/grades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { studentId, subjectId, value, assignmentId, examId, comment } = req.body;

    // Validate teacher teaches this subject
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.teacherId !== teacher.id) {
      return res.status(403).json({ success: false, error: 'You do not teach this subject' });
    }

    // Validate task belongs to subject
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
      if (!assignment || assignment.subjectId !== subjectId) {
        return res.status(400).json({ success: false, error: 'Assignment does not belong to this subject' });
      }
    }
    if (examId) {
      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam || exam.subjectId !== subjectId) {
        return res.status(400).json({ success: false, error: 'Exam does not belong to this subject' });
      }
    }

    const grade = await prisma.grade.create({
      data: {
        studentId,
        subjectId,
        value: Number(value),
        assignmentId: assignmentId || null,
        examId: examId || null,
        comment: comment || null,
      },
    });

    // Update assignment submission if grading an assignment
    if (assignmentId) {
      await prisma.assignmentSubmission.updateMany({
        where: { assignmentId, studentId },
        data: {
          score: Number(value),
          feedback: comment,
          status: 'GRADED',
          gradedAt: new Date(),
          gradedById: teacher.id,
        },
      });
    }

    res.json({ success: true, data: grade });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Get assignment submissions for grading
router.get('/assignment-submissions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { assignmentId } = req.query;
    
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

    const where: any = {};
    if (assignmentId) {
      const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId as string } });
      if (!assignment || assignment.subject.teacherId !== teacher.id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      where.assignmentId = assignmentId;
    } else {
      const subjects = await prisma.subject.findMany({ where: { teacherId: teacher.id }, select: { id: true } });
      const assignments = await prisma.assignment.findMany({
        where: { subjectId: { in: subjects.map(s => s.id) } },
        select: { id: true },
      });
      where.assignmentId = { in: assignments.map(a => a.id) };
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where,
      include: {
        student: {
          select: { id: true, user: { select: { name: true } }, class: { select: { name: true } } },
        },
        assignment: {
          select: { id: true, title: true, points: true, dueDate: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;