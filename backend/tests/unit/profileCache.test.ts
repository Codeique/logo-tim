import prismaMock from '../__mocks__/prisma';
import {
  getTherapistId,
  getPatientId,
  invalidateTherapistId,
  invalidatePatientId,
} from '../../src/lib/profileCache';

beforeEach(() => {
  // Clear cached entries before each test so Prisma is always consulted first
  invalidateTherapistId(1);
  invalidateTherapistId(2);
  invalidatePatientId(1);
  invalidatePatientId(2);
});

describe('getTherapistId', () => {
  it('fetches from Prisma on cache miss and returns id', async () => {
    prismaMock.therapist.findUnique.mockResolvedValue({ id: 10 } as any);
    const result = await getTherapistId(1);
    expect(result).toBe(10);
    expect(prismaMock.therapist.findUnique).toHaveBeenCalledWith({ where: { userId: 1 }, select: { id: true } });
  });

  it('returns cached value without calling Prisma on second call', async () => {
    prismaMock.therapist.findUnique.mockResolvedValue({ id: 10 } as any);
    await getTherapistId(1);
    await getTherapistId(1);
    expect(prismaMock.therapist.findUnique).toHaveBeenCalledTimes(1);
  });

  it('returns null when therapist profile does not exist', async () => {
    prismaMock.therapist.findUnique.mockResolvedValue(null);
    const result = await getTherapistId(99);
    expect(result).toBeNull();
  });

  it('re-fetches from Prisma after invalidation', async () => {
    prismaMock.therapist.findUnique.mockResolvedValue({ id: 10 } as any);
    await getTherapistId(1);
    invalidateTherapistId(1);
    await getTherapistId(1);
    expect(prismaMock.therapist.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe('getPatientId', () => {
  it('fetches from Prisma on cache miss and returns id', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 20 } as any);
    const result = await getPatientId(2);
    expect(result).toBe(20);
    expect(prismaMock.patient.findUnique).toHaveBeenCalledWith({ where: { userId: 2 }, select: { id: true } });
  });

  it('returns cached value without calling Prisma on second call', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 20 } as any);
    await getPatientId(2);
    await getPatientId(2);
    expect(prismaMock.patient.findUnique).toHaveBeenCalledTimes(1);
  });

  it('returns null when patient profile does not exist', async () => {
    prismaMock.patient.findUnique.mockResolvedValue(null);
    const result = await getPatientId(99);
    expect(result).toBeNull();
  });

  it('re-fetches from Prisma after invalidation', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 20 } as any);
    await getPatientId(2);
    invalidatePatientId(2);
    await getPatientId(2);
    expect(prismaMock.patient.findUnique).toHaveBeenCalledTimes(2);
  });
});
