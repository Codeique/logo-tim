import { Request, Response, NextFunction } from 'express';
import { Prisma, Role, SessionStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { isTherapistRole } from '../../lib/roles';
import { checkRoomConflict, checkTherapistConflict, completeSession, adjustPatientBalance } from './sessions.service';
import logger from '../../lib/logger';
import { getTherapistId, getPatientId } from '../../lib/profileCache';

interface SessionListQuery {
  dateFrom?: string;
  dateTo?: string;
  therapistId?: string;
  patientId?: string;
  roomId?: string;
  status?: string;
  page?: string;
  limit?: string;
}

interface SessionCreateBody {
  patientId: number | string;
  therapistId: number | string;
  roomId?: number | string;
  date: string;
  startTime: string;
  duration: number | string;
  treatmentType?: string;
  status?: SessionStatus;
}

interface SessionUpdateBody extends Partial<SessionCreateBody> {
  isPaid?: boolean;
  report?: string;
}

export const listTreatmentTypes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await prisma.session.findMany({
      where: { treatmentType: { not: null } },
      select: { treatmentType: true },
      distinct: ['treatmentType'],
      orderBy: { treatmentType: 'asc' },
    });
    res.json(rows.map(r => r.treatmentType).filter(Boolean));
  } catch (err) { next(err); }
};

export const list = async (req: Request<{}, {}, {}, SessionListQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dateFrom, dateTo, therapistId, patientId, roomId, status, page = '1', limit = '100' } = req.query;
    // PERF-01: cap at 200 to prevent unbounded queries
    const take = Math.min(parseInt(limit, 10) || 100, 200);
    const skip = (Math.max(1, parseInt(page, 10) || 1) - 1) * take;
    const where: Prisma.SessionWhereInput = {};

    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lt: new Date(new Date(dateTo).getTime() + 86_400_000) }),
      };
    }
    if (therapistId) where.therapistId = parseInt(therapistId);
    if (patientId) where.patientId = parseInt(patientId);
    if (roomId) where.roomId = parseInt(roomId);
    if (status) where.status = status as SessionStatus;

    if (isTherapistRole(req.user.role)) {
      const tId = await getTherapistId(req.user.id);
      if (tId) {
        const therapist = await prisma.therapist.findUnique({
          where: { id: tId },
          select: { rooms: { select: { id: true } } },
        });
        const roomIds = (therapist?.rooms ?? []).map(r => r.id);
        if (roomIds.length > 0) {
          where.roomId = { in: roomIds };
        } else {
          where.therapistId = tId;
        }
      }
    }
    if (req.user.role === Role.PATIENT) {
      const pId = await getPatientId(req.user.id);
      if (pId) where.patientId = pId;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          therapist: { select: { id: true, firstName: true, lastName: true } },
          room: true,
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      }),
      prisma.session.count({ where }),
    ]);
    res.json({ data: sessions, total });
  } catch (err) { next(err); }
};

export const getById = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { patient: true, therapist: true, room: true, finance: true },
    });
    if (!session) { res.status(404).json({ message: 'Session not found' }); return; }
    res.json(session);
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, SessionCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, therapistId, roomId, date, startTime, duration, treatmentType, status } = req.body;

    // Room authorization: therapists may only book rooms assigned to them
    if (roomId && isTherapistRole(req.user.role)) {
      const tId = await getTherapistId(req.user.id);
      if (tId) {
        const therapist = await prisma.therapist.findUnique({
          where: { id: tId },
          select: { rooms: { select: { id: true } } },
        });
        const assignedIds = (therapist?.rooms ?? []).map(r => r.id);
        if (!assignedIds.includes(parseInt(String(roomId)))) {
          res.status(403).json({ message: 'Niste ovlašćeni da zakažete termin u ovoj prostoriji' });
          return;
        }
      }
    }

    const [roomConflict, therapistConflict] = await Promise.all([
      checkRoomConflict(roomId, date, startTime, duration),
      checkTherapistConflict(therapistId, date, startTime, duration),
    ]);
    if (roomConflict) { res.status(409).json({ message: 'Room is already booked at this time' }); return; }
    if (therapistConflict) { res.status(409).json({ message: 'Therapist is already booked at this time' }); return; }

    const session = await prisma.session.create({
      data: {
        patientId: parseInt(String(patientId)),
        therapistId: parseInt(String(therapistId)),
        roomId: roomId ? parseInt(String(roomId)) : null,
        date: new Date(date),
        startTime,
        duration: parseInt(String(duration)),
        treatmentType,
        status: status ?? SessionStatus.SCHEDULED,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
        room: true,
      },
    });

    emitEvent('sessions:updated', { action: 'created', session });
    res.status(201).json(session);
  } catch (err) { next(err); }
};

