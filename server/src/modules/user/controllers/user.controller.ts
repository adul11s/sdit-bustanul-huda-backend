import { Request, Response, NextFunction } from 'express';
import type { IUserService } from '../interfaces/user.service.interface.js';
import type { CreateUserDto, UpdateUserDto, UserFilterDto, UserIdDto } from '../dtos/user.dto.js';
import { successResponse, errorResponse, createdResponse, notFoundResponse, badRequestResponse, validationErrorResponse } from '../../../../core/utils/response.js';
import { createUserSchema, updateUserSchema, userFilterSchema, userIdSchema } from '../dtos/user.dto.js';

export class UserController {
  constructor(private readonly service: IUserService) {}

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = userFilterSchema.parse(req.query);
      const result = await this.service.findAll(parsed);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = userIdSchema.parse(req.params);
      const user = await this.service.findById(id);
      
      if (!user) {
        notFoundResponse(res, 'User not found');
        return;
      }
      
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createUserSchema.parse(req.body);
      const user = await this.service.create(parsed);
      createdResponse(res, user);
    } catch (error) {
      if (error?.name === 'ZodError') {
        validationErrorResponse(res, 'Invalid data');
        return;
      }
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = userIdSchema.parse(req.params);
      const parsed = updateUserSchema.parse(req.body);
      const user = await this.service.update(id, parsed);
      
      if (!user) {
        notFoundResponse(res, 'User not found');
        return;
      }
      
      successResponse(res, user);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = userIdSchema.parse(req.params);
      await this.service.delete(id);
      successResponse(res, { success: true }, 'User deactivated');
    } catch (error) {
      next(error);
    }
  }

  async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = userIdSchema.parse(req.params);
      await this.service.activate(id);
      successResponse(res, { success: true }, 'User activated');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await this.service.getStats();
      successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}