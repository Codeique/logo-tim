import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { generateTokens, hashToken, verifyToken } from './auth.service';
import env from '../../config/env';

type LoginBody = { email: string; password: string };

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

export const login = async (req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { therapist: true, patient: true },
    });
    if (!user || !await bcrypt.compare(password, user.password)) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(refreshToken) } });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        therapist: user.therapist,
        patient: user.patient,
      },
    });
  } catch (err) { next(err); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) { res.status(401).json({ message: 'Refresh token required' }); return; }

  let decoded: { userId: number };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: number };
  } catch {
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.status(401).json({ message: 'Invalid refresh token' }); return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { therapist: true, patient: true },
    });
    if (!user || !user.refreshToken || !verifyToken(refreshToken, user.refreshToken)) {
      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      res.status(401).json({ message: 'Invalid refresh token' }); return;
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(newRefreshToken) } });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        therapist: user.therapist,
        patient: user.patient,
      },
    });
  } catch (err) { next(err); }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { therapist: true, patient: true },
    });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      therapist: user.therapist,
      patient: user.patient,
    });
  } catch (err) { next(err); }
};
