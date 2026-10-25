import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import type { CreateUserDto, UpdateUserDto, PaginatedResponse, Role, Gender } from '../types/index.js';

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  gender: Gender | null;
  isActive: boolean;
  createdAt: Date;
};

export class UserService {
  async findAll(page = 1, limit = 10, role?: string): Promise<PaginatedResponse<UserListItem>> {
    const where = role ? { role: role as any } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          gender: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, requestingUserId?: string, requestingRole?: string) {
    const requestingUser = requestingUserId
      ? await prisma.user.findUnique({ where: { id: requestingUserId }, select: { role: true } })
      : null;
    const isAdmin = requestingUser?.role === 'ADMIN';

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        gender: true,
        isActive: true,
        avatar: true,
        title: true,
        teachingStyle: true,
        hobby: true,
        createdAt: true,
        ...(isAdmin && { birthDate: true, birthPlace: true, address: true }),
        student: {
          include: {
            class: { include: { level: true } },
            enrollments: { include: { subject: true } },
          },
        },
        teacher: {
          include: {
            subjects: true,
            homeroomClass: { include: { level: true } },
          },
        },
      },
    });
    return user;
  }

  async create(data: CreateUserDto) {
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
        phone: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (data.role === 'STUDENT') {
      await prisma.student.create({ data: { userId: user.id } });
    } else if (['TEACHER', 'HOMEROOM_TEACHER'].includes(data.role)) {
      await prisma.teacher.create({ data: { userId: user.id } });
    }

    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        gender: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return { success: true };
  }

  async activate(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async getStats() {
    const [totalUsers, totalStudents, totalTeachers, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: { in: ['TEACHER', 'HOMEROOM_TEACHER'] } } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return { totalUsers, totalStudents, totalTeachers, totalAdmins };
  }
}

export const userService = new UserService();