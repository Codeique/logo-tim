const { PrismaClient } = require('@prisma/client');
const { emitEvent } = require('../socket');
const prisma = new PrismaClient();

exports.list = async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
    res.json(rooms);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const room = await prisma.room.create({ data: { name: req.body.name } });
    emitEvent('rooms:updated', { action: 'created', room });
    res.status(201).json(room);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name, isActive: req.body.isActive },
    });
    emitEvent('rooms:updated', { action: 'updated', room });
    res.json(room);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await prisma.room.delete({ where: { id: parseInt(req.params.id) } });
    emitEvent('rooms:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Room deleted' });
  } catch (err) { next(err); }
};
