import prismaMock from '../__mocks__/prisma';
import { applyPayment } from '../../src/modules/transactions/transactions.service';
import { TransactionType } from '@prisma/client';
import { makePatient, makeTransaction, decimal } from '../__helpers__/factories';

beforeEach(() => {
  (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
});

// Service reads both sessionPrice AND accountBalance from the patient record.
// Mocks must include accountBalance as a Decimal so .toNumber() works.
const patientBase = makePatient({ sessionPrice: decimal(80), accountBalance: decimal(0) });

describe('applyPayment — PAYMENT', () => {
  it('creates a transaction record with the correct type and amount', async () => {
    const tx = makeTransaction({ type: TransactionType.PAYMENT, amount: decimal(160) });
    prismaMock.transaction.create.mockResolvedValue(tx as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient({ remainingSessions: 2 }) as any);

    await applyPayment({ patientId: 1, amount: 160, type: TransactionType.PAYMENT, createdById: 1 });

    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 160, type: TransactionType.PAYMENT, patientId: 1 }) }),
    );
  });

  it('sets remainingSessions to floor(newBalance / sessionPrice) after payment', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 160, type: TransactionType.PAYMENT, createdById: 1 });

    // balance=0 + 160 = 160; floor(160/80) = 2
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ remainingSessions: 2 }),
      }),
    );
  });

  it('sets accountBalance to newBalance after payment', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 160, type: TransactionType.PAYMENT, createdById: 1 });

    // balance=0 + 160 = 160
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountBalance: 160 }),
      }),
    );
  });

  it('defaults type to PAYMENT when not provided', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, createdById: 1 });

    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: TransactionType.PAYMENT }) }),
    );
  });
});

describe('applyPayment — REFUND', () => {
  it('sets accountBalance to newBalance after refund (balance decreases)', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction({ type: TransactionType.REFUND }) as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, type: TransactionType.REFUND, createdById: 1 });

    // balance=0 + (-80) = -80
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountBalance: -80 }),
      }),
    );
  });

  it('clamps remainingSessions to 0 when balance goes negative after refund', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction({ type: TransactionType.REFUND }) as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, type: TransactionType.REFUND, createdById: 1 });

    // floor(-80/80) = -1, clamped to 0
    const updateCall = prismaMock.patient.update.mock.calls[0][0];
    expect(updateCall.data.remainingSessions).toBe(0);
  });
});

describe('applyPayment — ADJUSTMENT', () => {
  it('sets accountBalance to newBalance and recalculates remainingSessions', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction({ type: TransactionType.ADJUSTMENT }) as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 50, type: TransactionType.ADJUSTMENT, createdById: 1 });

    // balance=0 + 50 = 50; floor(50/80) = 0
    const updateCall = prismaMock.patient.update.mock.calls[0][0];
    expect(updateCall.data.accountBalance).toBe(50);
    expect(updateCall.data.remainingSessions).toBe(0);
  });
});

describe('applyPayment — atomicity', () => {
  it('returns both transaction and updatedPatient', async () => {
    const tx = makeTransaction();
    const patient = makePatient({ remainingSessions: 1 });
    prismaMock.transaction.create.mockResolvedValue(tx as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(patient as any);

    const result = await applyPayment({ patientId: 1, amount: 80, createdById: 1 });

    expect(result.transaction).toBeDefined();
    expect(result.updatedPatient).toBeDefined();
  });

  it('runs both writes inside prisma.$transaction', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientBase as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, createdById: 1 });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
