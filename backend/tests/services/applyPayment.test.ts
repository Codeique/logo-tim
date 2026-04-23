import prismaMock from '../__mocks__/prisma';
import { applyPayment } from '../../src/modules/transactions/transactions.service';
import { TransactionType } from '@prisma/client';
import { makePatient, makeTransaction, decimal } from '../__helpers__/factories';

beforeEach(() => {
  // Make $transaction forward the callback to the mock itself (cast avoids overload ambiguity)
  (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
});

describe('applyPayment — PAYMENT', () => {
  const patientWithPrice = { sessionPrice: decimal(80) };

  it('creates a transaction record with the correct type and amount', async () => {
    const tx = makeTransaction({ type: TransactionType.PAYMENT, amount: decimal(160) });
    prismaMock.transaction.create.mockResolvedValue(tx as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientWithPrice as any);
    prismaMock.patient.update.mockResolvedValue(makePatient({ remainingSessions: 2 }) as any);

    await applyPayment({ patientId: 1, amount: 160, type: TransactionType.PAYMENT, createdById: 1 });

    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 160, type: TransactionType.PAYMENT, patientId: 1 }) }),
    );
  });

  it('increments remainingSessions by floor(amount / sessionPrice)', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientWithPrice as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 160, type: TransactionType.PAYMENT, createdById: 1 });

    // 160 / 80 = 2 sessions
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ remainingSessions: { increment: 2 } }),
      }),
    );
  });

  it('increments accountBalance by the payment amount', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientWithPrice as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 160, type: TransactionType.PAYMENT, createdById: 1 });

    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountBalance: { increment: 160 } }),
      }),
    );
  });

  it('defaults type to PAYMENT when not provided', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue(patientWithPrice as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, createdById: 1 });

    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: TransactionType.PAYMENT }) }),
    );
  });
});

describe('applyPayment — REFUND', () => {
  it('decrements accountBalance by the refund amount', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction({ type: TransactionType.REFUND }) as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue({ sessionPrice: decimal(80) } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, type: TransactionType.REFUND, createdById: 1 });

    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountBalance: { increment: -80 } }),
      }),
    );
  });

  it('does NOT increment remainingSessions for a REFUND', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction({ type: TransactionType.REFUND }) as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue({ sessionPrice: decimal(80) } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, type: TransactionType.REFUND, createdById: 1 });

    const updateCall = prismaMock.patient.update.mock.calls[0][0];
    expect(updateCall.data.remainingSessions).toBeUndefined();
  });
});

describe('applyPayment — ADJUSTMENT', () => {
  it('increments accountBalance but does NOT change sessions', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction({ type: TransactionType.ADJUSTMENT }) as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue({ sessionPrice: decimal(80) } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 50, type: TransactionType.ADJUSTMENT, createdById: 1 });

    const updateCall = prismaMock.patient.update.mock.calls[0][0];
    expect(updateCall.data.accountBalance).toEqual({ increment: 50 });
    expect(updateCall.data.remainingSessions).toBeUndefined();
  });
});

describe('applyPayment — atomicity', () => {
  it('returns both transaction and updatedPatient', async () => {
    const tx = makeTransaction();
    const patient = makePatient({ remainingSessions: 1 });
    prismaMock.transaction.create.mockResolvedValue(tx as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue({ sessionPrice: decimal(80) } as any);
    prismaMock.patient.update.mockResolvedValue(patient as any);

    const result = await applyPayment({ patientId: 1, amount: 80, createdById: 1 });

    expect(result.transaction).toBeDefined();
    expect(result.updatedPatient).toBeDefined();
  });

  it('runs both writes inside prisma.$transaction', async () => {
    prismaMock.transaction.create.mockResolvedValue(makeTransaction() as any);
    prismaMock.patient.findUniqueOrThrow.mockResolvedValue({ sessionPrice: decimal(80) } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient() as any);

    await applyPayment({ patientId: 1, amount: 80, createdById: 1 });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
