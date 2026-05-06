import { Router, Request, Response } from 'express';
import multer from 'multer';
import { examController } from './controllers/exam.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { generateQuestionTemplate } from '../../utils/csv-parser.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Student routes - specific paths first
router.get('/student/exams', authMiddleware, examController.getAvailableExams);
router.post('/student/exams/:examId/start', authMiddleware, examController.startExam);
router.get('/student/exams/:examId/submission', authMiddleware, examController.getStudentSubmission);
router.post('/student/submissions/:submissionId/answer', authMiddleware, examController.submitAnswer);
router.post('/student/submissions/:submissionId/submit', authMiddleware, examController.submitExam);

// Teacher exam management
router.post('/exams', authMiddleware, examController.createExam);
router.get('/exams', authMiddleware, examController.getExams);
router.get('/exams/:id', authMiddleware, examController.getExamById);
router.put('/exams/:id', authMiddleware, examController.updateExam);
router.patch('/exams/:id/publish', authMiddleware, examController.publishExam);
router.delete('/exams/:id', authMiddleware, examController.deleteExam);

// Questions
router.post('/questions', authMiddleware, examController.createQuestion);
router.put('/questions/:id', authMiddleware, examController.updateQuestion);
router.delete('/questions/:id', authMiddleware, examController.deleteQuestion);
router.post('/exams/:examId/questions/file', authMiddleware, upload.single('file'), examController.createQuestionsFromFile);
router.post('/exams/preview-questions', authMiddleware, upload.single('file'), examController.previewQuestionsFromFile);

// Submissions
router.get('/exams/:examId/submissions', authMiddleware, examController.getExamSubmissions);

// Grading
router.get('/essays/pending', authMiddleware, examController.getPendingEssays);
router.post('/answers/grade', authMiddleware, examController.gradeEssayAnswer);

// Download CSV template for question upload
router.get('/questions/template', (req: Request, res: Response) => {
  const template = generateQuestionTemplate();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="question_template.csv"');
  res.send(template);
});

export default router;