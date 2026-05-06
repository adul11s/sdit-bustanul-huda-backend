import type { CreateUserDto, UpdateUserDto, UserFilterDto } from '../dtos/user.dto.js';
import type { PaginatedResponse, UserStats } from '../../../core/types/index.js';
import type { UserWithRelations } from '../interfaces/user.repository.interface.js';

export interface IUserService {
  findAll(dto: UserFilterDto): Promise<PaginatedResponse<UserWithRelations>>;
  findById(id: string): Promise<UserWithRelations | null>;
  create(dto: CreateUserDto): Promise<{ id: string; email: string; name: string; role: import('../../../core/types/index.js').Role }>;
  update(id: string, dto: UpdateUserDto): Promise<UserWithRelations | null>;
  delete(id: string): Promise<{ success: boolean }>;
  activate(id: string): Promise<void>;
  getStats(): Promise<UserStats>;
}