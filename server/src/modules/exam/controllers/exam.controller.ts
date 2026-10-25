import { Request, Response } from 'express';
import { examService } from '../services/exam.service.js';
import { 
  createExamSchema, 
  updateExamSchema, 
  createQuestionSchema,
  updateQuestionSchema,
  createQuestionsBatchSchema,
  gradeAnswerSchema,
  submitAnswerSchema,
  startExamSchema,
  submitExamSchema
} from '../dtos/exam.dto.js';
import { successResponse, errorResponse } from '../../../core/utils/response.js';
import type { TokenPayload } from '../../../utils/auth.js';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  file?: Express.Multer.File;
}

export class ExamController {
  async createExam(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const validated = createExamSchema.parse(req.body);
      const exam = await examService.createExam(validated, teacherId);
      return successResponse(res, exam, 'Exam created successfully');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse(res, 400, 'Validation Error', error.issues[0].message);
      }
      return errorResponse(res, 500, 'Internal Server Error', error.message || 'Failed to create exam');
    }
  }

  async getExamById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const exam = await examService.getExamById(id);
      
      if (!exam) {
        return errorResponse(res, 404, 'Exam not found');
      }
      return successResponse(res, exam);
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async getExams(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const filters = {
        subjectId: req.query.subjectId as string,
        type: req.query.type as 'MCQ' | 'ESSAY',
        isPublished: req.query.isPublished === 'true' ? true : req.query.isPublished === 'false' ? false : undefined,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const exams = await examService.getExams(filters, teacherId);
      return successResponse(res, exams);
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async updateExam(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const { id } = req.params;
      const validated = updateExamSchema.parse(req.body);
      const exam = await examService.updateExam(id, validated, teacherId);
      return successResponse(res, exam);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse(res, 400, error.issues[0].message);
      }
      return errorResponse(res, 500, error.message);
    }
  }

  async publishExam(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const { id } = req.params;
      const exam = await examService.publishExam(id, teacherId);
      return successResponse(res, exam);
    } catch (error: any) {
      return errorResponse(res, 400, error.message);
    }
  }

  async deleteExam(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const { id } = req.params;
      await examService.deleteExam(id, teacherId);
      return successResponse(res, { message: 'Exam deleted successfully' });
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async createQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = createQuestionSchema.parse(req.body);
      const question = await examService.createQuestion(validated);
      return successResponse(res, question, 'Question created successfully');
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse(res, 400, error.issues[0].message);
      }
      return errorResponse(res, 500, error.message);
    }
  }

  async updateQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validated = updateQuestionSchema.parse(req.body);
      const question = await examService.updateQuestion(id, validated);
      return successResponse(res, question);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse(res, 400, error.issues[0].message);
      }
      return errorResponse(res, 500, error.message);
    }
  }

  async deleteQuestion(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await examService.deleteQuestion(id);
      return successResponse(res, { message: 'Question deleted successfully' });
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async createQuestionsFromFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { examId } = req.body;
      const file = req.file;

      if (!file) {
        return errorResponse(res, 400, 'File is required');
      }

      const fileContent = file.buffer.toString('utf-8');
      const questions = await examService.createQuestionsFromFile(examId, fileContent, file.originalname);
      return successResponse(res, { 
        message: `${questions.length} questions created successfully`,
        count: questions.length 
      });
    } catch (error: any) {
      return errorResponse(res, 400, error.message);
    }
  }

  async previewQuestionsFromFile(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return errorResponse(res, 400, 'File is required');
      }

      const fileContent = file.buffer.toString('utf-8');
      const parsed = examService.previewQuestionsFromFile(fileContent, file.originalname);
      return successResponse(res, parsed);
    } catch (error: any) {
      return errorResponse(res, 400, error.message);
    }
  }

  async getExamSubmissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { examId } = req.params;
      const filters = {
        status: req.query.status as 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED',
        studentId: req.query.studentId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const submissions = await examService.getExamSubmissions(examId, filters);
      return successResponse(res, submissions);
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async gradeEssayAnswer(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const validated = gradeAnswerSchema.parse(req.body);
      const answer = await examService.gradeEssayAnswer(validated, teacherId);
      
      const { percentage } = await examService.calculateFinalScore(answer.submissionId);
      
      return successResponse(res, { answer, finalPercentage: percentage });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse(res, 400, error.issues[0].message);
      }
      return errorResponse(res, 500, error.message);
    }
  }

  async getPendingEssays(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.userId;
      if (!teacherId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const filters = {
        examId: req.query.examId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const essays = await examService.getPendingEssays(teacherId, filters);
      return successResponse(res, essays);
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async startExam(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const { examId } = req.params;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('User-Agent');

      let submission = await examService.startExam(examId, userId, ipAddress, userAgent);
      
      // If status is DRAFT, update to IN_PROGRESS to start the exam
      if (submission.status === 'DRAFT') {
        submission = await examService.startProgress(submission.id);
      }
      
      return successResponse(res, submission);
    } catch (error: any) {
      return errorResponse(res, 400, error.message);
    }
  }

  async submitAnswer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const validated = submitAnswerSchema.parse(req.body);
      const answer = await examService.submitAnswerByQuestion(
        validated.submissionId,
        validated.questionId,
        userId,
        validated.answer
      );
      return successResponse(res, answer);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return errorResponse(res, 400, error.issues[0].message);
      }
      return errorResponse(res, 500, error.message);
    }
  }

  async submitExam(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const { submissionId } = req.params;
      const submission = await examService.submitExam(submissionId, userId);
      return successResponse(res, submission);
    } catch (error: any) {
      return errorResponse(res, 400, error.message);
    }
  }

  async getAvailableExams(req: AuthenticatedRequest, res: Response) {
    try {
      const studentId = req.user?.userId;
      if (!studentId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const exams = await examService.getAvailableExamsForStudent(studentId, page, limit);
      return successResponse(res, exams);
    } catch (error: any) {
      return errorResponse(res, 500, error.message);
    }
  }

  async getStudentSubmission(req: AuthenticatedRequest, res: Response) {
    try {
      const studentId = req.user?.userId;
      if (!studentId) {
        return errorResponse(res, 401, 'Unauthorized');
      }

      const { examId } = req.params;
      const submission = await examService.getStudentSubmission(examId, studentId);
      
      if (!submission) {
        return errorResponse(res, 404, 'No submission found');
      }
      
      return successResponse(res, submission);
    } catch (error: any) {
      if (error.message === 'User is not a student' || error.message === 'User not found') {
        return errorResponse(res, 403, error.message);
      }
      return errorResponse(res, 500, error.message);
    }
  }
}

export const examController = new ExamController();