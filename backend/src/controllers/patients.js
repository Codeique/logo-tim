const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const { search, therapistId, isMilitary, active, page = 1, limit = 50 } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (therapistId) where.therapistId = parseInt(therapistId);
    if (isMilitary !== undefined) where.isMilitary = isMilitary === 'true';
    if (active !== undefined) where.isActive = active === 'true';

    // Therapist can only see their patients
    if (req.user.role === 'THERAPIST') {
      const therapist = await prisma.therapist.findUnique({ where: { userId: req.user.id } });
      if (therapist) where.therapistId = therapist.id;
    }
    // Patient can only see themselves
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (patient) where.id = patient.id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build date bounds for active-request filter.
    // Dates are stored as UTC midnight (new Date("YYYY-MM-DD") → T00:00:00.000Z).
    // Using new Date() directly for validUntil would mark any request expiring today
    // as inactive the moment the clock passes 00:00 UTC — compare against
    // start-of-today instead so the full calendar day is covered.
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          therapist: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { sessions: true } },
          militaryRequests: {
            where: {
              validFrom: { lte: now },
              validUntil: { gte: startOfToday },
            },
            orderBy: { validUntil: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ data: patients, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(id) },
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
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
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
        sessionPrice: data.sessionPrice || 0,
        isActive: data.isActive !== false,
        isMilitary: data.isMilitary || false,
        nationalId: data.nationalId,
        insuranceHolder: data.insuranceHolder,
        medicalFileNumber: data.medicalFileNumber,
        militaryPost: data.militaryPost,
        therapistId: data.therapistId ? parseInt(data.therapistId) : null,
      },
      include: { therapist: { select: { id: true, firstName: true, lastName: true } } },
    });
    emitEvent('patients:updated', { action: 'created', patient });
    res.status(201).json(patient);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const old = await prisma.patient.findUnique({ where: { id: parseInt(id) } });
    const patient = await prisma.patient.update({
      where: { id: parseInt(id) },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        nickname: data.nickname,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        phone: data.phone,
        diagnosis: data.diagnosis,
        notes: data.notes,
        sessionPrice: data.sessionPrice !== undefined ? data.sessionPrice : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        isMilitary: data.isMilitary !== undefined ? data.isMilitary : undefined,
        nationalId: data.nationalId,
        insuranceHolder: data.insuranceHolder,
        medicalFileNumber: data.medicalFileNumber,
        militaryPost: data.militaryPost,
        therapistId: data.therapistId !== undefined ? (data.therapistId ? parseInt(data.therapistId) : null) : undefined,
      },
      include: { therapist: { select: { id: true, firstName: true, lastName: true } } },
    });
    // Audit log
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE',
          entity: 'Patient',
          entityId: parseInt(id),
          oldValue: old,
          newValue: patient,
        },
      });
    }
    emitEvent('patients:updated', { action: 'updated', patient });
    res.json(patient);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.patient.update({ where: { id: parseInt(id) }, data: { isActive: false } });
    emitEvent('patients:updated', { action: 'deleted', id: parseInt(id) });
    res.json({ message: 'Patient deactivated' });
  } catch (err) { next(err); }
};
