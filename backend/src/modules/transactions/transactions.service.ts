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
 * Atomically create a transaction record and update patient balance/remainingSessions.
 * remainingSessions is always recalculated from the new balance:
 *   remainingSessions = max(0, floor(newBalance / sessionPrice))
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
      select: { sessionPrice: true, accountBalance: true },
    });

    const resolvedType = type ?? TransactionType.PAYMENT;
    const delta = resolvedType === TransactionType.REFUND ? -parsedAmount : parsedAmount;
    const newBalance = patientRecord.accountBalance.toNumber() + delta;
    const sessionPrice = patientRecord.sessionPrice.toNumber();
    const remainingSessions = sessionPrice > 0 ? Math.max(0, Math.floor(newBalance / sessionPrice)) : 0;

    const updatedPatient = await tx.patient.update({
      where: { id: parsedPatientId },
      data: { accountBalance: newBalance, remainingSessions },
    });

    return { transaction, updatedPatient };
  });
}
