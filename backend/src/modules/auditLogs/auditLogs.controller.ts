import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { parsePagination } from '../../lib/pagination';

interface AuditLogQuery {
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
}

export const list = async (req: Request<{}, {}, {}, AuditLogQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { entity, userId, dateFrom, dateTo } = req.query;
    const { skip, take } = parsePagination(req.query);

    const where: Prisma.AuditLogWhereInput = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = parseInt(userId);
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
      };
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: { user: { select: { email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data: logs, total });
  } catch (err) { next(err); }
};
