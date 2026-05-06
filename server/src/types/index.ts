export type Role = 'ADMIN' | 'TEACHER' | 'HOMEROOM_TEACHER' | 'STUDENT' | 'FINANCE';

export type Gender = 'MALE' | 'FEMALE';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'SICK' | 'PERMISSION';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type PaymentType = 'TUITION' | 'ACTIVITIES' | 'BOOKS' | 'OTHER';

export type ExamType = 'MCQ' | 'ESSAY' | 'MIXED';

export type QuestionType = 'MCQ' | 'ESSAY';

export type BulletinStatus = 'UPCOMING' | 'ONGOING' | 'PAST';

export type BulletinCategory = 'EVENT' | 'ACHIEVEMENT' | 'ANNOUNCEMENT';

export type NotificationType = 'ASSIGNMENT' | 'EXAM' | 'PAYMENT' | 'BULLETIN' | 'PROMOTION' | 'GENERAL';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  address?: string;
  gender?: Gender;
  birthDate?: Date;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  classId?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface TokenResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: Role;
  phone?: string;
  address?: string;
  gender?: Gender;
  birthDate?: Date;
}

export interface UpdateUserDto extends Partial<CreateUserDto> {
  isActive?: boolean;
}

export interface CreateClassDto {
  name: string;
  levelId: string;
  homeroomTeacherId?: string;
}

export interface CreateSubjectDto {
  name: string;
  code?: string;
  description?: string;
  teacherId: string;
}

export interface CreateAssignmentDto {
  title: string;
  content: string;
  fileUrl?: string;
  dueDate: string;
  points?: number;
  subjectId: string;
  targetType?: 'CLASS' | 'STUDENT';
  classId?: string;
  studentIds?: string[];
  category?: 'ASSIGNMENT' | 'WEEKLY_EXAM' | 'MIDTERM' | 'FINAL';
}

export interface CreateExamDto {
  title: string;
  date: string;
  type: ExamType;
  duration?: number;
  subjectId: string;
  isPublished?: boolean;
  targetType?: 'CLASS' | 'STUDENT';
  classId?: string;
  studentIds?: string[];
  category?: 'ASSIGNMENT' | 'WEEKLY_EXAM' | 'MIDTERM' | 'FINAL';
}

export interface CreateQuestionDto {
  text: string;
  type: QuestionType;
  options?: string[];
  answer: string;
  score?: number;
  order?: number;
}

export interface CreateGradeDto {
  studentId: string;
  subjectId: string;
  value: number;
  assignmentId?: string;
  examId?: string;
  comment?: string;
}

export interface CreateAttendanceDto {
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  note?: string;
}

export interface CreateBulletinDto {
  title: string;
  content: string;
  image?: string;
  category?: BulletinCategory;
  eventDate?: Date;
  status?: BulletinStatus;
  isPublished?: boolean;
  media?: string[]; // URLs of additional images
}

export interface UpdateBulletinDto extends Partial<CreateBulletinDto> {}

export interface CreateCalendarEventDto {
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  description?: string;
  affectsAttendance?: boolean;
  affectsWorkload?: boolean;
}

export interface CreateInvoiceDto {
  studentId: string;
  title: string;
  amount: number;
  type: PaymentType;
  description?: string;
  month?: number;
  year?: number;
  dueDate: Date;
}

export interface CreateScheduleDto {
  subjectId: string;
  classId: string;
  academicYearId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface CreatePaymentDto {
  invoiceId?: string;
  studentId: string;
  amount: number;
  method?: string;
  note?: string;
}

export interface PromotionDto {
  studentId: string;
  toClassId: string;
  academicYearId: string;
}