import { Patient, Transaction, TransactionType } from '@prisma/client';
import prisma from '../../lib/prisma';

export interface ApplyPaymentArgs {
  patientId: number | string;
  amount: number | string;
  type?: TransactionType;
  createdById: number;
  note?: string;
}

/**
 * Atomically create a transaction record and update patient balance/sessions.
 * Implements BUG-02 fix: both writes are inside a single Prisma $transaction.
 */
export async function applyPayment(
  { patientId, amount, type, createdById, note }: ApplyPaymentArgs,
): Promise<{ transaction: Transaction & { patient: { id: number; firstName: string; lastName: string }; createdBy: { email: string } }; updatedPatient: Patient }> {
  const parsedAmount = parseFloat(String(amount));
  const parsedPatientId = parseInt(String(patientId));

  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        patientId: parsedPatientId,
        amount: parsedAmount,
        type: type ?? TransactionType.PAYMENT,
        note,
        createdById,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { email: true } },
      },
    });

    const patientRecord = await tx.patient.findUniqueOrThrow({
      where: { id: parsedPatientId },
      select: { sessionPrice: true },
    });

    const sessionPriceVal = patientRecord.sessionPrice.toNumber() || 1;
    const resolvedType = type ?? TransactionType.PAYMENT;
    const delta = resolvedType === TransactionType.REFUND ? -parsedAmount : parsedAmount;
    const sessionsDelta = resolvedType === TransactionType.PAYMENT ? Math.floor(parsedAmount / sessionPriceVal) : 0;

    const updatedPatient = await tx.patient.update({
      where: { id: parsedPatientId },
      data: {
        accountBalance: { increment: delta },
        ...(sessionsDelta > 0 ? { remainingSessions: { increment: sessionsDelta } } : {}),
      },
    });

    return { transaction, updatedPatient };
  });
}
