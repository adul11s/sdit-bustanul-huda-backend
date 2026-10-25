import { PrismaClient, Exam, Question, StudentAnswer, Submission, Prisma } from '@prisma/client';
import { DomainError } from '../../../core/utils/errors.js';
import { IExamWithRelations, IQuestion, ICreateExamDTO, IUpdateExamDTO, ICreateQuestionDTO, IUpdateQuestionDTO, IExamFilters, ISubmissionFilters, IStudentAnswerWithRelations, ISubmissionWithRelations, IPaginatedResponse, ICreateQuestionsBatchDTO, IGradeAnswerDTO } from '../interfaces/exam.types.js';

const prisma = new PrismaClient();

export class ExamRepository {
  async create(data: ICreateExamDTO, teacherId: string): Promise<Exam> {
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        subjectId: data.subjectId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        startTime: data.startTime ? new Date(data.startTime) : null,
        timeLimit: data.timeLimit,
        totalScore: data.totalScore,
        allowRetry: data.allowRetry,
        maxAttempts: data.maxAttempts,
        shuffleQuestions: data.shuffleQuestions,
        shuffleOptions: data.shuffleOptions,
        targetType: data.targetType || 'CLASS',
        classId: data.classId || null,
        category: data.category || 'WEEKLY_EXAM',
        createdById: teacherId,
      },
    });

    // If targeting specific students, create junction records
    if (data.targetType === 'STUDENT' && data.studentIds && data.studentIds.length > 0) {
      await prisma.examStudentTarget.createMany({
        data: data.studentIds.map((sid) => ({ examId: exam.id, studentId: sid })),
        skipDuplicates: true,
      });
    }

    return exam;
  }

  async findById(id: string): Promise<IExamWithRelations | null> {
    return await prisma.exam.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true } },
        createdBy: { select: { id: true, user: { select: { name: true } } } },
        questions: { 
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            examId: true,
            text: true,
            type: true,
            options: true,
            correctAnswer: true,
            score: true,
            order: true,
            explanation: true,
            isActive: true,
            createdAt: true,
          }
        },
        _count: { select: { questions: true, submissions: true } },
      },
    }) as IExamWithRelations;
  }

  async findAll(filters: IExamFilters, teacherId: string): Promise<IPaginatedResponse<IExamWithRelations>> {
    const { subjectId, type, isPublished, search, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.ExamWhereInput = {
      createdById: teacherId,
    };

    if (subjectId) where.subjectId = subjectId;
    if (type) where.type = type;
    if (isPublished !== undefined) where.isPublished = isPublished;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true } },
          createdBy: { select: { id: true, user: { select: { name: true } } } },
          _count: { select: { questions: true, submissions: true } },
        },
      }),
      prisma.exam.count({ where }),
    ]);

    return {
      data: data as IExamWithRelations[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: IUpdateExamDTO): Promise<Exam> {
    const updateData: Prisma.ExamUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.subjectId !== undefined) updateData.subject = { connect: { id: data.subjectId } };
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.startTime !== undefined) updateData.startTime = data.startTime ? new Date(data.startTime) : null;
    if (data.timeLimit !== undefined) updateData.timeLimit = data.timeLimit;
    if (data.totalScore !== undefined) updateData.totalScore = data.totalScore;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
    if (data.allowRetry !== undefined) updateData.allowRetry = data.allowRetry;
    if (data.maxAttempts !== undefined) updateData.maxAttempts = data.maxAttempts;
    if (data.shuffleQuestions !== undefined) updateData.shuffleQuestions = data.shuffleQuestions;
    if (data.shuffleOptions !== undefined) updateData.shuffleOptions = data.shuffleOptions;

    return await prisma.exam.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.exam.delete({ where: { id } });
  }

  async getQuestionsByExamId(examId: string): Promise<IQuestion[]> {
    return await prisma.question.findMany({
      where: { examId, isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        examId: true,
        text: true,
        type: true,
        options: true,
        correctAnswer: true,
        score: true,
        order: true,
        explanation: true,
        isActive: true,
        createdAt: true,
      },
    }) as IQuestion[];
  }

  async createQuestion(data: ICreateQuestionDTO): Promise<Question> {
    const exam = await prisma.exam.findUnique({ where: { id: data.examId } });
    if (!exam) throw new Error('Exam not found');

    const maxOrder = await prisma.question.findFirst({
      where: { examId: data.examId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    return await prisma.question.create({
      data: {
        examId: data.examId,
        text: data.text,
        type: data.type,
        options: data.options === undefined || data.options === null
          ? Prisma.DbNull
          : (data.options as Prisma.InputJsonValue),
        correctAnswer: data.correctAnswer,
        score: data.score,
        order: data.order ?? (maxOrder?.order ?? 0) + 1,
        explanation: data.explanation,
      },
    });
  }

  async createQuestionsBatch(data: ICreateQuestionsBatchDTO): Promise<Question[]> {
    const questions: Question[] = [];

    const examId = data.examId;
    if (!examId) {
      throw new DomainError('examId is required to create questions in batch', 400);
    }

    for (const q of data.questions) {
      const question = await this.createQuestion({ ...q, examId });
      questions.push(question);
    }

    return questions;
  }

  async updateQuestion(id: string, data: IUpdateQuestionDTO): Promise<Question> {
    const updateData: Prisma.QuestionUpdateInput = {};

    if (data.text !== undefined) updateData.text = data.text;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.options !== undefined) updateData.options = data.options as unknown as Prisma.InputJsonValue;
    if (data.correctAnswer !== undefined) updateData.correctAnswer = data.correctAnswer;
    if (data.score !== undefined) updateData.score = data.score;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return await prisma.question.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteQuestion(id: string): Promise<void> {
    await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getStudentByUserId(userId: string) {
    return await prisma.student.findFirst({
      where: { userId }
    });
  }

  async findSubmissionById(id: string): Promise<ISubmissionWithRelations | null> {
    return await prisma.submission.findUnique({
      where: { id },
      include: {
        exam: { select: { id: true, title: true, timeLimit: true, totalScore: true } },
        student: { select: { id: true, user: { select: { name: true, email: true } } } },
        answers: {
          include: {
            question: true,
            gradedBy: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    }) as ISubmissionWithRelations;
  }

  async findSubmissionByExamAndStudent(examId: string, studentId: string): Promise<Submission | null> {
    return await prisma.submission.findFirst({
      where: { examId, studentId },
    });
  }

  async getSubmissionsByExamId(filters: ISubmissionFilters): Promise<IPaginatedResponse<ISubmissionWithRelations>> {
    const { examId, studentId, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {};
    if (examId) where.examId = examId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          exam: { select: { id: true, title: true, timeLimit: true, totalScore: true } },
          student: { select: { id: true, user: { select: { name: true, email: true } } } },
          answers: true,
        },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data: data as ISubmissionWithRelations[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createSubmission(examId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<ISubmissionWithRelations> {
    // Find student by userId
    let student = await prisma.student.findFirst({
      where: { userId }
    });
    
    // Auto-create student record if user exists but has no student profile
    if (!student) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }
      if (user.role !== 'STUDENT') {
        throw new Error('User is not a student');
      }
      student = await prisma.student.create({ data: { userId } });
    }
    
    const studentId = student.id;
    
    const existing = await prisma.submission.findFirst({
      where: { examId, studentId },
      include: {
        exam: { select: { id: true, title: true, timeLimit: true, totalScore: true } },
        student: { select: { id: true, user: { select: { name: true, email: true } } } },
        answers: {
          include: {
            question: true,
            gradedBy: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    }) as ISubmissionWithRelations | null;

    if (existing) {
      if (existing.status === 'SUBMITTED' || existing.status === 'GRADED') {
        const exam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!exam?.allowRetry) {
          throw new Error('You have already submitted this exam');
        }

        const submissionCount = await prisma.submission.count({
          where: { examId, studentId },
        });

        if (submissionCount >= exam.maxAttempts) {
          throw new Error('Maximum attempts reached');
        }
      } else {
        // Return existing DRAFT or IN_PROGRESS submission
        return existing;
      }
    }

    // Create submission in DRAFT status
    const submission = await prisma.submission.create({
      data: {
        examId,
        studentId,
        status: 'DRAFT',
        ipAddress,
        userAgent,
      },
    });

    // Get exam questions and create answer placeholders for each
    const questions = await prisma.question.findMany({
      where: { examId, isActive: true },
      orderBy: { order: 'asc' },
    });

    // Create StudentAnswer records for each question
    for (const q of questions) {
      await prisma.studentAnswer.create({
        data: {
          submissionId: submission.id,
          questionId: q.id,
          studentId,
          answer: '',
          gradingStatus: 'PENDING',
        },
      });
    }

    // Return submission with relations
    return await prisma.submission.findUnique({
      where: { id: submission.id },
      include: {
        exam: { select: { id: true, title: true, timeLimit: true, totalScore: true } },
        student: { select: { id: true, user: { select: { name: true, email: true } } } },
        answers: {
          include: {
            question: true,
            gradedBy: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    }) as ISubmissionWithRelations;
  }

  async startSubmission(submissionId: string): Promise<ISubmissionWithRelations> {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: { select: { id: true, title: true, timeLimit: true, totalScore: true } },
        student: { select: { id: true, user: { select: { name: true, email: true } } } },
        answers: {
          include: {
            question: true,
            gradedBy: { select: { id: true, user: { select: { name: true } } } },
          },
        },
      },
    }) as ISubmissionWithRelations;
  }

  async submitAnswer(data: { submissionId: string; questionId: string; studentId: string; answer: string }): Promise<StudentAnswer> {
    const studentAnswer = await prisma.studentAnswer.upsert({
      where: {
        submissionId_questionId_studentId: {
          submissionId: data.submissionId,
          questionId: data.questionId,
          studentId: data.studentId,
        },
      },
      update: {
        answer: data.answer,
        gradingStatus: 'PENDING',
      },
      create: {
        submissionId: data.submissionId,
        questionId: data.questionId,
        studentId: data.studentId,
        answer: data.answer,
        gradingStatus: 'PENDING',
      },
    });

    await prisma.submission.update({
      where: { id: data.submissionId },
      data: { status: 'IN_PROGRESS', updatedAt: new Date() },
    });

    return studentAnswer;
  }

  async gradeAnswer(data: IGradeAnswerDTO, teacherId: string): Promise<StudentAnswer> {
    const answer = await prisma.studentAnswer.findUnique({
      where: { id: data.answerId },
      include: { question: true },
    });

    if (!answer) throw new Error('Answer not found');

    return await prisma.studentAnswer.update({
      where: { id: data.answerId },
      data: {
        score: data.score,
        feedback: data.feedback,
        gradingStatus: 'MANUALLY_GRADED',
        gradedAt: new Date(),
        gradedById: teacherId,
      },
    });
  }

  async autoGradeMCQ(submissionId: string): Promise<void> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: { question: true },
        },
      },
    });

    if (!submission) throw new Error('Submission not found');

    let totalScore = 0;

    for (const answer of submission.answers) {
      if (answer.question.type === 'MCQ') {
        const isCorrect = answer.answer.toUpperCase() === answer.question.correctAnswer.toUpperCase();
        const score = isCorrect ? answer.question.score : 0;

        await prisma.studentAnswer.update({
          where: { id: answer.id },
          data: {
            score,
            gradingStatus: isCorrect ? 'AUTO_GRADED' : 'AUTO_GRADED',
          },
        });

        totalScore += score;
      }
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        totalScore,
        status: 'GRADED',
        submittedAt: submission.submittedAt ?? new Date(),
      },
    });
  }

  async calculateFinalScore(submissionId: string): Promise<{ totalScore: number; percentage: number }> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: true,
        answers: true,
      },
    });

    if (!submission) throw new Error('Submission not found');

    let totalScore = 0;
    let allGraded = true;

    for (const answer of submission.answers) {
      if (answer.score === null) {
        allGraded = false;
        break;
      }
      totalScore += answer.score;
    }

    const percentage = submission.exam.totalScore > 0 
      ? (totalScore / submission.exam.totalScore) * 100 
      : 0;

    if (allGraded) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          totalScore,
          percentage,
          status: 'GRADED',
        },
      });
    }

    return { totalScore, percentage };
  }

  async submitExam(submissionId: string, isAuto = false): Promise<Submission> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        answers: {
          include: { question: true },
        },
        exam: true,
      },
    });

    if (!submission) throw new Error('Submission not found');
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw new Error('Exam already submitted');
    }

    await this.autoGradeMCQ(submissionId);
    const { totalScore, percentage } = await this.calculateFinalScore(submissionId);

    return await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        totalScore,
        percentage,
        isAutoSubmitted: isAuto,
      },
    });
  }

  async getAvailableExamsForStudent(studentId: string, page = 1, limit = 10): Promise<IPaginatedResponse<IExamWithRelations>> {
    let subjectIds: string[] = [];
    
    // Try to find student by userId or studentId
    let student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { subject: true },
        },
      },
    });
    
    // If not found, try by userId
    if (!student) {
      student = await prisma.student.findFirst({
        where: { userId: studentId },
        include: {
          enrollments: {
            where: { isActive: true },
            include: { subject: true },
          },
        },
      });
    }
    
    // If still not found, get all published exams (for testing)
    if (student) {
      subjectIds = student.enrollments.map(e => e.subjectId);
    }

    const now = new Date();

    const where: Prisma.ExamWhereInput = {
      isPublished: true,
      isActive: true,
    };
    
    // Filter by subject if student has enrollments
    if (subjectIds.length > 0) {
      where.subjectId = { in: subjectIds };
      where.OR = [
        { dueDate: null },
        { dueDate: { gt: now } },
      ];
    } else {
      // No enrollments - show all published exams (or none)
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true } },
          createdBy: { select: { id: true, user: { select: { name: true } } } },
          _count: { select: { questions: true } },
        },
      }),
      prisma.exam.count({ where }),
    ]);

    return {
      data: data as IExamWithRelations[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStudentSubmission(examId: string, userId: string): Promise<ISubmissionWithRelations | null> {
    // Find student by userId
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return null;
    }

    return await prisma.submission.findFirst({
      where: { examId, studentId: student.id },
      include: {
        exam: { 
          select: { id: true, title: true, timeLimit: true, totalScore: true, dueDate: true, startTime: true }
        },
        student: { select: { id: true, user: { select: { name: true, email: true } } } },
        answers: {
          include: {
            question: true,
          },
        },
      },
    }) as ISubmissionWithRelations;
  }

  async getPendingEssays(filters: { examId?: string; teacherId: string; page?: number; limit?: number }): Promise<IPaginatedResponse<IStudentAnswerWithRelations>> {
    const { examId, teacherId, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const teacher = await prisma.teacher.findFirst({
      where: { userId: teacherId },
    });

    if (!teacher) throw new Error('Teacher not found');

    const subjectIds = await prisma.subject.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    }).then(subjects => subjects.map(s => s.id));

    const where: Prisma.StudentAnswerWhereInput = {
      gradingStatus: { in: ['PENDING', 'AUTO_GRADED'] },
      question: {
        type: 'ESSAY',
        exam: {
          subjectId: { in: subjectIds },
        },
      },
    };

    if (examId) {
      where.submission = { examId };
    }

    const [data, total] = await Promise.all([
      prisma.studentAnswer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          question: { select: { id: true, text: true, type: true, score: true } },
          submission: { 
            select: { id: true, status: true, exam: { select: { id: true, title: true } } }
          },
          student: { select: { id: true, user: { select: { name: true, email: true } } } },
          gradedBy: { select: { id: true, user: { select: { name: true } } } },
        },
      }),
      prisma.studentAnswer.count({ where }),
    ]);

    return {
      data: data as IStudentAnswerWithRelations[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const examRepository = new ExamRepository();