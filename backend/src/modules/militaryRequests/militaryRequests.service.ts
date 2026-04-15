import { RequestStatus } from '@prisma/client';

/**
 * Compute the current status of a military request based on date range.
 * Pure function — no Prisma.
 */
export function computeStatus(validFrom: Date, validUntil: Date): RequestStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = new Date(validFrom);
  from.setHours(0, 0, 0, 0);

  const until = new Date(validUntil);
  until.setHours(23, 59, 59, 999);

  return today >= from && today <= until ? RequestStatus.ACTIVE : RequestStatus.EXPIRED;
}
