import { Router, Request, Response } from 'express';
import { TeacherService } from '../services/teacher.service.js';
import { teacherRepository } from '../repositories/teacher.repository.js';
import { successResponse, errorResponse } from '../../../../core/utils/response.js';

const teacherService = new TeacherService(teacherRepository);
const router = Router();

router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { userId: string } }).user?.userId;
    const subjects = await teacherService.getSubjects(userId);
    successResponse(res, subjects);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/classes', async (req: Request, res: Response) => {
  try {
    const levels = await teacherService.getClassLevels();
    successResponse(res, levels);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/assignments', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    const assignments = await teacherService.getAssignments(subjectId as string);
    successResponse(res, assignments);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const assignment = await teacherService.createAssignment(req.body);
    successResponse(res, assignment, 'Assignment created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/exams', async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    const exams = await teacherService.getExams(subjectId as string);
    successResponse(res, exams);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/exams', async (req: Request, res: Response) => {
  try {
    const exam = await teacherService.createExam(req.body);
    successResponse(res, exam, 'Exam created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/grades', async (req: Request, res: Response) => {
  try {
    const grade = await teacherService.createGrade(req.body);
    successResponse(res, grade, 'Grade created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const attendance = await teacherService.markAttendance(req.body);
    successResponse(res, attendance, 'Attendance marked');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/attendance/bulk', async (req: Request, res: Response) => {
  try {
    const { classId, date, status } = req.body;
    await teacherService.bulkAttendance(classId, new Date(date), status);
    successResponse(res, { success: true }, 'Bulk attendance marked');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/students', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;
    const students = await teacherService.getStudents(classId as string);
    successResponse(res, students);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;