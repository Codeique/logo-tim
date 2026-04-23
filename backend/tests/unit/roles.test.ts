import { Role } from '@prisma/client';
import { isTherapistRole } from '../../src/lib/roles';

describe('isTherapistRole', () => {
  it('returns true for THERAPIST', () => {
    expect(isTherapistRole(Role.THERAPIST)).toBe(true);
  });

  it('returns true for CHIEF_THERAPIST', () => {
    expect(isTherapistRole(Role.CHIEF_THERAPIST)).toBe(true);
  });

  it('returns false for ADMIN', () => {
    expect(isTherapistRole(Role.ADMIN)).toBe(false);
  });

  it('returns false for PATIENT', () => {
    expect(isTherapistRole(Role.PATIENT)).toBe(false);
  });
});
