import bcrypt from 'bcryptjs';
import type { IUserRepository } from '../interfaces/user.repository.interface.js';
import type { CreateUserDto, UpdateUserDto, UserFilterDto } from '../dtos/user.dto.js';
import type { PaginatedResponse, Role } from '../../../core/types/index.js';
import type { UserWithRelations } from '../interfaces/user.repository.interface.js';

export interface UserStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
}

export class UserService {
  constructor(private readonly repository: IUserRepository) {}

  async findAll(dto: UserFilterDto): Promise<PaginatedResponse<UserWithRelations>> {
    const { page, limit, sortBy, sortOrder, ...filter } = dto;
    
    const result = await this.repository.findAll(
      { role: filter.role as Role | undefined, isActive: filter.isActive, search: filter.search },
      { page, limit, sortBy, sortOrder }
    );

    return {
      success: true,
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async findById(id: string): Promise<UserWithRelations | null> {
    return this.repository.findById(id);
  }

  async create(dto: CreateUserDto): Promise<{ id: string; email: string; name: string; role: Role }> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    
    const user = await this.repository.create({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role,
      phone: dto.phone,
      address: dto.address,
      gender: dto.gender,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });

    if (dto.role === 'STUDENT') {
      // Create student profile - handled by repository or separate call
    } else if (dto.role === 'TEACHER' || dto.role === 'HOMEROOM_TEACHER') {
      // Create teacher profile - handled by repository or separate call
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserWithRelations | null> {
    const updateData: Partial<{
      email: string;
      password: string;
      name: string;
      role: Role;
      phone: string;
      address: string;
      gender: Role;
      birthDate: Date;
      isActive: boolean;
    }> = { ...dto };

    if (dto.password) {
      (updateData as Record<string, unknown>).password = await bcrypt.hash(dto.password, 12);
    }

    if (dto.birthDate) {
      (updateData as Record<string, unknown>).birthDate = new Date(dto.birthDate);
    }

    return this.repository.update(id, updateData);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.repository.delete(id);
    return { success: true };
  }

  async activate(id: string): Promise<void> {
    await this.repository.activate(id);
  }

  async getStats(): Promise<UserStats> {
    return this.repository.getStats();
  }
}