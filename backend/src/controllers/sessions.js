const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

const checkConflict = async (roomId, date, startTime, duration, excludeId = null) => {
  if (!roomId) return false;
  const sessionDate = new Date(date);
  const sessions = await prisma.session.findMany({
    where: {
      roomId: parseInt(roomId),
      date: sessionDate,
      status: { not: 'CANCELED' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const [startH, startM] = startTime.split(':').map(Number);
  const newStart = startH * 60 + startM;
  const newEnd = newStart + parseInt(duration);

  for (const s of sessions) {
    const [sh, sm] = s.startTime.split(':').map(Number);
    const sStart = sh * 60 + sm;
    const sEnd = sStart + s.duration;
    if (newStart < sEnd && newEnd > sStart) return true;
  }
  return false;
};

exports.list = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, therapistId, patientId, roomId, status, page = 1, limit = 100 } = req.query;
    const where = {};
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    if (therapistId) where.therapistId = parseInt(therapistId);
    if (patientId) where.patientId = parseInt(patientId);
    if (roomId) where.roomId = parseInt(roomId);
    if (status) where.status = status;

    if (req.user.role === 'THERAPIST') {
      const t = await prisma.therapist.findUnique({ where: { userId: req.user.id } });
      if (t) where.therapistId = t.id;
    }
    if (req.user.role === 'PATIENT') {
      const p = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (p) where.patientId = p.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: parseInt(limit),
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

exports.getById = async (req, res, next) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        patient: true,
        therapist: true,
        room: true,
        finance: true,
      },
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId, therapistId, roomId, date, startTime, duration, treatmentType, status } = req.body;

    const hasConflict = await checkConflict(roomId, date, startTime, duration);
    if (hasConflict) {
      return res.status(409).json({ message: 'Room is already booked at this time' });
    }

    const session = await prisma.session.create({
      data: {
        patientId: parseInt(patientId),
        therapistId: parseInt(therapistId),
        roomId: roomId ? parseInt(roomId) : null,
        date: new Date(date),
        startTime,
        duration: parseInt(duration),
        treatmentType,
        status: status || 'SCHEDULED',
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

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { patientId, therapistId, roomId, date, startTime, duration, treatmentType, status, isPaid, report } = req.body;

    if (roomId && date && startTime && duration) {
      const hasConflict = await checkConflict(roomId, date, startTime, duration, parseInt(id));
      if (hasConflict) {
        return res.status(409).json({ message: 'Room is already booked at this time' });
      }
    }

    const session = await prisma.session.update({
      where: { id: parseInt(id) },
      data: {
        patientId: patientId ? parseInt(patientId) : undefined,
        therapistId: therapistId ? parseInt(therapistId) : undefined,
        roomId: roomId !== undefined ? (roomId ? parseInt(roomId) : null) : undefined,
        date: date ? new Date(date) : undefined,
        startTime,
        duration: duration ? parseInt(duration) : undefined,
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

    // If completed, create/update finance record
    if (status === 'COMPLETED') {
      const therapist = await prisma.therapist.findUnique({ where: { id: session.therapistId } });
      const patient = await prisma.patient.findUnique({ where: { id: session.patientId } });
      const durationHours = session.duration / 60;
      const therapistEarning = parseFloat(therapist.hourlyRate) * durationHours;
      const companyIncome = parseFloat(patient.sessionPrice) - therapistEarning;

      await prisma.finance.upsert({
        where: { sessionId: parseInt(id) },
        create: {
          sessionId: parseInt(id),
          therapistId: session.therapistId,
          therapistEarning,
          companyIncome: companyIncome > 0 ? companyIncome : 0,
        },
        update: {
          therapistEarning,
          companyIncome: companyIncome > 0 ? companyIncome : 0,
        },
      });
      emitEvent('finance:updated', {});
    }

    emitEvent('sessions:updated', { action: 'updated', session });
    res.json(session);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.session.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'CANCELED' },
    });
    emitEvent('sessions:updated', { action: 'canceled', id: parseInt(req.params.id) });
    res.json({ message: 'Session canceled' });
  } catch (err) { next(err); }
};
