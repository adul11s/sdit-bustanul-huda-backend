import type { StudentWithDetails, Enrollment } from '../interfaces/student.types.js';

export interface IStudentService {
  getProfile(userId: string): Promise<StudentWithDetails | null>;
  getSubjects(userId: string): Promise<Enrollment[]>;
}