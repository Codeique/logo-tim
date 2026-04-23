import prismaMock from '../__mocks__/prisma';
import {
  getCachedRooms,
  invalidateRoomCache,
  getCachedTherapists,
  invalidateTherapistCache,
} from '../../src/lib/listCache';
import { makeRoom, makeTherapist } from '../__helpers__/factories';

beforeEach(() => {
  invalidateRoomCache();
  invalidateTherapistCache();
});

describe('getCachedRooms', () => {
  it('queries Prisma on first call', async () => {
    const rooms = [makeRoom()];
    prismaMock.room.findMany.mockResolvedValue(rooms as any);
    const result = await getCachedRooms();
    expect(result).toEqual(rooms);
    expect(prismaMock.room.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns cached data without calling Prisma on second call', async () => {
    prismaMock.room.findMany.mockResolvedValue([makeRoom()] as any);
    await getCachedRooms();
    await getCachedRooms();
    expect(prismaMock.room.findMany).toHaveBeenCalledTimes(1);
  });

  it('re-queries Prisma after cache invalidation', async () => {
    prismaMock.room.findMany.mockResolvedValue([makeRoom()] as any);
    await getCachedRooms();
    invalidateRoomCache();
    await getCachedRooms();
    expect(prismaMock.room.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('getCachedTherapists', () => {
  it('queries Prisma on first call', async () => {
    const therapists = [makeTherapist()];
    prismaMock.therapist.findMany.mockResolvedValue(therapists as any);
    const result = await getCachedTherapists();
    expect(result).toEqual(therapists);
    expect(prismaMock.therapist.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns cached data without calling Prisma on second call', async () => {
    prismaMock.therapist.findMany.mockResolvedValue([makeTherapist()] as any);
    await getCachedTherapists();
    await getCachedTherapists();
    expect(prismaMock.therapist.findMany).toHaveBeenCalledTimes(1);
  });

  it('re-queries Prisma after cache invalidation', async () => {
    prismaMock.therapist.findMany.mockResolvedValue([makeTherapist()] as any);
    await getCachedTherapists();
    invalidateTherapistCache();
    await getCachedTherapists();
    expect(prismaMock.therapist.findMany).toHaveBeenCalledTimes(2);
  });
});
