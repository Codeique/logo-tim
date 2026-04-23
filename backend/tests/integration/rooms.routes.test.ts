import request from 'supertest';
import { Role } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildTestApp } from '../__helpers__/app';
import { makeRoom } from '../__helpers__/factories';

jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn().mockImplementation((req, _res, next) => {
    req.user = { id: 1, role: Role.ADMIN };
    next();
  }),
  authorize: jest.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../src/lib/listCache', () => ({
  getCachedRooms: jest.fn(),
  invalidateRoomCache: jest.fn(),
  getCachedTherapists: jest.fn().mockResolvedValue([]),
  invalidateTherapistCache: jest.fn(),
}));

import { getCachedRooms, invalidateRoomCache } from '../../src/lib/listCache';

const app = buildTestApp();

describe('GET /api/rooms', () => {
  it('returns rooms from cache', async () => {
    (getCachedRooms as jest.Mock).mockResolvedValue([makeRoom()]);

    const res = await request(app).get('/api/rooms');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(getCachedRooms).toHaveBeenCalled();
  });
});

describe('POST /api/rooms', () => {
  it('creates a room and invalidates cache', async () => {
    const room = makeRoom({ name: 'Sala 2' });
    prismaMock.room.create.mockResolvedValue(room as any);

    const res = await request(app)
      .post('/api/rooms')
      .send({ name: 'Sala 2' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Sala 2');
    expect(invalidateRoomCache).toHaveBeenCalled();
  });
});

describe('DELETE /api/rooms/:id', () => {
  it('returns 409 when room has active sessions', async () => {
    prismaMock.session.count.mockResolvedValue(3);

    const res = await request(app).delete('/api/rooms/1');

    expect(res.status).toBe(409);
    expect(prismaMock.room.delete).not.toHaveBeenCalled();
  });

  it('deletes the room and invalidates cache when no sessions exist', async () => {
    prismaMock.session.count.mockResolvedValue(0);
    prismaMock.room.delete.mockResolvedValue(makeRoom() as any);

    const res = await request(app).delete('/api/rooms/1');

    expect(res.status).toBe(200);
    expect(prismaMock.room.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(invalidateRoomCache).toHaveBeenCalled();
  });
});
