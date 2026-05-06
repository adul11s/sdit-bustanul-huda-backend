import type { Response } from 'express';
import type { ApiResponse } from '../types/index.js';

export function successResponse<T>(res: Response, data: T, message?: string): Response {
  return res.json({
    success: true,
    data,
    message,
  } as ApiResponse<T>);
}

export function errorResponse(
  res: Response,
  statusCode: number,
  error: string,
  message?: string
): Response {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
  } as ApiResponse);
}

export function createdResponse<T>(res: Response, data: T): Response {
  return res.status(201).json({
    success: true,
    data,
  } as ApiResponse<T>);
}

export function notFoundResponse(res: Response, message: string): Response {
  return errorResponse(res, 404, message);
}

export function unauthorizedResponse(res: Response, message = 'Unauthorized'): Response {
  return errorResponse(res, 401, message);
}

export function forbiddenResponse(res: Response, message = 'Forbidden'): Response {
  return errorResponse(res, 403, message);
}

export function badRequestResponse(res: Response, error: string): Response {
  return errorResponse(res, 400, error);
}

export function validationErrorResponse(res: Response, error: string): Response {
  return errorResponse(res, 422, error);
}

export function internalServerErrorResponse(res: Response, message = 'Internal server error'): Response {
  return errorResponse(res, 500, message);
}