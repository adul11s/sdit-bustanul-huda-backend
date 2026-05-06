import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma.js';

const SENSITIVE_FIELDS = ['password', 'oldPassword', 'newPassword', 'token'];

function sanitizeForAudit(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized: any = Array.isArray(body) ? [] : {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !(value instanceof Date)) {
      sanitized[key] = sanitizeForAudit(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function removeSensitive(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const result: any = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)) {
    if (!SENSITIVE_FIELDS.includes(key)) {
      result[key] = value;
    }
  }
  return result;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'SOFT_DELETE' | 'RESTORE' | 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'STATUS_CHANGE';

/**
 * Enhanced audit logger that captures oldData/newData snapshots.
 * Attach to routes that modify data.
 *
 * Usage:
 *   router.post('/users', auditLog('CREATE', 'User'))
 *   router.put('/users/:id', auditLog('UPDATE', 'User', (req) => req.params.id))
 *   router.delete('/users/:id', auditLog('SOFT_DELETE', 'User', (req) => req.params.id))
 */
export function auditLog(
  action: AuditAction,
  entity: string,
  getEntityId?: (req: Request) => string | undefined,
  getEntity?: (req: Request) => any
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = async function (body: any) {
      res.json = originalJson;

      // Only log on success
      if (body?.success !== false) {
        const userId = (req as any).user?.userId || 'anonymous';
        const entityId = getEntityId ? getEntityId(req) : req.params.id;
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Capture old data for UPDATE/DELETE operations
        let oldData: any = null;
        if ((action === 'UPDATE' || action === 'SOFT_DELETE') && entityId && getEntity) {
          try {
            const current = getEntity(req);
            if (current) {
              oldData = removeSensitive(current);
            }
          } catch {
            // Ignore errors fetching old data
          }
        }

        // newData from request body for CREATE/UPDATE, or from response for DELETE
        const newData = action !== 'DELETE'
          ? sanitizeForAudit(req.body)
          : (body?.data ? removeSensitive(body.data) : null);

        // Fire-and-forget audit log
        prisma.auditLog
          .create({
            data: {
              userId,
              action,
              entity,
              entityId: entityId || null,
              oldData: oldData || undefined,
              newData: newData || undefined,
              ipAddress,
              userAgent,
              details: { method: req.method, path: req.path } as any,
            },
          })
          .catch(() => {});

        // If soft delete, also update the entity's isDeleted/deletedAt/deletedBy
        if (action === 'SOFT_DELETE' && entityId) {
          const modelName = entity.charAt(0).toUpperCase() + entity.slice(1).replace(/([A-Z])/g, '$1').toLowerCase();
          // Entity mapping handled in service layer
        }
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Compact audit log for read operations or simple tracking.
 * Does not capture oldData/newData snapshots.
 */
export function trackAction(action: AuditAction, entity: string, getEntityId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      res.json = originalJson;

      if (body?.success !== false) {
        const userId = (req as any).user?.userId || 'anonymous';
        const entityId = getEntityId ? getEntityId(req) : req.params.id;
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

        prisma.auditLog
          .create({
            data: {
              userId,
              action,
              entity,
              entityId: entityId || null,
              ipAddress,
              details: { method: req.method, path: req.path } as any,
            },
          })
          .catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
}
