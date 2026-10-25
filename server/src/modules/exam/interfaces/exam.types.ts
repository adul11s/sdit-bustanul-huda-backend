export interface IQuestionFileRow {
  question: string;
  type: 'mcq' | 'essay';
  score: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
}

export interface IFileValidationResult {
  isValid: boolean;
  errors: string[];
  validRows: IQuestionFileRow[];
  totalRows: number;
}

export interface IExam {
  id: string;
  title: string;
  description: string | null;
  type: 'MCQ' | 'ESSAY' | 'MIXED';
  subjectId: string;
  dueDate: Date | null;
  startTime: Date | null;
  timeLimit: number;
  totalScore: number;
  isPublished: boolean;
  isActive: boolean;
  allowRetry: boolean;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  targetType: 'CLASS' | 'STUDENT';
  classId: string | null;
  category: 'ASSIGNMENT' | 'WEEKLY_EXAM' | 'MIDTERM' | 'FINAL';
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExamWithRelations extends IExam {
  subject: {
    id: string;
    name: string;
  };
  createdBy: {
    id: string;
    user: {
      name: string;
    };
  };
  questions?: IQuestion[];
  _count?: {
    questions: number;
    submissions?: number;
  };
}

export interface IQuestion {
  id: string;
  examId: string;
  text: string;
  type: 'MCQ' | 'ESSAY';
  options: string[] | null;
  correctAnswer: string;
  score: number;
  order: number;
  explanation: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface IQuestionWithRelations extends IQuestion {
  exam: {
    id: string;
    title: string;
  };
}

export interface IStudentAnswer {
  id: string;
  questionId: string;
  submissionId: string;
  studentId: string;
  answer: string;
  score: number | null;
  gradingStatus: 'PENDING' | 'AUTO_GRADED' | 'MANUALLY_GRADED' | 'FINAL';
  feedback: string | null;
  gradedAt: Date | null;
  gradedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentAnswerWithRelations extends IStudentAnswer {
  question?: Partial<IQuestion>;
  submission?: Partial<ISubmission> & {
    exam?: { id: string; title: string };
  };
  student?: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
  gradedBy?: {
    id: string;
    user: {
      name: string;
    };
  } | null;
}

export interface ISubmission {
  id: string;
  examId: string;
  studentId: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  startedAt: Date | null;
  submittedAt: Date | null;
  totalScore: number | null;
  percentage: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  isAutoSubmitted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubmissionWithRelations extends ISubmission {
  exam: {
    id: string;
    title: string;
    timeLimit: number;
    totalScore: number;
  };
  student: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
  answers: IStudentAnswerWithRelations[];
}

export interface ICreateExamDTO {
  title: string;
  description?: string;
  type: 'MCQ' | 'ESSAY' | 'MIXED';
  subjectId: string;
  dueDate?: string;
  startTime?: string;
  timeLimit?: number;
  totalScore?: number;
  allowRetry?: boolean;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  targetType?: 'CLASS' | 'STUDENT';
  classId?: string;
  studentIds?: string[];
  category?: 'ASSIGNMENT' | 'WEEKLY_EXAM' | 'MIDTERM' | 'FINAL';
}

export interface IUpdateExamDTO extends Partial<ICreateExamDTO> {
  isPublished?: boolean;
}

export interface ICreateQuestionDTO {
  examId: string;
  text: string;
  type: 'MCQ' | 'ESSAY';
  options?: string[];
  correctAnswer: string;
  score: number;
  order?: number;
  explanation?: string;
}

export interface IUpdateQuestionDTO extends Partial<ICreateQuestionDTO> {
  isActive?: boolean;
}

export interface ICreateQuestionsBatchDTO {
  examId?: string;
  questions: ICreateQuestionDTO[];
}

export interface IGradeAnswerDTO {
  answerId: string;
  score: number;
  feedback?: string;
}

export interface IExamFilters {
  subjectId?: string;
  type?: 'MCQ' | 'ESSAY';
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ISubmissionFilters {
  examId?: string;
  studentId?: string;
  status?: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
  page?: number;
  limit?: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}