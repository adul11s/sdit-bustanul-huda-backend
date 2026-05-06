import type { TokenResponse } from '../../../core/types/index.js';

export interface IAuthService {
  login(email: string, password: string): Promise<TokenResponse | null>;
  register(data: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
    address?: string;
    gender?: string;
    birthDate?: string;
  }): Promise<TokenResponse | null>;
  getProfile(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    phone: string | null;
    address: string | null;
    gender: string | null;
    birthDate: Date | null;
    avatar: string | null;
    isActive: boolean;
    createdAt: Date;
    student: { id: string; classId: string | null } | null;
    teacher: { id: string; homeroomClassId: string | null } | null;
  } | null>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean>;
}