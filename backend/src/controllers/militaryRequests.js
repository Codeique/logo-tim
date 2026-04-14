const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

/**
 * Compute request status from dates.
 * ACTIVE  – today is within [validFrom, validUntil]
 * EXPIRED – today is outside that range
 */
function computeStatus(validFrom, validUntil) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(validFrom);
  from.setHours(0, 0, 0, 0);
  const until = new Date(validUntil);
  until.setHours(0, 0, 0, 0);
  return today >= from && today <= until ? 'ACTIVE' : 'EXPIRED';
}

exports.list = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    const where = patientId ? { patientId: parseInt(patientId) } : {};
    if (req.user.role === 'PATIENT') {
      const p = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (p) where.patientId = p.id;
    }
    const requests = await prisma.militaryRequest.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId, requestNumber, totalSessions, usedSessions, validFrom, validUntil, note } = req.body;
    const status = computeStatus(validFrom, validUntil);
    const request = await prisma.militaryRequest.create({
      data: {
        patientId: parseInt(patientId),
        requestNumber,
        status,
        totalSessions: parseInt(totalSessions) || 0,
        usedSessions: parseInt(usedSessions) || 0,
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

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { requestNumber, totalSessions, usedSessions, validFrom, validUntil, note } = req.body;

    // Recompute status from the new dates (fall back to existing dates if not provided)
    let statusUpdate = {};
    if (validFrom !== undefined || validUntil !== undefined) {
      const existing = await prisma.militaryRequest.findUnique({ where: { id: parseInt(id) } });
      const from = validFrom ?? existing.validFrom.toISOString();
      const until = validUntil ?? existing.validUntil.toISOString();
      statusUpdate = { status: computeStatus(from, until) };
    }

    const request = await prisma.militaryRequest.update({
      where: { id: parseInt(id) },
      data: {
        requestNumber,
        ...statusUpdate,
        totalSessions: totalSessions !== undefined ? parseInt(totalSessions) : undefined,
        usedSessions: usedSessions !== undefined ? parseInt(usedSessions) : undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        note,
      },
    });
    emitEvent('militaryRequests:updated', { action: 'updated', request });
    res.json(request);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.militaryRequest.delete({ where: { id: parseInt(req.params.id) } });
    emitEvent('militaryRequests:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Request deleted' });
  } catch (err) { next(err); }
};
