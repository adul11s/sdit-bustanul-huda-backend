import type { Role, Gender } from '../../../core/types/index.js';

export interface UserFilter {
  role?: Role;
  isActive?: boolean;
  search?: string;
}

export interface FindAllOptions {
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface UserWithRelations {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  gender: Gender | null;
  isActive: boolean;
  createdAt: Date;
  student: { id: string } | null;
  teacher: { id: string } | null;
}

export interface IUserRepository {
  findById(id: string): Promise<UserWithRelations | null>;
  findByEmail(email: string): Promise<{
    id: string;
    email: string;
    password: string;
    name: string;
    role: Role;
    phone: string | null;
    address: string | null;
    gender: Gender | null;
    birthDate: Date | null;
    avatar: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    student: { id: string } | null;
    teacher: { id: string } | null;
  } | null>;
  findAll(filter: UserFilter, options: FindAllOptions): Promise<{ data: UserWithRelations[]; total: number }>;
  create(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
    phone?: string;
    address?: string;
    gender?: Gender;
    birthDate?: Date;
  }): Promise<{ id: string; email: string; name: string; role: Role }>;
  update(id: string, data: Partial<{
    email: string;
    password: string;
    name: string;
    role: Role;
    phone: string;
    address: string;
    gender: Gender;
    birthDate: Date;
    isActive: boolean;
  }>): Promise<UserWithRelations | null>;
  delete(id: string): Promise<void>;
  activate(id: string): Promise<void>;
  count(filter: UserFilter): Promise<number>;
  getStats(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
  }>;
}