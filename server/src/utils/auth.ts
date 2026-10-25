import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import type { Role } from '../types/index.js';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nuris-school-management-secret-key'
);

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export async function generateToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}