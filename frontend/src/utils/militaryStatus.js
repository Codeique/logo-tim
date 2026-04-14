import { differenceInCalendarDays } from 'date-fns';

/**
 * Compute military request status purely from dates.
 *
 * Returns one of:
 *   'ACTIVE'         – today is within range, more than 5 days remaining
 *   'ACTIVE_WARNING' – today is within range, 5 or fewer days remaining
 *   'INACTIVE'       – today is before validFrom or after validUntil
 */
export function computeRequestStatus(validFrom, validUntil) {
  const today = new Date();
  const from = new Date(validFrom);
  const until = new Date(validUntil);

  // Compare at calendar-day granularity (strip time)
  const daysFromStart = differenceInCalendarDays(today, from); // >= 0 means started
  const daysLeft = differenceInCalendarDays(until, today);     // >= 0 means not yet ended

  if (daysFromStart < 0 || daysLeft < 0) return 'INACTIVE';
  if (daysLeft <= 5) return 'ACTIVE_WARNING';
  return 'ACTIVE';
}

export function requestStatusColor(status) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ACTIVE_WARNING') return 'warning';
  return 'error';
}

export function requestStatusLabel(status) {
  if (status === 'ACTIVE') return 'Aktivan';
  if (status === 'ACTIVE_WARNING') return 'Aktivan – uskoro ističe';
  return 'Neaktivan';
}
