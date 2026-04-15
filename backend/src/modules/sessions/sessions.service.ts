import { Finance, Patient, Prisma, Session } from '@prisma/client';
import prisma from '../../lib/prisma';

/**
 * PERF-02: SQL-level overlap check. Returns true if there is a conflicting session.
 * Uses a single query with time arithmetic in SQL instead of fetching all sessions.
 *
 * Overlap condition: existing.start < new.end AND existing.end > new.start
 * where start/end are minutes since midnight.
 */
async function hasOverlap(
  field: 'room_id' | 'therapist_id',
  fieldValue: number,
  date: string,
  startTime: string,
  durationMin: number,
  excludeId: number | null,
): Promise<boolean> {
  const [h, m] = startTime.split(':').map(Number);
  const newStart = h * 60 + m;
  const newEnd = newStart + durationMin;

  const result = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Session"
      WHERE ${Prisma.raw(`"${field}"`)} = ${fieldValue}
        AND "date" = ${new Date(date)}::date
        AND "status" != 'CANCELED'
        AND ${excludeId !== null ? Prisma.sql`"id" != ${excludeId} AND` : Prisma.sql``}
        (
          (EXTRACT(HOUR FROM "startTime"::time) * 60 + EXTRACT(MINUTE FROM "startTime"::time)) < ${newEnd}
          AND
          (EXTRACT(HOUR FROM "startTime"::time) * 60 + EXTRACT(MINUTE FROM "startTime"::time) + "duration") > ${newStart}
        )
    `,
  );
  return result[0].count > 0n;
}

/**
 * Check whether a room has a conflicting session at the given time.
 * Returns true if there is an overlap.
 */
export async function checkRoomConflict(
  roomId: number | string | null | undefined,
  date: string,
  startTime: string,
  duration: number | string,
  excludeId: number | null = null,
): Promise<boolean> {
  if (!roomId) return false;
  return hasOverlap('room_id', parseInt(String(roomId)), date, startTime, parseInt(String(duration)), excludeId);
}

/**
 * Check whether a therapist has a conflicting session at the given time.
 * Implements BUG-04 fix.
 */
export async function checkTherapistConflict(
  therapistId: number | string,
  date: string,
  startTime: string,
  duration: number | string,
  excludeId: number | null = null,
): Promise<boolean> {
  return hasOverlap('therapist_id', parseInt(String(therapistId)), date, startTime, parseInt(String(duration)), excludeId);
}

/**
 * Mark a session COMPLETED and atomically:
 *   1. Upsert a Finance record (therapistEarning, companyIncome)
 *   2. Decrement patient remainingSessions by 1  (BUG-07 fix)
 */
export async function completeSession(
  sessionId: number,
): Promise<{ session: Session; finance: Finance; patient: Patient }> {
  return prisma.$transaction(async (tx) => {
    // DI-04: guard against double-completion to prevent double finance/decrement
    const existing = await tx.session.findUniqueOrThrow({ where: { id: sessionId } });
    if (existing.status === 'COMPLETED') {
      throw Object.assign(new Error('Session is already completed'), { statusCode: 409 });
    }

    const session = await tx.session.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });

    const [therapist, patient] = await Promise.all([
      tx.therapist.findUniqueOrThrow({ where: { id: session.therapistId } }),
      tx.patient.findUniqueOrThrow({ where: { id: session.patientId } }),
    ]);

    const durationHours = session.duration / 60;
    const therapistEarning = therapist.hourlyRate.toNumber() * durationHours;
    const companyIncome = Math.max(patient.sessionPrice.toNumber() - therapistEarning, 0);

    const finance = await tx.finance.upsert({
      where: { sessionId },
      create: { sessionId, therapistId: session.therapistId, therapistEarning, companyIncome },
      update: { therapistEarning, companyIncome },
    });

    // DI-01: clamp to 0 so remainingSessions never goes negative
    const updatedPatient = await tx.patient.update({
      where: { id: session.patientId },
      data: { remainingSessions: patient.remainingSessions > 0 ? { decrement: 1 } : 0 },
    });

    return { session, finance, patient: updatedPatient };
  });
}
