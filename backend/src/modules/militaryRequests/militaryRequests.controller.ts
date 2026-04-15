import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { computeStatus } from './militaryRequests.service';

interface MilitaryRequestQuery {
  patientId?: string;
}

interface MilitaryRequestCreateBody {
  patientId: number | string;
  requestNumber: string;
  totalSessions?: number | string;
  usedSessions?: number | string;
  validFrom: string;
  validUntil: string;
  note?: string;
}

interface MilitaryRequestUpdateBody {
  requestNumber?: string;
  totalSessions?: number | string;
  usedSessions?: number | string;
  validFrom?: string;
  validUntil?: string;
  note?: string;
}

export const list = async (req: Request<{}, {}, {}, MilitaryRequestQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId } = req.query;
    const where: { patientId?: number } = patientId ? { patientId: parseInt(patientId) } : {};
    if (req.user.role === Role.PATIENT) {
      const p = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (p) where.patientId = p.id;
    }
    const records = await prisma.militaryRequest.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // BUG-08: stored status is stale; compute on every read
    const requests = records.map(r => ({ ...r, status: computeStatus(r.validFrom, r.validUntil) }));
    res.json(requests);
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, MilitaryRequestCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, requestNumber, totalSessions, usedSessions, validFrom, validUntil, note } = req.body;
    const status = computeStatus(new Date(validFrom), new Date(validUntil));
    const request = await prisma.militaryRequest.create({
      data: {
        patientId: parseInt(String(patientId)),
        requestNumber,
        status,
        totalSessions: totalSessions ? parseInt(String(totalSessions)) : 0,
        usedSessions: usedSessions ? parseInt(String(usedSessions)) : 0,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        note,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    emitEvent('militaryRequests:updated', { action: 'created', request });
    res.status(201).json(request);
  } catch (err) { next(err); }
};

export const update = async (req: Request<{ id: string }, {}, MilitaryRequestUpdateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { requestNumber, totalSessions, usedSessions, validFrom, validUntil, note } = req.body;

    let statusUpdate: { status?: ReturnType<typeof computeStatus> } = {};
    if (validFrom !== undefined || validUntil !== undefined) {
      const existing = await prisma.militaryRequest.findUnique({ where: { id: parseInt(id) } });
      if (!existing) { res.status(404).json({ message: 'Military request not found' }); return; }
      const from = validFrom ? new Date(validFrom) : existing.validFrom;
      const until = validUntil ? new Date(validUntil) : existing.validUntil;
      statusUpdate = { status: computeStatus(from, until) };
    }

    const request = await prisma.militaryRequest.update({
      where: { id: parseInt(id) },
      data: {
        requestNumber,
        ...statusUpdate,
        totalSessions: totalSessions !== undefined ? parseInt(String(totalSessions)) : undefined,
        usedSessions: usedSessions !== undefined ? parseInt(String(usedSessions)) : undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        note,
      },
    });
    emitEvent('militaryRequests:updated', { action: 'updated', request });
    res.json(request);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.militaryRequest.delete({ where: { id: parseInt(req.params.id) } });
    emitEvent('militaryRequests:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Request deleted' });
  } catch (err) { next(err); }
};
