import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { generateTokens } from '../../src/modules/auth/auth.service';

describe('generateTokens', () => {
  const userId = 42;

  it('returns accessToken and refreshToken', () => {
    const { accessToken, refreshToken } = generateTokens(userId, Role.ADMIN);
    expect(typeof accessToken).toBe('string');
    expect(typeof refreshToken).toBe('string');
  });

  it('accessToken payload contains userId and role', () => {
    const { accessToken } = generateTokens(userId, Role.THERAPIST);
    const decoded = jwt.decode(accessToken) as Record<string, unknown>;
    expect(decoded.userId).toBe(userId);
    expect(decoded.role).toBe(Role.THERAPIST);
  });

  it('accessToken expires in ~15 minutes', () => {
    const { accessToken } = generateTokens(userId, Role.ADMIN);
    const decoded = jwt.decode(accessToken) as { iat: number; exp: number };
    const ttlSeconds = decoded.exp - decoded.iat;
    expect(ttlSeconds).toBe(15 * 60);
  });

  it('refreshToken payload contains only userId (no role)', () => {
    const { refreshToken } = generateTokens(userId, Role.PATIENT);
    const decoded = jwt.decode(refreshToken) as Record<string, unknown>;
    expect(decoded.userId).toBe(userId);
    expect(decoded.role).toBeUndefined();
  });

  it('refreshToken expires in 7 days', () => {
    const { refreshToken } = generateTokens(userId, Role.ADMIN);
    const decoded = jwt.decode(refreshToken) as { iat: number; exp: number };
    const ttlSeconds = decoded.exp - decoded.iat;
    expect(ttlSeconds).toBe(7 * 24 * 60 * 60);
  });

  it('produces different tokens for different userIds', () => {
    const a = generateTokens(1, Role.ADMIN);
    const b = generateTokens(2, Role.ADMIN);
    expect(a.accessToken).not.toBe(b.accessToken);
  });
});
