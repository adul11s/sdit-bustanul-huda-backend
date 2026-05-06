import { Request, Response, NextFunction } from 'express';
import type { IAuthService } from '../interfaces/auth.service.interface.js';
import type { LoginDto, RegisterDto, ChangePasswordDto } from '../dtos/auth.dto.js';
import { loginSchema, registerSchema, changePasswordSchema } from '../dtos/auth.dto.js';
import { successResponse, errorResponse, createdResponse, unauthorizedResponse, badRequestResponse, validationErrorResponse } from '../../../core/utils/response.js';

export class AuthController {
  constructor(private readonly service: IAuthService) {}

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = loginSchema.parse(req.body);
      const result = await this.service.login(parsed);

      if (!result) {
        unauthorizedResponse(res, 'Invalid credentials');
        return;
      }

      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = registerSchema.parse(req.body);
      const result = await this.service.register(parsed);

      if (!result) {
        badRequestResponse(res, 'User already exists or invalid data');
        return;
      }

      createdResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as Request & { user: { userId: string } }).user?.userId;
      
      if (!userId) {
        unauthorizedResponse(res);
        return;
      }

      const profile = await this.service.getProfile(userId);
      
      if (!profile) {
        errorResponse(res, 404, 'User not found');
        return;
      }

      successResponse(res, profile);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as Request & { user: { userId: string } }).user?.userId;
      
      if (!userId) {
        unauthorizedResponse(res);
        return;
      }

      const parsed = changePasswordSchema.parse(req.body);
      const result = await this.service.changePassword(userId, parsed.oldPassword, parsed.newPassword);

      if (!result) {
        badRequestResponse(res, 'Invalid old password');
        return;
      }

      successResponse(res, { success: true }, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
}