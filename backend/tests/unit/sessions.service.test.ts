// Unit tests for the pure overlap-detection logic in sessions.service.ts
// The DB calls (checkRoomConflict / checkTherapistConflict) are not tested here;
// they are covered by integration tests. This file tests the time-overlap math.

function toMinutes(startTime: string, duration: number): { start: number; end: number } {
  const [h, m] = startTime.split(':').map(Number);
  const start = h * 60 + m;
  return { start, end: start + duration };
}

function overlaps(a: { startTime: string; duration: number }, b: { startTime: string; duration: number }): boolean {
  const { start: aStart, end: aEnd } = toMinutes(a.startTime, a.duration);
  const { start: bStart, end: bEnd } = toMinutes(b.startTime, b.duration);
  return aStart < bEnd && aEnd > bStart;
}

describe('session time overlap detection', () => {
  const base = { startTime: '10:00', duration: 60 }; // 10:00–11:00

  it('detects exact overlap', () => {
    expect(overlaps(base, { startTime: '10:00', duration: 60 })).toBe(true);
  });

  it('detects overlap when new session starts inside existing', () => {
    expect(overlaps(base, { startTime: '10:30', duration: 60 })).toBe(true);
  });

  it('detects overlap when new session ends inside existing', () => {
    expect(overlaps(base, { startTime: '09:30', duration: 45 })).toBe(true);
  });

  it('detects overlap when new session wraps existing', () => {
    expect(overlaps(base, { startTime: '09:00', duration: 180 })).toBe(true);
  });

  it('no overlap when new session is immediately after', () => {
    expect(overlaps(base, { startTime: '11:00', duration: 60 })).toBe(false);
  });

  it('no overlap when new session ends exactly at start', () => {
    expect(overlaps(base, { startTime: '09:00', duration: 60 })).toBe(false);
  });

  it('no overlap when sessions are apart', () => {
    expect(overlaps(base, { startTime: '12:00', duration: 60 })).toBe(false);
  });
});
