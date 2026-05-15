import { Finance, Patient, Prisma, Session } from '@prisma/client';
import prisma from '../../lib/prisma';
import logger from '../../lib/logger';

/**
 * PERF-02: SQL-level overlap check. Returns true if there is a conflicting session.
 */
async function hasOverlap(
  field: 'roomId' | 'therapistId',
  fieldValue: number,
  date: string,
  startTime: string,
  durationMin: number,
  excludeId: number | null,
): Promise<boolean> {
  const [h, m] = startTime.split(':').map(Number);
  const newStart = h * 60 + m;
  const newEnd = newStart + durationMin;

  const safeExcludeId = excludeId ?? -1;
  const result = await prisma.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*) AS count
      FROM "Session"
      WHERE ${Prisma.raw(`"${field}"`)} = ${fieldValue}
        AND "date" = ${new Date(date)}::date
        AND "status" != 'CANCELED'
        AND "id" != ${safeExcludeId}
        AND (
          (EXTRACT(HOUR FROM "startTime"::time) * 60 + EXTRACT(MINUTE FROM "startTime"::time)) < ${newEnd}
          AND
          (EXTRACT(HOUR FROM "startTime"::time) * 60 + EXTRACT(MINUTE FROM "startTime"::time) + "duration") > ${newStart}
        )
    `,
  );
  return result[0].count > 0n;
}

export async function checkRoomConflict(
  roomId: number | string | null | undefined,
  date: string,
  startTime: string,
  duration: number | string,
  excludeId: number | null = null,
): Promise<boolean> {
  if (!roomId) return false;
  return hasOverlap('roomId', parseInt(String(roomId)), date, startTime, parseInt(String(duration)), excludeId);
}

export async function checkTherapistConflict(
  therapistId: number | string,
  date: string,
  startTime: string,
  duration: number | string,
  excludeId: number | null = null,
): Promise<boolean> {
  return hasOverlap('therapistId', parseInt(String(therapistId)), date, startTime, parseInt(String(duration)), excludeId);
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Atomically adjust patient accountBalance by delta and recalculate remainingSessions.
 * Uses { increment: delta } so the balance change is computed at the SQL level.
 * Must be called inside a Prisma $transaction.
 *
 * Rollback behavior:
 *   - When called with a positive delta (adding back money, e.g. session cancelled or unpaid),
 *     balance increases and remainingSessions is recalculated.
 *   - When called with a negative delta (deducting for a paid session),
 *     balance decreases and remainingSessions is recalculated.
 * remainingSessions is always max(0, floor(newBalance / sessionPrice)).
 */
export async function adjustPatientBalance(
  tx: TxClient,
  patientId: number,
  delta: number,
): Promise<Patient> {
  // Step 1: atomic increment at the SQL level (avoids read-modify-write skew)
  const interim = await tx.patient.update({
    where: { id: patientId },
    data: { accountBalance: { increment: delta } },
    select: { id: true, accountBalance: true, sessionPrice: true },
  });

  const newBalance = interim.accountBalance.toNumber();
  const sessionPrice = interim.sessionPrice.toNumber();
  const remainingSessions = sessionPrice > 0 ? Math.max(0, Math.floor(newBalance / sessionPrice)) : 0;

  logger.info('adjustPatientBalance', { patientId, delta, newBalance, sessionPrice, remainingSessions });

  // Step 2: store the recalculated remainingSessions
  return tx.patient.update({
    where: { id: patientId },
    data: { remainingSessions },
  });
}

/**
 * Mark a session COMPLETED and atomically:
 *   1. Set status=COMPLETED, isPaid, and balanceDeducted in ONE session update
 *   2. Upsert a Finance record (therapistEarning, companyIncome)
 *   3. If non-military and isPaid: deduct patient.sessionPrice from accountBalance
 *      and recalculate remainingSessions via adjustPatientBalance
 *   4. For military patients: increment usedSessions on the active request
 *
 * Balance deduction rule:
 *   - Only deducted when isPaid=true and patient is non-military
 *   - Exactly patient.sessionPrice is deducted (not therapist earning, not duration-based)
 *   - balanceDeducted=true is set on the session so it is never deducted twice
 */
export async function completeSession(
  sessionId: number,
  isPaid: boolean = false,
): Promise<{ session: Session; finance: Finance; patient: Patient }> {
  return prisma.$transaction(async (tx) => {
    // Fetch the session with patient+therapist data in one round-trip
    const existing = await tx.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        patient: true,
        therapist: { select: { id: true, hourlyRate: true } },
      },
    });

    if (existing.status === 'COMPLETED') {
      throw Object.assign(new Error('Session is already completed'), { statusCode: 409 });
    }

    const { patient, therapist } = existing;
    const willDeductBalance = !patient.isMilitary && isPaid;

    logger.info('completeSession', {
      sessionId,
      patientId: patient.id,
      isPaid,
      willDeductBalance,
      sessionPrice: patient.sessionPrice.toNumber(),
      currentBalance: patient.accountBalance.toNumber(),
    });

    // Single session update: status, isPaid, and balanceDeducted in one write
    const session = await tx.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        isPaid,
        balanceDeducted: willDeductBalance,
      },
    });

    // Finance: fixed earning per therapy (no duration factor)
    const therapistEarning = therapist.hourlyRate.toNumber();
    const companyIncome = Math.max(patient.sessionPrice.toNumber() - therapistEarning, 0);

    const finance = await tx.finance.upsert({
      where: { sessionId },
      create: { sessionId, therapistId: session.therapistId, therapistEarning, companyIncome },
      update: { therapistEarning, companyIncome },
    });

    let updatedPatient: Patient;

    if (patient.isMilitary) {
      // Military: track usedSessions on the active request — no balance change
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const activeRequest = await tx.militaryRequest.findFirst({
        where: {
          patientId: patient.id,
          validFrom: { lte: today },
          validUntil: { gte: startOfToday },
        },
        orderBy: { validUntil: 'desc' },
      });
      if (activeRequest) {
        await tx.militaryRequest.update({
          where: { id: activeRequest.id },
          data: { usedSessions: { increment: 1 } },
        });
      }
      updatedPatient = patient;
    } else if (willDeductBalance) {
      // Non-military + paid: deduct exactly sessionPrice from balance
      updatedPatient = await adjustPatientBalance(tx, patient.id, -patient.sessionPrice.toNumber());
    } else {
      // Completed but not paid — balance unchanged
      updatedPatient = patient;
    }

    return { session, finance, patient: updatedPatient };
  });
}
