import prismaMock from '../__mocks__/prisma';
import { completeSession } from '../../src/modules/sessions/sessions.service';
import { SessionStatus } from '@prisma/client';
import { makeSession, makeFinance, makePatient, decimal } from '../__helpers__/factories';

beforeEach(() => {
  (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
});

// The service fetches patient+therapist via include on session.findUniqueOrThrow,
// not via separate patient/therapist queries. Mocks must embed the full objects.
const patient = makePatient({ sessionPrice: decimal(80), accountBalance: decimal(0), remainingSessions: 3, isMilitary: false });
const finance = makeFinance();

const scheduledWithRelations = {
  ...makeSession({ status: SessionStatus.SCHEDULED }),
  patient,
  therapist: { id: 1, hourlyRate: decimal(50) },
};

const completedWithRelations = {
  ...makeSession({ status: SessionStatus.COMPLETED }),
  patient,
  therapist: { id: 1, hourlyRate: decimal(50) },
};

describe('completeSession — happy path (non-military)', () => {
  beforeEach(() => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(scheduledWithRelations as any);
    prismaMock.session.update.mockResolvedValue({ ...scheduledWithRelations, status: SessionStatus.COMPLETED } as any);
    prismaMock.finance.upsert.mockResolvedValue(finance as any);
    // patient.update is called by adjustPatientBalance — must return object with Decimal fields
    prismaMock.patient.update.mockResolvedValue({ ...patient } as any);
  });

  it('marks the session as COMPLETED', async () => {
    await completeSession(1);
    expect(prismaMock.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'COMPLETED', isPaid: false, balanceDeducted: false } }),
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
    await completeSession(1);
    expect(prismaMock.finance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ therapistEarning: 50 }),
      }),
    );
  });

  it('therapistEarning is unchanged when session duration is 45 minutes (not 60)', async () => {
    const shortSession = {
      ...makeSession({ status: SessionStatus.SCHEDULED, duration: 45 }),
      patient,
      therapist: { id: 1, hourlyRate: decimal(50) },
    };
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(shortSession as any);
    prismaMock.session.update.mockResolvedValue({ ...shortSession, status: SessionStatus.COMPLETED } as any);

    await completeSession(1);
    expect(prismaMock.finance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ therapistEarning: 50 }),
      }),
    );
  });

  it('deducts sessionPrice from accountBalance when isPaid=true', async () => {
    await completeSession(1, true);
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { accountBalance: { increment: -80 } },
      }),
    );
  });

  it('sets remainingSessions to 0 when balance goes negative after deduction', async () => {
    // balance=0, deduct 80 → -80; max(0, floor(-80/80)) = 0
    await completeSession(1, true);
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { remainingSessions: 0 } }),
    );
  });

  it('does NOT adjust balance when isPaid=false', async () => {
    await completeSession(1, false);
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
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
  it('sets remainingSessions to 0 instead of going negative', async () => {
    // Even with 0 remaining, balance deduction produces 0 (clamped), not negative
    const patientAtZero = { ...patient, accountBalance: decimal(0), remainingSessions: 0 };
    const sessionAtZero = {
      ...makeSession({ status: SessionStatus.SCHEDULED }),
      patient: patientAtZero,
      therapist: { id: 1, hourlyRate: decimal(50) },
    };
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(sessionAtZero as any);
    prismaMock.session.update.mockResolvedValue({ ...sessionAtZero, status: SessionStatus.COMPLETED } as any);
    prismaMock.finance.upsert.mockResolvedValue(finance as any);
    prismaMock.patient.update.mockResolvedValue({ ...patientAtZero } as any);

    await completeSession(1, true);

    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { remainingSessions: 0 } }),
    );
  });
});

describe('completeSession — DI-04 (double-completion guard)', () => {
  it('throws 409 if session is already COMPLETED', async () => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(completedWithRelations as any);

    await expect(completeSession(1)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not create a Finance record on double-completion attempt', async () => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(completedWithRelations as any);

    await expect(completeSession(1)).rejects.toBeDefined();
    expect(prismaMock.finance.upsert).not.toHaveBeenCalled();
  });
});

describe('completeSession — military patient', () => {
  const militaryPatient = { ...patient, isMilitary: true };
  const activeRequest = { id: 5, patientId: 1, usedSessions: 1 };
  const scheduledWithMilitaryPatient = {
    ...makeSession({ status: SessionStatus.SCHEDULED }),
    patient: militaryPatient,
    therapist: { id: 1, hourlyRate: decimal(50) },
  };

  beforeEach(() => {
    prismaMock.session.findUniqueOrThrow.mockResolvedValue(scheduledWithMilitaryPatient as any);
    prismaMock.session.update.mockResolvedValue({ ...scheduledWithMilitaryPatient, status: SessionStatus.COMPLETED } as any);
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

  it('does NOT call patient.update for balance on military patients', async () => {
    await completeSession(1);
    expect(prismaMock.patient.update).not.toHaveBeenCalled();
  });
});
