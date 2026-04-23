import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeRequestStatus,
  requestStatusColor,
  requestStatusLabel,
} from '../../src/utils/militaryStatus';

// Pin "today" to 2026-01-15 for all date logic tests
const TODAY = new Date('2026-01-15T12:00:00');

describe('computeRequestStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns ACTIVE when well within range (many days remaining)', () => {
    // Jan 1 → Feb 28: 44 days left on Jan 15
    expect(computeRequestStatus('2026-01-01', '2026-02-28')).toBe('ACTIVE');
  });

  it('returns ACTIVE when exactly 6 days remain (boundary)', () => {
    // until Jan 21: differenceInCalendarDays(Jan 21, Jan 15) = 6
    expect(computeRequestStatus('2026-01-01', '2026-01-21')).toBe('ACTIVE');
  });

  it('returns ACTIVE_WARNING when exactly 5 days remain (boundary)', () => {
    // until Jan 20: differenceInCalendarDays(Jan 20, Jan 15) = 5
    expect(computeRequestStatus('2026-01-01', '2026-01-20')).toBe('ACTIVE_WARNING');
  });

  it('returns ACTIVE_WARNING when fewer than 5 days remain', () => {
    // until Jan 17: 2 days left
    expect(computeRequestStatus('2026-01-01', '2026-01-17')).toBe('ACTIVE_WARNING');
  });

  it('returns ACTIVE_WARNING when today equals the until date (0 days left)', () => {
    // until Jan 15 (today): differenceInCalendarDays = 0, which is <= 5
    expect(computeRequestStatus('2026-01-01', '2026-01-15')).toBe('ACTIVE_WARNING');
  });

  it('returns INACTIVE when range ended before today', () => {
    // Dec 1 → Jan 1: ended 14 days ago
    expect(computeRequestStatus('2025-12-01', '2026-01-01')).toBe('INACTIVE');
  });

  it('returns INACTIVE when range has not started yet', () => {
    // Feb 1 → Mar 1: starts 17 days from now
    expect(computeRequestStatus('2026-02-01', '2026-03-01')).toBe('INACTIVE');
  });

  it('returns INACTIVE when both dates are fully in the past', () => {
    expect(computeRequestStatus('2025-10-01', '2025-11-01')).toBe('INACTIVE');
  });

  it('returns INACTIVE when both dates are fully in the future', () => {
    expect(computeRequestStatus('2026-06-01', '2026-07-01')).toBe('INACTIVE');
  });

  it('uses calendar-day granularity (start-of-day boundary)', () => {
    // today IS the validFrom date — should count as started (daysFromStart = 0)
    expect(computeRequestStatus('2026-01-15', '2026-01-20')).toBe('ACTIVE_WARNING');
  });
});

describe('requestStatusColor', () => {
  it('returns "success" for ACTIVE', () => {
    expect(requestStatusColor('ACTIVE')).toBe('success');
  });

  it('returns "warning" for ACTIVE_WARNING', () => {
    expect(requestStatusColor('ACTIVE_WARNING')).toBe('warning');
  });

  it('returns "error" for INACTIVE', () => {
    expect(requestStatusColor('INACTIVE')).toBe('error');
  });

  it('returns "error" for any unknown status', () => {
    expect(requestStatusColor('UNKNOWN')).toBe('error');
    expect(requestStatusColor('')).toBe('error');
  });
});

describe('requestStatusLabel', () => {
  it('returns Serbian label for ACTIVE', () => {
    expect(requestStatusLabel('ACTIVE')).toBe('Aktivan');
  });

  it('returns Serbian label for ACTIVE_WARNING', () => {
    expect(requestStatusLabel('ACTIVE_WARNING')).toBe('Aktivan – uskoro ističe');
  });

  it('returns Serbian label for INACTIVE', () => {
    expect(requestStatusLabel('INACTIVE')).toBe('Neaktivan');
  });

  it('returns "Neaktivan" for unknown status', () => {
    expect(requestStatusLabel('EXPIRED')).toBe('Neaktivan');
  });
});
