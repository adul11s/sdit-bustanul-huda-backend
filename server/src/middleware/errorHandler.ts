import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

export const auditLogger = (action: string, entity: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.userId) {
        prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            action,
            entity,
            entityId: req.params.id || body?.id,
            details: { body: req.body, params: req.params },
            ipAddress: req.ip,
          },
        }).catch(console.error);
      }
      return originalSend.call(this, body);
    };
    
    next();
  };
};

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err.message);
  
  prisma.auditLog.create({
    data: {
      userId: req.user?.userId || 'system',
      action: 'ERROR',
      entity: 'SYSTEM',
      details: { error: err.message, stack: err.stack },
      ipAddress: req.ip,
    },
  }).catch(console.error);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
}