import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { generateTokens, hashToken, verifyToken } from './auth.service';
import env from '../../config/env';

type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };

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
    res.json({
      accessToken,
      refreshToken,
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

export const refresh = async (req: Request<{}, {}, RefreshBody>, res: Response, next: NextFunction): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) { res.status(401).json({ message: 'Refresh token required' }); return; }
  let decoded: { userId: number };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: number };
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' }); return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.refreshToken || !verifyToken(refreshToken, user.refreshToken)) {
      res.status(401).json({ message: 'Invalid refresh token' }); return;
    }
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashToken(newRefreshToken) } });
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) { next(err); }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
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
