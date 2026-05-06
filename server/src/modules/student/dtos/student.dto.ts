import { z } from 'zod';

export const studentFilterSchema = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  fileUrl: z.string().optional(),
  dueDate: z.string().datetime(),
  points: z.number().optional(),
  subjectId: z.string().cuid(),
});

export const submitAnswerSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().cuid(),
    content: z.string(),
  })),
});

export const markAttendanceSchema = z.object({
  studentId: z.string().cuid(),
  date: z.string().datetime(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'SICK', 'PERMISSION']),
  note: z.string().optional(),
});

export type StudentFilterDto = z.infer<typeof studentFilterSchema>;
export type CreateAssignmentDto = z.infer<typeof createAssignmentSchema>;
export type SubmitAnswerDto = z.infer<typeof submitAnswerSchema>;
export type MarkAttendanceDto = z.infer<typeof markAttendanceSchema>;