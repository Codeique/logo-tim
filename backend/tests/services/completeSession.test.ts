import prismaMock from '../__mocks__/prisma';
import { completeSession } from '../../src/modules/sessions/sessions.service';
import { SessionStatus } from '@prisma/client';
import { makeSession, makeTherapist, makePatient, makeFinance, decimal } from '../__helpers__/factories';

beforeEach(() => {
  (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
});

const scheduledSession = makeSession({ status: SessionStatus.SCHEDULED });
const completedSession = makeSession({ status: SessionStatus.COMPLETED });
const therapist = makeTherapist({ hourlyRate: decimal(50) });
const patient = makePatient({ sessionPrice: decimal(80), remainingSessions: 3, isMilitary: false });
const finance = makeFinance();

describe('completeSession — happy path (non-military)', () => {
  beforeEach(() => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(scheduledSession as any);
    prismaMock.session.update.mockResolvedValue({ ...scheduledSession, status: SessionStatus.COMPLETED } as any);
    prismaMock.therapist.findUniqueOrThrow.mockResolvedValue(therapist as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patient as any);
    prismaMock.finance.upsert.mockResolvedValue(finance as any);
    prismaMock.patient.update.mockResolvedValue({ ...patient, remainingSessions: 2 } as any);
  });

  it('marks the session as COMPLETED', async () => {
    await completeSession(1);
    expect(prismaMock.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'COMPLETED' } }),
    );
  });

  it('creates a Finance record via upsert', async () => {
    await completeSession(1);
    expect(prismaMock.finance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ sessionId: 1, therapistId: 1 }),
      }),
    );
  });

  it('therapistEarning = fixed hourlyRate regardless of duration', async () => {
    // hourlyRate=50 → therapistEarning=50 for any session duration
    await completeSession(1);
    expect(prismaMock.finance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ therapistEarning: 50 }),
      }),
    );
  });

  it('therapistEarning is unchanged when session duration is 45 minutes (not 60)', async () => {
    const shortSession = makeSession({ status: SessionStatus.SCHEDULED, duration: 45 });
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(shortSession as any);
    prismaMock.session.update.mockResolvedValue({ ...shortSession, status: SessionStatus.COMPLETED } as any);

    await completeSession(1);
    expect(prismaMock.finance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ therapistEarning: 50 }),
      }),
    );
  });

  it('decrements remainingSessions by 1 for non-military patient', async () => {
    await completeSession(1);
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ remainingSessions: { decrement: 1 } }),
      }),
    );
  });

  it('runs everything in a single $transaction', async () => {
    await completeSession(1);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns { session, finance, patient }', async () => {
    const result = await completeSession(1);
    expect(result.session).toBeDefined();
    expect(result.finance).toBeDefined();
    expect(result.patient).toBeDefined();
  });
});

describe('completeSession — DI-01 (clamp remainingSessions to 0)', () => {
  it('sets remainingSessions to 0 instead of decrementing when already 0', async () => {
    const patientAtZero = { ...patient, remainingSessions: 0 };
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(scheduledSession as any);
    prismaMock.session.update.mockResolvedValue({ ...scheduledSession, status: SessionStatus.COMPLETED } as any);
    prismaMock.therapist.findUniqueOrThrow.mockResolvedValue(therapist as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientAtZero as any);
    prismaMock.finance.upsert.mockResolvedValue(finance as any);
    prismaMock.patient.update.mockResolvedValue(patientAtZero as any);

    await completeSession(1);

    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ remainingSessions: 0 }) }),
    );
  });
});

describe('completeSession — DI-04 (double-completion guard)', () => {
  it('throws 409 if session is already COMPLETED', async () => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(completedSession as any);

    await expect(completeSession(1)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not create a Finance record on double-completion attempt', async () => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(completedSession as any);

    await expect(completeSession(1)).rejects.toBeDefined();
    expect(prismaMock.finance.upsert).not.toHaveBeenCalled();
  });
});

describe('completeSession — military patient', () => {
  const militaryPatient = { ...patient, isMilitary: true };
  const activeRequest = { id: 5, patientId: 1, usedSessions: 1 };

  beforeEach(() => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(scheduledSession as any);
    prismaMock.session.update.mockResolvedValue({ ...scheduledSession, status: SessionStatus.COMPLETED } as any);
    prismaMock.therapist.findUniqueOrThrow.mockResolvedValue(therapist as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(militaryPatient as any);
    prismaMock.finance.upsert.mockResolvedValue(finance as any);
    prismaMock.militaryRequest.findFirst.mockResolvedValue(activeRequest as any);
    prismaMock.militaryRequest.update.mockResolvedValue({ ...activeRequest, usedSessions: 2 } as any);
  });

  it('increments usedSessions on the active military request', async () => {
    await completeSession(1);
    expect(prismaMock.militaryRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { usedSessions: { increment: 1 } } }),
    );
  });

  it('does NOT call patient.update for remainingSessions on military patients', async () => {
    await completeSession(1);
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
  });
});
