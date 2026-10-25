import { ExamRepository } from '../repositories/exam.repository.js';
import { ExamParser } from '../utils/exam-parser.js';
import { 
  ICreateExamDTO, 
  IUpdateExamDTO, 
  ICreateQuestionDTO, 
  IUpdateQuestionDTO,
  ICreateQuestionsBatchDTO,
  IGradeAnswerDTO,
  IExamFilters,
  ISubmissionFilters
} from '../interfaces/exam.types.js';

export class ExamService {
  private repository: ExamRepository;
  private parser: ExamParser;

  constructor() {
    this.repository = new ExamRepository();
    this.parser = new ExamParser();
  }

  async createExam(data: ICreateExamDTO, teacherId: string) {
    const exam = await this.repository.create(data, teacherId);
    return exam;
  }

  async getExamById(id: string) {
    const exam = await this.repository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }
    return exam;
  }

  async getExams(filters: IExamFilters, teacherId: string) {
    return await this.repository.findAll(filters, teacherId);
  }

  async updateExam(id: string, data: IUpdateExamDTO, teacherId: string) {
    const exam = await this.repository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }
    if (exam.createdById !== teacherId) {
      throw new Error('Unauthorized');
    }
    return await this.repository.update(id, data);
  }

  async publishExam(id: string, teacherId: string) {
    const exam = await this.repository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }
    if (exam.createdById !== teacherId) {
      throw new Error('Unauthorized');
    }
    if (!exam.questions || exam.questions.length === 0) {
      throw new Error('Cannot publish exam without questions');
    }
    return await this.repository.update(id, { isPublished: true });
  }

  async deleteExam(id: string, teacherId: string) {
    const exam = await this.repository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }
    if (exam.createdById !== teacherId) {
      throw new Error('Unauthorized');
    }
    await this.repository.delete(id);
  }

  async createQuestion(data: ICreateQuestionDTO) {
    return await this.repository.createQuestion(data);
  }

  async getQuestionsByExamId(examId: string) {
    return await this.repository.getQuestionsByExamId(examId);
  }

  async updateQuestion(id: string, data: IUpdateQuestionDTO) {
    return await this.repository.updateQuestion(id, data);
  }

  async deleteQuestion(id: string) {
    await this.repository.deleteQuestion(id);
  }

  async createQuestionsFromFile(examId: string, fileContent: string, fileName: string) {
    const parsed = this.parser.parseFile(fileContent, fileName);
    
    if (!parsed.isValid) {
      throw new Error(`Invalid file: ${parsed.errors.join(', ')}`);
    }

    const questions: ICreateQuestionDTO[] = parsed.validRows.map((row, index) => ({
      examId,
      text: row.question,
      type: row.type.toUpperCase() as 'MCQ' | 'ESSAY',
      options: row.type.toLowerCase() === 'mcq' 
        ? [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean)
        : undefined,
      correctAnswer: row.type.toLowerCase() === 'mcq' ? row.correct_answer : '',
      score: row.score,
      order: index,
    }));

    return await this.repository.createQuestionsBatch({ questions });
  }

  previewQuestionsFromFile(fileContent: string, fileName: string) {
    const parsed = this.parser.parseFile(fileContent, fileName);
    
    const questions = parsed.validRows.map((row, index) => ({
      text: row.question,
      type: row.type.toUpperCase() as 'MCQ' | 'ESSAY',
      options: row.type.toLowerCase() === 'mcq' 
        ? [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean)
        : undefined,
      correctAnswer: row.type.toLowerCase() === 'mcq' ? row.correct_answer : '',
      score: row.score,
      order: index,
    }));

    return {
      questions,
      errors: parsed.errors,
      totalRows: parsed.totalRows,
      isValid: parsed.isValid,
    };
  }

  async startExam(examId: string, userId: string, ipAddress?: string, userAgent?: string) {
    // Pass userId instead of studentId
    return await this.repository.createSubmission(examId, userId, ipAddress, userAgent);
  }

  async startProgress(submissionId: string) {
    return await this.repository.startSubmission(submissionId);
  }

  async submitAnswer(submissionId: string, userId: string, answer: string) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw new Error('Exam already submitted');
    }

    return await this.repository.submitAnswer({
      submissionId,
      questionId: submission.answers[0].questionId,
      studentId: submission.studentId,
      answer,
    });
  }

  async submitAnswerByQuestion(submissionId: string, questionId: string, userId: string, answer: string) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw new Error('Exam already submitted');
    }

    return await this.repository.submitAnswer({
      submissionId,
      questionId,
      studentId: submission.studentId,
      answer,
    });
  }

  async submitExam(submissionId: string, userId: string) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission) {
      throw new Error('Submission not found');
    }

    const student = await this.getStudentByUserId(userId);
    if (!student || submission.studentId !== student.id) {
      throw new Error('Unauthorized');
    }
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw new Error('Exam already submitted');
    }

    return await this.repository.submitExam(submissionId);
  }

  private async getStudentByUserId(userId: string) {
    return await this.repository.getStudentByUserId(userId);
  }

  async autoSubmitExam(submissionId: string) {
    const submission = await this.repository.findSubmissionById(submissionId);
    if (!submission || submission.status !== 'IN_PROGRESS') {
      return;
    }

    return await this.repository.submitExam(submissionId, true);
  }

  async getSubmissionById(id: string) {
    return await this.repository.findSubmissionById(id);
  }

  async getExamSubmissions(examId: string, filters: ISubmissionFilters) {
    return await this.repository.getSubmissionsByExamId({ ...filters, examId });
  }

  async gradeEssayAnswer(data: IGradeAnswerDTO, teacherId: string) {
    return await this.repository.gradeAnswer(data, teacherId);
  }

  async getPendingEssays(teacherId: string, filters: { examId?: string; page?: number; limit?: number }) {
    return await this.repository.getPendingEssays({ ...filters, teacherId });
  }

  async getAvailableExamsForStudent(studentId: string, page = 1, limit = 10) {
    return await this.repository.getAvailableExamsForStudent(studentId, page, limit);
  }

  async getStudentSubmission(examId: string, studentId: string) {
    return await this.repository.getStudentSubmission(examId, studentId);
  }

  async calculateFinalScore(submissionId: string) {
    return await this.repository.calculateFinalScore(submissionId);
  }
}

export const examService = new ExamService();