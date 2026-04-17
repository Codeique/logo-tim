import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { isTherapistRole } from '../../lib/roles';
import { parsePagination } from '../../lib/pagination';
import { getTherapistId } from '../../lib/profileCache';

interface FinanceQuery {
  dateFrom?: string;
  dateTo?: string;
  therapistId?: string;
  page?: string;
  limit?: string;
}

export const list = async (req: Request<{}, {}, {}, FinanceQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo, therapistId } = req.query;
    const where: Prisma.FinanceWhereInput = {};

    if (dateFrom || dateTo) {
      where.session = {
        date: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      };
    }
    if (therapistId) where.therapistId = parseInt(therapistId);
    if (isTherapistRole(req.user.role)) {
      const tId = await getTherapistId(req.user.id);
      if (tId) where.therapistId = tId;
    }

    const { skip, take } = parsePagination(req.query);
    const [records, total, totals] = await Promise.all([
      prisma.finance.findMany({
        where,
        skip,
        take,
        include: {
          session: {
            include: { patient: { select: { firstName: true, lastName: true } } },
          },
          therapist: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.finance.count({ where }),
      prisma.finance.aggregate({ where, _sum: { therapistEarning: true, companyIncome: true } }),
    ]);

    res.json({ data: records, total, totals: totals._sum });
  } catch (err) { next(err); }
};
