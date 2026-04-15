import { body } from 'express-validator';

export const createPatientValidation = [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('sessionPrice').optional().isFloat({ min: 0 }).withMessage('sessionPrice must be ≥ 0'),
  body('birthDate').optional().isISO8601().withMessage('birthDate must be ISO8601'),
  body('therapistId').optional().isInt({ min: 1 }),
  body('isMilitary').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];

export const updatePatientValidation = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('sessionPrice').optional().isFloat({ min: 0 }),
  body('birthDate').optional().isISO8601(),
  body('therapistId').optional().isInt({ min: 1 }),
  body('isMilitary').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
];
