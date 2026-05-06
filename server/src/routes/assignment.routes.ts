import { Router, Request, Response } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import prisma from '../utils/prisma.js';

const router = Router();

router.use(roleMiddleware(['STUDENT']));

/**
 * GET /api/student/assignments
 * Get all assignments available to the student
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) {
      return res.status(403).json({ success: false, error: 'Student not found' });
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { targetType: 'CLASS', classId: student.classId },
          { studentTargets: { some: { studentId: student.id } } },
        ],
      },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        class: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { studentId: student.id },
    });

    const submissionMap = new Map(submissions.map(s => [s.assignmentId, s]));

    const enriched = assignments.map(a => {
      const submission = submissionMap.get(a.id);
      const due = new Date(a.dueDate);
      due.setHours(23, 59, 59, 999);
      return {
        ...a,
        submission: submission || null,
        isOverdue: !submission && due < new Date(),
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/student/assignments/:assignmentId
 * Get single assignment details with submission
 */
router.get('/:assignmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) {
      return res.status(403).json({ success: false, error: 'Student not found' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.assignmentId },
      include: {
        subject: {
          select: { id: true, name: true, code: true },
        },
        class: {
          select: { id: true, name: true },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    });

    res.json({ success: true, data: { ...assignment, submission } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/student/assignments/:assignmentId/start
 * Start working on an assignment (creates submission in progress)
 */
router.post('/:assignmentId/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) {
      return res.status(403).json({ success: false, error: 'Student not found' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.assignmentId },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    let submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    });

    if (!submission) {
      submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          status: 'IN_PROGRESS',
        },
      });
    } else if (submission.status === 'NOT_STARTED') {
      submission = await prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    res.json({ success: true, data: submission });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * PUT /api/student/assignments/:assignmentId
 * Save assignment content (auto-save while working)
 */
router.put('/:assignmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) {
      return res.status(403).json({ success: false, error: 'Student not found' });
    }

    const { content, fileUrl } = req.body;

    let submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: req.params.assignmentId, studentId: student.id } },
    });

    if (!submission) {
      submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId: req.params.assignmentId,
          studentId: student.id,
          content: content || '',
          fileUrl: fileUrl || null,
          status: 'IN_PROGRESS',
        },
      });
    } else {
      submission = await prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: {
          content: content ?? submission.content,
          fileUrl: fileUrl ?? submission.fileUrl,
          status: submission.status === 'NOT_STARTED' ? 'IN_PROGRESS' : submission.status,
        },
      });
    }

    res.json({ success: true, data: submission });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/student/assignments/:assignmentId/submit
 * Submit the assignment
 */
router.post('/:assignmentId/submit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const student = await prisma.student.findFirst({ where: { userId } });
    if (!student) {
      return res.status(403).json({ success: false, error: 'Student not found' });
    }

    const { content, fileUrl } = req.body;

    let submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId: req.params.assignmentId, studentId: student.id } },
    });

    if (!submission) {
      submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId: req.params.assignmentId,
          studentId: student.id,
          content: content || '',
          fileUrl: fileUrl || null,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    } else {
      if (submission.status === 'GRADED') {
        return res.status(400).json({ success: false, error: 'Assignment already graded' });
      }
      submission = await prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: {
          content: content ?? submission.content,
          fileUrl: fileUrl ?? submission.fileUrl,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    }

    res.json({ success: true, data: submission });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

export default router;