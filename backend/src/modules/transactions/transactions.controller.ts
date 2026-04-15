import { Request, Response, NextFunction } from 'express';
import { Prisma, Role, TransactionType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { isTherapistRole } from '../../lib/roles';
import { emitEvent } from '../../socket';
import { applyPayment } from './transactions.service';
import logger from '../../lib/logger';
import { getTherapistId, getPatientId } from '../../lib/profileCache';
import { parsePagination } from '../../lib/pagination';

interface TransactionListQuery {
  dateFrom?: string;
  dateTo?: string;
  type?: TransactionType;
  patientId?: string;
  search?: string;
  page?: string;
  limit?: string;
}

interface TransactionCreateBody {
  patientId: number | string;
  amount: number | string;
  type?: TransactionType;
  note?: string;
}

export const list = async (req: Request<{}, {}, {}, TransactionListQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo, type, patientId, search } = req.query;
    const { skip, take } = parsePagination(req.query);
    const where: Prisma.TransactionWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
      };
    }
    if (type) where.type = type;
    if (patientId) where.patientId = parseInt(patientId);
    if (search) {
      where.patient = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    // SEC-06: scope THERAPIST/CHIEF_THERAPIST to their own patients' transactions
    if (isTherapistRole(req.user.role)) {
      const tId = await getTherapistId(req.user.id);
      if (tId) where.patient = { therapistId: tId };
    }
    if (req.user.role === Role.PATIENT) {
      const pId = await getPatientId(req.user.id);
      if (pId) where.patientId = pId;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ data: transactions, total });
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, TransactionCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, amount, type, note } = req.body;
    const { transaction, updatedPatient } = await applyPayment({
      patientId,
      amount,
      type,
      createdById: req.user.id,
      note,
    });
    logger.info('Payment applied', { patientId: transaction.patientId, amount: transaction.amount, type: transaction.type, newBalance: updatedPatient.accountBalance });
    emitEvent('transactions:updated', { action: 'created', transaction });
    emitEvent('patients:updated', { action: 'balanceChanged', patient: updatedPatient });
    res.status(201).json(transaction);
  } catch (err) { next(err); }
};
