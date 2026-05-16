import { Role } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildPatientWhereClause } from '../../src/modules/patients/patients.service';
import { invalidatePatientId } from '../../src/lib/profileCache';

beforeEach(() => {
  // Clear profileCache so each test starts fresh
  invalidatePatientId(1);
  invalidatePatientId(5);
  invalidatePatientId(10);
});

describe('buildPatientWhereClause — ADMIN', () => {
  const admin = { id: 1, role: Role.ADMIN };

  it('returns only deletedAt filter (sees all non-deleted patients)', async () => {
    const where = await buildPatientWhereClause(admin, {});
    expect(where).toEqual({ deletedAt: null });
  });

  it('adds search OR clause when search is provided', async () => {
    const where = await buildPatientWhereClause(admin, { search: 'marko' });
    expect(where.OR).toBeDefined();
    expect(where.OR).toHaveLength(4);
  });

  it('adds therapistId filter when provided', async () => {
    const where = await buildPatientWhereClause(admin, { therapistId: '3' });
    expect(where.primaryTherapistId).toBe(3);
  });

  it('adds isMilitary filter', async () => {
    const where = await buildPatientWhereClause(admin, { isMilitary: 'true' });
    expect(where.isMilitary).toBe(true);
  });

  it('adds isActive filter', async () => {
    const where = await buildPatientWhereClause(admin, { active: 'false' });
    expect(where.isActive).toBe(false);
  });
});

describe('buildPatientWhereClause — THERAPIST (BUG-05)', () => {
  const therapist = { id: 2, role: Role.THERAPIST };

  it('THERAPIST sees no extra scope restriction (returns all via empty where)', async () => {
    const where = await buildPatientWhereClause(therapist, {});
    // THERAPIST role has no special scoping in buildPatientWhereClause; scoping is done at controller level
    expect(where.id).toBeUndefined();
  });
});

describe('buildPatientWhereClause — CHIEF_THERAPIST (BUG-05)', () => {
  const chiefTherapist = { id: 3, role: Role.CHIEF_THERAPIST };

  it('behaves identically to THERAPIST role (BUG-05 fix)', async () => {
    const therapistWhere = await buildPatientWhereClause({ id: 3, role: Role.THERAPIST }, {});
    const chiefWhere = await buildPatientWhereClause(chiefTherapist, {});
    expect(chiefWhere).toEqual(therapistWhere);
  });
});

describe('buildPatientWhereClause — PATIENT', () => {
  const patientUser = { id: 5, role: Role.PATIENT };

  it('scopes query to own patient profile id', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 42 } as any);
    const where = await buildPatientWhereClause(patientUser, {});
    expect(where.id).toBe(42);
  });

  it('does not add id filter if patient profile does not exist', async () => {
    prismaMock.patient.findUnique.mockResolvedValue(null);
    const where = await buildPatientWhereClause({ id: 10, role: Role.PATIENT }, {});
    expect(where.id).toBeUndefined();
  });
});
