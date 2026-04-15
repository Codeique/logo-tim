import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { isTherapistRole } from '../../lib/roles';

interface EvaluationQuery {
  patientId?: string;
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
    const where: Prisma.EvaluationWhereInput = patientId ? { patientId: parseInt(patientId) } : {};

    // SEC-05: scope THERAPIST/CHIEF_THERAPIST to their own patients' evaluations
    if (isTherapistRole(req.user.role)) {
      const t = await prisma.therapist.findUnique({ where: { userId: req.user.id } });
      if (t) where.patient = { therapistId: t.id };
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(evaluations);
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, EvaluationCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { patientId, date, content, therapyProposal } = req.body;

    // SEC-05: THERAPIST can only create evaluations for their own patients
    if (isTherapistRole(req.user.role)) {
      const t = await prisma.therapist.findUnique({ where: { userId: req.user.id } });
      const patient = await prisma.patient.findUnique({ where: { id: parseInt(String(patientId)) } });
      if (!t || !patient || patient.therapistId !== t.id) {
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
      const t = await prisma.therapist.findUnique({ where: { userId: req.user.id } });
      const existing = await prisma.evaluation.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { patient: { select: { therapistId: true } } },
      });
      if (!t || !existing || existing.patient.therapistId !== t.id) {
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

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.evaluation.delete({ where: { id: parseInt(req.params.id) } });
    emitEvent('evaluations:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Evaluation deleted' });
  } catch (err) { next(err); }
};
