import { Prisma } from '@prisma/client';
import { prisma } from '../../core/database/prisma.js';
import type { Role, Gender } from '../../../core/types/index.js';
import type { UserWithRelations, UserFilter, FindAllOptions } from '../interfaces/user.repository.interface.js';

export interface UserFilter {
  role?: Role;
  isActive?: boolean;
  search?: string;
}

export interface FindAllOptions {
  page: number;
  limit: number;
  sortBy?: keyof User;
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

export class UserRepository {
  async findById(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        gender: true,
        isActive: true,
        createdAt: true,
        student: { select: { id: true } },
        teacher: { select: { id: true } },
      },
    }) as Promise<UserWithRelations | null>;
  }

  async findByEmail(email: string): Promise<{
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
  } | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { student: true, teacher: true },
    }) as ReturnType<typeof prisma.user.findUnique>;
  }

  async findAll(filter: UserFilter, options: FindAllOptions): Promise<{ data: UserWithRelations[]; total: number }> {
    const where: Prisma.UserWhereInput = {};
    
    if (filter.role) {
      where.role = filter.role;
    }
    
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }
    
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search } },
        { email: { contains: filter.search } },
      ];
    }

    const skip = (options.page - 1) * options.limit;
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    
    if (options.sortBy) {
      orderBy[options.sortBy] = options.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: options.limit,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          gender: true,
          isActive: true,
          createdAt: true,
          student: { select: { id: true } },
          teacher: { select: { id: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data: data as UserWithRelations[], total };
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
    phone?: string;
    address?: string;
    gender?: Gender;
    birthDate?: Date;
  }): Promise<{ id: string; email: string; name: string; role: Role }> {
    return prisma.user.create({
      data,
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async update(id: string, data: Partial<{
    email: string;
    password: string;
    name: string;
    role: Role;
    phone: string;
    address: string;
    gender: Gender;
    birthDate: Date;
    isActive: boolean;
  }>): Promise<UserWithRelations | null> {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        gender: true,
        isActive: true,
        createdAt: true,
        student: { select: { id: true } },
        teacher: { select: { id: true } },
      },
    }) as Promise<UserWithRelations | null>;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async count(filter: UserFilter): Promise<number> {
    const where: Prisma.UserWhereInput = {};
    
    if (filter.role) {
      where.role = filter.role;
    }
    
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    return prisma.user.count({ where });
  }

  async getStats(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    totalAdmins: number;
  }> {
    const [totalUsers, totalStudents, totalTeachers, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: { in: ['TEACHER', 'HOMEROOM_TEACHER'] } } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return { totalUsers, totalStudents, totalTeachers, totalAdmins };
  }
}

export const userRepository = new UserRepository();