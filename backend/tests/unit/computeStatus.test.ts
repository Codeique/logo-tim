import { computeStatus } from '../../src/modules/militaryRequests/militaryRequests.service';

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

describe('computeStatus', () => {
  it('returns ACTIVE when today is within range', () => {
    expect(computeStatus(daysFromNow(-5), daysFromNow(5))).toBe('ACTIVE');
  });

  it('returns ACTIVE when today is validFrom', () => {
    expect(computeStatus(daysFromNow(0), daysFromNow(10))).toBe('ACTIVE');
  });

  it('returns ACTIVE when today is validUntil', () => {
    expect(computeStatus(daysFromNow(-10), daysFromNow(0))).toBe('ACTIVE');
  });

  it('returns EXPIRED when validUntil is in the past', () => {
    expect(computeStatus(daysFromNow(-20), daysFromNow(-1))).toBe('EXPIRED');
  });

  it('returns EXPIRED when validFrom is in the future', () => {
    expect(computeStatus(daysFromNow(1), daysFromNow(10))).toBe('EXPIRED');
  });
});
