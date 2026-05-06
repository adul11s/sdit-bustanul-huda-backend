import type { Role, Gender } from '../../../core/types/index.js';

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

export interface IAuthRepository {
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
  findById(id: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: Role;
    phone: string | null;
    address: string | null;
    gender: Gender | null;
    birthDate: Date | null;
    avatar: string | null;
    isActive: boolean;
    createdAt: Date;
    student: { id: string; classId: string | null } | null;
    teacher: { id: string; homeroomClassId: string | null } | null;
  } | null>;
  updatePassword(id: string, password: string): Promise<void>;
}