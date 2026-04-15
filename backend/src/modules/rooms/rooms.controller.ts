import { Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { emitEvent } from '../../socket';
import { getCachedRooms, invalidateRoomCache } from '../../lib/listCache';

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rooms = await getCachedRooms();
    res.json(rooms);
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await prisma.room.create({ data: { name: req.body.name as string } });
    invalidateRoomCache();
    emitEvent('rooms:updated', { action: 'created', room });
    res.status(201).json(room);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id) },
      data: { name: req.body.name as string | undefined, isActive: req.body.isActive as boolean | undefined },
    });
    invalidateRoomCache();
    emitEvent('rooms:updated', { action: 'updated', room });
    res.json(room);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Soft-delete (BUG-09 fix): avoids FK constraint errors from sessions referencing this room
    await prisma.room.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    invalidateRoomCache();
    emitEvent('rooms:updated', { action: 'deleted', id: parseInt(req.params.id) });
    res.json({ message: 'Room deactivated' });
  } catch (err) { next(err); }
};
