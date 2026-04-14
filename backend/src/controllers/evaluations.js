const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const { patientId } = req.query;
    const where = patientId ? { patientId: parseInt(patientId) } : {};
    const evaluations = await prisma.evaluation.findMany({
      where,
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(evaluations);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { patientId, date, content, therapyProposal } = req.body;
    const evaluation = await prisma.evaluation.create({
      data: {
        patientId: parseInt(patientId),
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

exports.update = async (req, res, next) => {
  try {
    const { date, content, therapyProposal } = req.body;
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

exports.remove = async (req, res, next) => {
  try {
    await prisma.evaluation.delete({ where: { id: parseInt(req.params.id) } });
    emitEvent('evaluations:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Evaluation deleted' });
  } catch (err) { next(err); }
};
