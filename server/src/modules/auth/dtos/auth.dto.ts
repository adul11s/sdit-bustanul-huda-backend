import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['ADMIN', 'TEACHER', 'HOMEROOM_TEACHER', 'STUDENT', 'FINANCE']),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthDate: z.string().datetime().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;