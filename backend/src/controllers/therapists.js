const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'THERAPIST') {
      where.userId = req.user.id;
    }
    const therapists = await prisma.therapist.findMany({
      where,
      include: {
        rooms: true,
        user: { select: { email: true, role: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { firstName: 'asc' },
    });
    res.json(therapists);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const therapist = await prisma.therapist.findUnique({
      where: { id: parseInt(req.params.id) },
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
    if (!therapist) return res.status(404).json({ message: 'Therapist not found' });
    res.json(therapist);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, hourlyRate, roomIds, role } = req.body;
    const hashed = await bcrypt.hash(password || '123456', 12);
    const therapist = await prisma.therapist.create({
      data: {
        firstName,
        lastName,
        email,
        hourlyRate: hourlyRate || 0,
        user: { create: { email, password: hashed, role: role || 'THERAPIST' } },
        rooms: roomIds ? { connect: roomIds.map(id => ({ id })) } : undefined,
      },
      include: { rooms: true, user: { select: { email: true, role: true } } },
    });
    emitEvent('therapists:updated', { action: 'created', therapist });
    res.status(201).json(therapist);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
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
        user: role !== undefined ? { update: { role } } : undefined,
      },
      include: { rooms: true, user: { select: { email: true, role: true } } },
    });
    emitEvent('therapists:updated', { action: 'updated', therapist });
    res.json(therapist);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.therapist.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    emitEvent('therapists:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Therapist deactivated' });
  } catch (err) { next(err); }
};
