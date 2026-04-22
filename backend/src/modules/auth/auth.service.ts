import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import env from '../../config/env';

export function generateTokens(userId: number, role: Role): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

/** SHA-256 hash a raw token for storage (timing-safe). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
