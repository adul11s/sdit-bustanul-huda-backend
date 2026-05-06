import { Router, Request, Response } from 'express';
import { AcademicService } from '../services/academic.service.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { successResponse, errorResponse } from '../../../core/utils/response.js';

const academicService = new AcademicService(academicRepository);
const router = Router();

router.get('/class-levels', async (req: Request, res: Response) => {
  try {
    const levels = await academicService.getClassLevels();
    successResponse(res, levels);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/classes', async (req: Request, res: Response) => {
  try {
    const classes = await academicService.getClasses();
    successResponse(res, classes);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/subjects', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;
    const subjects = await academicService.getSubjects(teacherId as string);
    successResponse(res, subjects);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/academic-years', async (req: Request, res: Response) => {
  try {
    const years = await academicService.getAcademicYears();
    successResponse(res, years);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/academic-years/set-current/:id', async (req: Request, res: Response) => {
  try {
    const year = await academicService.setCurrentAcademicYear(req.params.id);
    successResponse(res, year, 'Academic year set as current');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/classes', async (req: Request, res: Response) => {
  try {
    const classData = await academicService.createClass(req.body);
    successResponse(res, classData, 'Class created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/subjects', async (req: Request, res: Response) => {
  try {
    const subject = await academicService.createSubject(req.body);
    successResponse(res, subject, 'Subject created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.get('/schedules', async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;
    const schedules = await academicService.getSchedules(classId as string);
    successResponse(res, schedules);
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/schedules', async (req: Request, res: Response) => {
  try {
    const schedule = await academicService.createSchedule(req.body);
    successResponse(res, schedule, 'Schedule created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/academic-years', async (req: Request, res: Response) => {
  try {
    const year = await academicService.createAcademicYear(req.body);
    successResponse(res, year, 'Academic year created');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

router.post('/enrollments', async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId } = req.body;
    const enrollment = await academicService.enrollStudent(studentId, subjectId);
    successResponse(res, enrollment, 'Student enrolled');
  } catch (error) {
    errorResponse(res, 500, 'Internal server error');
  }
});

export default router;