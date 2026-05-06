/**
 * Security sanitization helpers
 * NEVER expose sensitive fields in API responses
 */

const SENSITIVE_USER_FIELDS = ['password', 'email', 'phone', 'address', 'birthDate', 'birthPlace'];

export function sanitizeUser(user: any): any {
  if (!user) return user;
  const sanitized = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) {
    delete sanitized[field];
  }
  return sanitized;
}

export function sanitizeUsers(users: any[]): any[] {
  return users.map(sanitizeUser);
}

export function stripPasswordFromObject(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripPasswordFromObject);
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'password') continue;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = stripPasswordFromObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(stripPasswordFromObject);
    } else {
      result[key] = value;
    }
  }
  return result;
}
