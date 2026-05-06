import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['MCQ', 'ESSAY']),
  subjectId: z.string().min(1, 'Subject is required'),
  dueDate: z.string().datetime().optional(),
  startTime: z.string().datetime().optional(),
  timeLimit: z.number().min(1).max(180).default(60),
  totalScore: z.number().min(1).default(100),
  allowRetry: z.boolean().default(false),
  maxAttempts: z.number().min(1).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
});

export const updateExamSchema = createExamSchema.partial().extend({
  isPublished: z.boolean().optional(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;

export const createQuestionSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  text: z.string().min(1, 'Question text is required'),
  type: z.enum(['MCQ', 'ESSAY']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  score: z.number().min(1).default(10),
  order: z.number().default(0),
  explanation: z.string().optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export const createQuestionsBatchSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  questions: z.array(createQuestionSchema.omit({ examId: true })).min(1, 'At least one question is required'),
});

export type CreateQuestionsBatchInput = z.infer<typeof createQuestionsBatchSchema>;

export const gradeAnswerSchema = z.object({
  answerId: z.string().min(1, 'Answer ID is required'),
  score: z.number().min(0, 'Score cannot be negative'),
  feedback: z.string().optional(),
});

export type GradeAnswerInput = z.infer<typeof gradeAnswerSchema>;

export const submitAnswerSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const startExamSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
});

export type StartExamInput = z.infer<typeof startExamSchema>;

export const submitExamSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
});

export type SubmitExamInput = z.infer<typeof submitExamSchema>;