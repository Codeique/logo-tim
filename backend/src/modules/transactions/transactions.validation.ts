import { body } from 'express-validator';
import { TransactionType } from '@prisma/client';

export const createTransactionValidation = [
  body('patientId').isInt({ min: 1 }).withMessage('Valid patientId required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('type')
    .optional()
    .isIn(Object.values(TransactionType)).withMessage(`type must be one of: ${Object.values(TransactionType).join(', ')}`),
  body('note').optional().isString(),
];
