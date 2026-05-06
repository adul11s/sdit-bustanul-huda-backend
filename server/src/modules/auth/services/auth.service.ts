import bcrypt from 'bcryptjs';
import type { IAuthRepository } from '../interfaces/auth.repository.interface.js';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import type { LoginDto, RegisterDto, ChangePasswordDto } from '../dtos/auth.dto.js';
import { generateToken } from '../../../core/utils/auth.js';
import type { TokenResponse, Role } from '../../../core/types/index.js';

export class AuthService implements IAuthService {
  constructor(private readonly repository: IAuthRepository) {}

  async login(dto: LoginDto): Promise<TokenResponse | null> {
    const user = await this.repository.findByEmail(dto.email);

    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      return null;
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      },
    };
  }

  async register(dto: RegisterDto): Promise<TokenResponse | null> {
    const existingUser = await this.repository.findByEmail(dto.email);

    if (existingUser) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    
    // Create user via prisma directly - simplify for now
    // In production, use repository.create method
    const { prisma } = await import('../../../core/database/prisma.js');
    
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role as Role,
        phone: dto.phone,
        address: dto.address,
        gender: dto.gender as Role extends string ? never : never,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });

    if (dto.role === 'STUDENT') {
      await prisma.student.create({ data: { userId: user.id } });
    } else if (dto.role === 'TEACHER' || dto.role === 'HOMEROOM_TEACHER') {
      await prisma.teacher.create({ data: { userId: user.id } });
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
      },
    };
  }

  async getProfile(userId: string) {
    return this.repository.findById(userId);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.repository.findById(userId);
    
    if (!user) {
      return false;
    }

    const { prisma } = await import('../../../core/database/prisma.js');
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!existingUser) {
      return false;
    }

    const isValid = await bcrypt.compare(oldPassword, existingUser.password);
    if (!isValid) {
      return false;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.repository.updatePassword(userId, hashed);

    return true;
  }
}