export const update = async (req: Request<{ id: string }, {}, SessionUpdateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.id);
    const { patientId, therapistId, roomId, date, startTime, duration, treatmentType, status, isPaid, report } = req.body;

    // Room authorization: therapists may only set rooms assigned to them
    if (roomId && isTherapistRole(req.user.role)) {
      const tId = await getTherapistId(req.user.id);
      if (tId) {
        const therapist = await prisma.therapist.findUnique({
          where: { id: tId },
          select: { rooms: { select: { id: true } } },
        });
        const assignedIds = (therapist?.rooms ?? []).map(r => r.id);
        if (!assignedIds.includes(parseInt(String(roomId)))) {
          res.status(403).json({ message: 'Niste ovlašćeni da zakažete termin u ovoj prostoriji' });
          return;
        }
      }
    }

    if (date && startTime && duration && therapistId) {
      const [roomConflict, therapistConflict] = await Promise.all([
        checkRoomConflict(roomId, date, startTime, duration, sessionId),
        checkTherapistConflict(therapistId, date, startTime, duration, sessionId),
      ]);
      if (roomConflict) { res.status(409).json({ message: 'Room is already booked at this time' }); return; }
      if (therapistConflict) { res.status(409).json({ message: 'Therapist is already booked at this time' }); return; }
    }

    // If marking COMPLETED, delegate to service for atomic Finance + balance update
    if (status === SessionStatus.COMPLETED) {
      const existing = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { status: true, isPaid: true, balanceDeducted: true },
      });

      if (existing?.status === SessionStatus.COMPLETED) {
        // Already completed — skip re-completion; just update fields.
        // Handle isPaid transitions with balance adjustment inside a transaction.
        await prisma.$transaction(async (tx) => {
          const current = await tx.session.findUniqueOrThrow({
            where: { id: sessionId },
            select: { isPaid: true, balanceDeducted: true, patientId: true },
          });
          const patient = await tx.patient.findUniqueOrThrow({
            where: { id: current.patientId },
            select: { isMilitary: true, sessionPrice: true },
          });

          const paidChanging = isPaid !== undefined && isPaid !== current.isPaid;
          let newBalanceDeducted = current.balanceDeducted;

          if (!patient.isMilitary && paidChanging) {
            if (isPaid && !current.balanceDeducted) {
              // Transitioning unpaid → paid: deduct balance
              await adjustPatientBalance(tx, current.patientId, -patient.sessionPrice.toNumber());
              newBalanceDeducted = true;
            } else if (!isPaid && current.balanceDeducted) {
              // Transitioning paid → unpaid: roll back deduction
              await adjustPatientBalance(tx, current.patientId, patient.sessionPrice.toNumber());
              newBalanceDeducted = false;
            }
          }

          await tx.session.update({
            where: { id: sessionId },
            data: {
              patientId: patientId ? parseInt(String(patientId)) : undefined,
              therapistId: therapistId ? parseInt(String(therapistId)) : undefined,
              roomId: roomId !== undefined ? (roomId ? parseInt(String(roomId)) : null) : undefined,
              date: date ? new Date(date) : undefined,
              startTime: startTime || undefined,
              duration: duration ? parseInt(String(duration)) : undefined,
              treatmentType,
              isPaid,
              balanceDeducted: newBalanceDeducted,
              report,
            },
          });
        });

        const fullSession = await prisma.session.findUnique({
          where: { id: sessionId },
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
            therapist: { select: { id: true, firstName: true, lastName: true } },
            room: true,
          },
        });
        emitEvent('sessions:updated', { action: 'updated', session: fullSession });
        emitEvent('patients:updated', {});
        res.json(fullSession);
        return;
      }

      // First-time completion: pre-set non-payment fields, then delegate to service
      if (patientId || therapistId || roomId !== undefined || date || startTime || duration || treatmentType !== undefined || report !== undefined) {
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            patientId: patientId ? parseInt(String(patientId)) : undefined,
            therapistId: therapistId ? parseInt(String(therapistId)) : undefined,
            roomId: roomId !== undefined ? (roomId ? parseInt(String(roomId)) : null) : undefined,
            date: date ? new Date(date) : undefined,
            startTime: startTime || undefined,
            duration: duration ? parseInt(String(duration)) : undefined,
            treatmentType,
            report,
          },
        });
      }

      // isPaid falls back to the session's existing value if not provided in the request
      const effectivePaid = isPaid !== undefined ? isPaid : (existing?.isPaid ?? false);
      const completed = await completeSession(sessionId, effectivePaid);
      logger.info('Session completed', { sessionId, patientId: completed.session.patientId, therapistId: completed.session.therapistId });

      const fullSession = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          therapist: { select: { id: true, firstName: true, lastName: true } },
          room: true,
        },
      });
      emitEvent('sessions:updated', { action: 'updated', session: fullSession });
      emitEvent('finance:updated', {});
      emitEvent('patients:updated', {});
      res.json(fullSession);
      return;
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: {
        patientId: patientId ? parseInt(String(patientId)) : undefined,
        therapistId: therapistId ? parseInt(String(therapistId)) : undefined,
        roomId: roomId !== undefined ? (roomId ? parseInt(String(roomId)) : null) : undefined,
        date: date ? new Date(date) : undefined,
        startTime: startTime || undefined,
        duration: duration ? parseInt(String(duration)) : undefined,
        treatmentType,
        status,
        isPaid,
        report,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
        room: true,
      },
    });

    emitEvent('sessions:updated', { action: 'updated', session });
    res.json(session);
  } catch (err) { next(err); }
};

export const remove = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = parseInt(req.params.id);

    await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUniqueOrThrow({
        where: { id: sessionId },
        select: { balanceDeducted: true, patientId: true },
      });

      // If the session had its balance deducted, roll it back before canceling
      if (session.balanceDeducted) {
        const patient = await tx.patient.findUniqueOrThrow({
          where: { id: session.patientId },
          select: { isMilitary: true, sessionPrice: true },
        });
        if (!patient.isMilitary) {
          await adjustPatientBalance(tx, session.patientId, patient.sessionPrice.toNumber());
        }
      }

      await tx.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.CANCELED, balanceDeducted: false },
      });
    });

    emitEvent('sessions:updated', { action: 'canceled', id: sessionId });
    emitEvent('patients:updated', {});
    res.json({ message: 'Session canceled' });
  } catch (err) { next(err); }
};
