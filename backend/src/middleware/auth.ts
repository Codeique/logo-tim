import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import env from '../config/env';
import logger from '../lib/logger';

interface AccessTokenPayload {
  userId: number;
  role: Role;
}

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Auth failure', { ip: req.ip, path: req.path, reason: 'no token', requestId: req.requestId });
    res.status(401).json({ message: 'No token provided' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch {
    logger.warn('Auth failure', { ip: req.ip, path: req.path, reason: 'invalid or expired token', requestId: req.requestId });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: Role[]): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    next();
  };
