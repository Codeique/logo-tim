import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { isTherapistRole } from '../../lib/roles';
import { getTherapistId } from '../../lib/profileCache';
import { parsePagination } from '../../lib/pagination';

interface EvaluationQuery {
  patientId?: string;
  page?: string;
  limit?: string;
}

interface EvaluationCreateBody {
  patientId: number | string;
  date: string;
  content: string;
  therapyProposal?: string;
}

interface EvaluationUpdateBody {
  date?: string;
  content?: string;
  therapyProposal?: string;
}

export const list = async (req: Request<{}, {}, {}, EvaluationQuery>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId } = req.query;
    const { skip, take, page, limit } = parsePagination(req.query);
    const where: Prisma.EvaluationWhereInput = patientId ? { patientId: parseInt(patientId) } : {};

    // SEC-05: scope THERAPIST/CHIEF_THERAPIST to their own patients' evaluations
    if (isTherapistRole(req.user.role)) {
      const tId = await getTherapistId(req.user.id);
      if (tId) where.patient = { primaryTherapistId: tId };
    }

    const [evaluations, total] = await Promise.all([
      prisma.evaluation.findMany({
        where,
        skip,
        take,
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.evaluation.count({ where }),
    ]);
    res.json({ data: evaluations, total, page, limit });
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, EvaluationCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, date, content, therapyProposal } = req.body;

    // SEC-05: THERAPIST can only create evaluations for their own patients
    if (isTherapistRole(req.user.role)) {
      const [tId, patient] = await Promise.all([
        getTherapistId(req.user.id),
        prisma.patient.findUnique({ where: { id: parseInt(String(patientId)) }, select: { primaryTherapistId: true } }),
      ]);
      if (!tId || !patient || patient.primaryTherapistId !== tId) {
        res.status(403).json({ message: 'Forbidden' }); return;
      }
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        patientId: parseInt(String(patientId)),
        date: new Date(date),
        content,
        therapyProposal,
      },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    emitEvent('evaluations:updated', { action: 'created', evaluation });
    res.status(201).json(evaluation);
  } catch (err) { next(err); }
};

export const update = async (req: Request<{ id: string }, {}, EvaluationUpdateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { date, content, therapyProposal } = req.body;

    // SEC-05: THERAPIST can only update evaluations for their own patients
    if (isTherapistRole(req.user.role)) {
      const [tId, existing] = await Promise.all([
        getTherapistId(req.user.id),
        prisma.evaluation.findUnique({
          where: { id: parseInt(req.params.id) },
          select: { patient: { select: { primaryTherapistId: true } } },
        }),
      ]);
      if (!tId || !existing || existing.patient.primaryTherapistId !== tId) {
        res.status(403).json({ message: 'Forbidden' }); return;
      }
    }

    const evaluation = await prisma.evaluation.update({
      where: { id: parseInt(req.params.id) },
      data: {
        date: date ? new Date(date) : undefined,
        content,
        therapyProposal,
      },
    });
    emitEvent('evaluations:updated', { action: 'updated', evaluation });
    res.json(evaluation);
  } catch (err) { next(err); }
};

export const remove = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.evaluation.delete({ where: { id: parseInt(req.params.id) } });
    emitEvent('evaluations:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Evaluation deleted' });
  } catch (err) { next(err); }
};
