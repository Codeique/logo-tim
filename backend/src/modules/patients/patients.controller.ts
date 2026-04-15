import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { buildPatientWhereClause } from './patients.service';
import { parsePagination } from '../../lib/pagination';

interface PatientQuery {
  page?: string;
  limit?: string;
  search?: string;
  therapistId?: string;
  isMilitary?: string;
  active?: string;
}

interface PatientCreateBody {
  firstName: string;
  lastName: string;
  nickname?: string;
  birthDate?: string;
  phone?: string;
  diagnosis?: string;
  notes?: string;
  sessionPrice?: number;
  isActive?: boolean;
  isMilitary?: boolean;
  nationalId?: string;
  insuranceHolder?: string;
  medicalFileNumber?: string;
  militaryPost?: string;
  therapistId?: number | string;
}

interface PatientUpdateBody extends Partial<PatientCreateBody> {}

export const list = async (req: Request<{}, {}, {}, PatientQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { skip, take, page, limit } = parsePagination(req.query);
    const where = await buildPatientWhereClause(req.user, req.query);

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take,
        include: {
          therapist: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { sessions: true } },
          militaryRequests: {
            where: { validFrom: { lte: now }, validUntil: { gte: startOfToday } },
            orderBy: { validUntil: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ data: patients, total, page, limit });
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        therapist: { select: { id: true, firstName: true, lastName: true } },
        sessions: {
          include: { therapist: { select: { firstName: true, lastName: true } }, room: true },
          orderBy: { date: 'desc' },
        },
        transactions: {
          include: { createdBy: { select: { email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        evaluations: { orderBy: { date: 'desc' } },
        militaryRequests: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!patient) { res.status(404).json({ message: 'Patient not found' }); return; }
    res.json(patient);
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, PatientCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const patient = await prisma.patient.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        phone: data.phone,
        diagnosis: data.diagnosis,
        notes: data.notes,
        sessionPrice: data.sessionPrice ?? 0,
        isActive: data.isActive !== false,
        isMilitary: data.isMilitary ?? false,
        nationalId: data.nationalId,
        insuranceHolder: data.insuranceHolder,
        medicalFileNumber: data.medicalFileNumber,
        militaryPost: data.militaryPost,
        therapistId: data.therapistId ? parseInt(String(data.therapistId)) : null,
      },
      include: { therapist: { select: { id: true, firstName: true, lastName: true } } },
    });
    emitEvent('patients:updated', { action: 'created', patient });
    res.status(201).json(patient);
  } catch (err) { next(err); }
};

export const update = async (req: Request<{ id: string }, {}, PatientUpdateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    // DI-03: fetch old value before update, but audit log is written after update succeeds
    const old = await prisma.patient.findUnique({ where: { id: parseInt(id) } });
    if (!old) { res.status(404).json({ message: 'Patient not found' }); return; }
    const patient = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        phone: data.phone,
        diagnosis: data.diagnosis,
        notes: data.notes,
        sessionPrice: data.sessionPrice,
        isActive: data.isActive,
        isMilitary: data.isMilitary,
        nationalId: data.nationalId,
        insuranceHolder: data.insuranceHolder,
        medicalFileNumber: data.medicalFileNumber,
        militaryPost: data.militaryPost,
        therapistId: data.therapistId !== undefined
          ? (data.therapistId ? parseInt(String(data.therapistId)) : null)
          : undefined,
      },
      include: { therapist: { select: { id: true, firstName: true, lastName: true } } },
    });
    // Manual audit log — captures oldValue; do NOT add auditLog middleware to this route (BUG-06)
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE',
        entity: 'Patient',
        entityId: parseInt(id),
        oldValue: old as Prisma.InputJsonValue,
        newValue: patient as Prisma.InputJsonValue,
      },
    });
    emitEvent('patients:updated', { action: 'updated', patient });
    res.json(patient);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.patient.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    emitEvent('patients:updated', { action: 'deleted', id: parseInt(id) });
    res.json({ message: 'Patient deactivated' });
  } catch (err) { next(err); }
};
