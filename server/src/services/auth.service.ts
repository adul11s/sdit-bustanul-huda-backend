import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { generateToken } from '../utils/auth.js';
import type { Role, CreateUserDto, TokenResponse } from '../types/index.js';

export class AuthService {
  async login(email: string, password: string): Promise<TokenResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { student: true, teacher: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      },
    };
  }

  async register(data: CreateUserDto): Promise<{ user: any; token: string } | null> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        phone: data.phone,
        address: data.address,
        gender: data.gender,
        birthDate: data.birthDate,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (data.role === 'STUDENT') {
      await prisma.student.create({
        data: { userId: user.id },
      });
    } else if (data.role === 'TEACHER' || data.role === 'HOMEROOM_TEACHER') {
      await prisma.teacher.create({
        data: { userId: user.id },
      });
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return { user, token };
  }

  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        gender: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        student: {
          include: {
            class: {
              include: { level: true },
            },
          },
        },
        teacher: {
          include: {
            subjects: true,
            homeroomClass: {
              include: { level: true },
            },
          },
        },
      },
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return false;

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return true;
  }
}

export const authService = new AuthService();