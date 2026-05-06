import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/database/prisma.js';
import type { Role, Gender } from '../../../core/types/index.js';
import type { IAuthRepository } from '../interfaces/auth.repository.interface.js';

interface AuthUser {
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
}

interface AuthProfile {
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
}

export class AuthRepository implements IAuthRepository {
  async findByEmail(email: string): Promise<AuthUser | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { student: true, teacher: true },
    }) as Promise<AuthUser | null>;
  }

  async findById(id: string): Promise<AuthProfile | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        gender: true,
        birthDate: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        student: { select: { id: true, classId: true } },
        teacher: { select: { id: true, homeroomClassId: true } },
      },
    }) as Promise<AuthProfile | null>;
  }

  async updatePassword(id: string, password: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { password },
    });
  }
}

export const authRepository = new AuthRepository();