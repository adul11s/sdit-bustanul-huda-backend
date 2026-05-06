import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'TEACHER', 'HOMEROOM_TEACHER', 'STUDENT', 'FINANCE']),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDate: z.string().datetime().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'HOMEROOM_TEACHER', 'STUDENT', 'FINANCE']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const userFilterSchema = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'HOMEROOM_TEACHER', 'STUDENT', 'FINANCE']).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'name', 'email']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const userIdSchema = z.object({
  id: z.string().cuid(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserFilterDto = z.infer<typeof userFilterSchema>;
export type UserIdDto = z.infer<typeof userIdSchema>;