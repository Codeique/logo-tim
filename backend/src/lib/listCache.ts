import { LRUCache } from 'lru-cache';
import { Room, Therapist } from '@prisma/client';
import prisma from './prisma';

/** CACHE-01: LRU cache for room and therapist lists — these change rarely */

type TherapistWithRelations = Therapist & {
  rooms: Room[];
  user: { email: string; role: string };
  _count: { sessions: number };
};

const roomCache      = new LRUCache<'all', Room[]>({ max: 1, ttl: 60_000 });
const therapistCache = new LRUCache<'all', TherapistWithRelations[]>({ max: 1, ttl: 60_000 });

export async function getCachedRooms(): Promise<Room[]> {
  const cached = roomCache.get('all');
  if (cached) return cached;
  const rooms = await prisma.room.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  roomCache.set('all', rooms);
  return rooms;
}

export function invalidateRoomCache(): void {
  roomCache.delete('all');
}

export async function getCachedTherapists(): Promise<TherapistWithRelations[]> {
  const cached = therapistCache.get('all');
  if (cached) return cached;
  const therapists = await prisma.therapist.findMany({
    where: { isActive: true, deletedAt: null },
    include: {
      rooms: true,
      user: { select: { email: true, role: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: { firstName: 'asc' },
  }) as TherapistWithRelations[];
  therapistCache.set('all', therapists);
  return therapists;
}

export function invalidateTherapistCache(): void {
  therapistCache.delete('all');
}
