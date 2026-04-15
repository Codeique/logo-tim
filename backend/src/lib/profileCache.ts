import { LRUCache } from "lru-cache";
import prisma from "./prisma";

/** PERF-03 + PERF-05: cache userId → therapist/patient profile ID to avoid per-request DB lookups */
const therapistIdCache = new LRUCache<number, number>({
  max: 500,
  ttl: 5 * 60_000,
});
const patientIdCache = new LRUCache<number, number>({
  max: 500,
  ttl: 5 * 60_000,
});

export async function getTherapistId(userId: number): Promise<number | null> {
  const cached = therapistIdCache.get(userId);
  if (cached !== undefined) return cached;
  const t = await prisma.therapist.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (t) therapistIdCache.set(userId, t.id);
  return t?.id ?? null;
}

export async function getPatientId(userId: number): Promise<number | null> {
  const cached = patientIdCache.get(userId);
  if (cached !== undefined) return cached;
  const p = await prisma.patient.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (p) patientIdCache.set(userId, p.id);
  return p?.id ?? null;
}

export function invalidateTherapistId(userId: number): void {
  therapistIdCache.delete(userId);
}

export function invalidatePatientId(userId: number): void {
  patientIdCache.delete(userId);
}
