import prisma from '../utils/prisma.js';
import bcrypt from 'bcryptjs';

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  avatar?: string;
  title?: string;
  teachingStyle?: string;
  hobby?: string;
  password?: string;
}

export class ProfileService {
  /**
   * Get full profile for a user
   * Includes sensitive fields
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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
        title: true,
        teachingStyle: true,
        hobby: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        student: {
          include: {
            class: {
              include: {
                level: true,
                homeroomTeacher: {
                  include: {
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            },
            enrollments: { where: { isActive: true }, include: { subject: true } },
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

  /**
   * Update user profile
   * Users can only update their own profile (except admins)
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const updateData: any = { ...data };

    if (data.birthDate) {
      updateData.birthDate = new Date(data.birthDate);
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Remove undefined fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        avatar: true,
        title: true,
        teachingStyle: true,
        hobby: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get public teacher profiles
   * Returns only safe/public fields
   */
  async getPublicTeachers() {
    const teachers = await prisma.teacher.findMany({
      where: {
        user: {
          isActive: true,
          role: { in: ['TEACHER', 'HOMEROOM_TEACHER'] },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            title: true,
            teachingStyle: true,
            hobby: true,
            gender: true,
          },
        },
        subjects: { select: { name: true } },
        homeroomClass: { select: { name: true, level: { select: { name: true } } } },
      },
    });

    return teachers.map((t) => ({
      id: t.user.id,
      name: t.user.name,
      avatar: t.user.avatar,
      title: t.user.title,
      teachingStyle: t.user.teachingStyle,
      hobby: t.user.hobby,
      gender: t.user.gender,
      subjects: t.subjects.map((s) => s.name),
      homeroomClass: t.homeroomClass ? `${t.homeroomClass.level.name} - ${t.homeroomClass.name}` : null,
    }));
  }
}

export const profileService = new ProfileService();
export default profileService;
