import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { getCachedTherapists, invalidateTherapistCache } from '../../lib/listCache';

interface TherapistCreateBody {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  hourlyRate?: number;
  roomIds?: number[];
  role?: Role;
}

interface TherapistUpdateBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  hourlyRate?: number;
  roomIds?: number[];
  isActive?: boolean;
  role?: Role;
}

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // THERAPIST role: show only self (no cache — personalised result)
    if (req.user.role === Role.THERAPIST) {
      const therapists = await prisma.therapist.findMany({
        where: { userId: req.user.id, deletedAt: null },
        include: {
          rooms: true,
          user: { select: { email: true, role: true } },
          _count: { select: { sessions: true } },
        },
        orderBy: { firstName: 'asc' },
      });
      res.json(therapists);
      return;
    }
    // ADMIN / CHIEF_THERAPIST: cached list of all active therapists
    const therapists = await getCachedTherapists();
    res.json(therapists);
  } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const therapist = await prisma.therapist.findFirst({
      where: { id: parseInt(req.params.id), deletedAt: null },
      include: {
        rooms: true,
        user: { select: { email: true, role: true } },
        sessions: {
          include: { patient: { select: { firstName: true, lastName: true } }, room: true },
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });
    if (!therapist) { res.status(404).json({ message: 'Therapist not found' }); return; }
    res.json(therapist);
  } catch (err) { next(err); }
};

export const create = async (req: Request<{}, {}, TherapistCreateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, email, password, hourlyRate, roomIds, role } = req.body;
    const hashed = await bcrypt.hash(password || '123456', 12);
    const therapist = await prisma.therapist.create({
      data: {
        firstName,
        lastName,
        email,
        hourlyRate: hourlyRate ?? 0,
        user: { create: { email, password: hashed, role: role ?? Role.THERAPIST } },
        rooms: roomIds ? { connect: roomIds.map(id => ({ id })) } : undefined,
      },
      include: { rooms: true, user: { select: { email: true, role: true } } },
    });
    invalidateTherapistCache();
    emitEvent('therapists:updated', { action: 'created', therapist });
    res.status(201).json(therapist);
  } catch (err) { next(err); }
};

export const update = async (req: Request<{ id: string }, {}, TherapistUpdateBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, hourlyRate, roomIds, isActive, role } = req.body;
    const therapist = await prisma.therapist.update({
      where: { id: parseInt(id) },
      data: {
        firstName,
        lastName,
        email,
        hourlyRate,
        isActive,
        rooms: roomIds ? { set: roomIds.map(i => ({ id: i })) } : undefined,
        // Sync User.email and role when updating (fixes BUG-11)
        user: (email !== undefined || role !== undefined)
          ? { update: { ...(email !== undefined && { email }), ...(role !== undefined && { role }) } }
          : undefined,
      },
      include: { rooms: true, user: { select: { email: true, role: true } } },
    });
    invalidateTherapistCache();
    emitEvent('therapists:updated', { action: 'updated', therapist });
    res.json(therapist);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const therapistId = parseInt(req.params.id);
    const now = new Date();
    const therapist = await prisma.therapist.findFirst({ where: { id: therapistId, deletedAt: null }, select: { userId: true } });
    if (!therapist) { res.status(404).json({ message: 'Therapist not found' }); return; }
    await prisma.$transaction([
      prisma.therapist.update({ where: { id: therapistId }, data: { deletedAt: now, isActive: false } }),
      prisma.user.update({ where: { id: therapist.userId }, data: { deletedAt: now } }),
      prisma.userToken.deleteMany({ where: { userId: therapist.userId } }),
    ]);
    invalidateTherapistCache();
    emitEvent('therapists:updated', { action: 'deleted', id: therapistId });
    res.json({ message: 'Therapist deleted' });
  } catch (err) { next(err); }
};
