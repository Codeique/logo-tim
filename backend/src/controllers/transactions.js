const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, type, patientId, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
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
    if (req.user.role === 'PATIENT') {
      const p = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (p) where.patientId = p.id;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: parseInt(limit),
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

exports.create = async (req, res, next) => {
  try {
    const { patientId, amount, type, note } = req.body;
    const parsedAmount = parseFloat(amount);
    const parsedPatientId = parseInt(patientId);

    const transaction = await prisma.transaction.create({
      data: {
        patientId: parsedPatientId,
        amount: parsedAmount,
        type: type || 'PAYMENT',
        note,
        createdById: req.user.id,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { email: true } },
      },
    });

    // Update patient balance
    const patientRecord = await prisma.patient.findUnique({
      where: { id: parsedPatientId },
      select: { sessionPrice: true },
    });

    const sessionPriceVal = parseFloat(patientRecord.sessionPrice) || 1;
    const delta = type === 'REFUND' ? -parsedAmount : parsedAmount;
    const sessionsDelta = type === 'PAYMENT' ? Math.floor(parsedAmount / sessionPriceVal) : 0;

    const updatedPatient = await prisma.patient.update({
      where: { id: parsedPatientId },
      data: {
        accountBalance: { increment: delta },
        ...(sessionsDelta > 0 ? { remainingSessions: { increment: sessionsDelta } } : {}),
      },
    });

    emitEvent('transactions:updated', { action: 'created', transaction });
    emitEvent('patients:updated', { action: 'balanceChanged', patient: updatedPatient });
    res.status(201).json(transaction);
  } catch (err) { next(err); }
};
