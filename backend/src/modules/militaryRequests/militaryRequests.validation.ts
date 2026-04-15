import { body } from 'express-validator';

export const createMilitaryRequestValidation = [
  body('patientId').isInt({ min: 1 }).withMessage('Valid patientId required'),
  body('requestNumber').trim().notEmpty().withMessage('Request number required'),
  body('validFrom').isISO8601().withMessage('validFrom must be ISO8601'),
  body('validUntil').isISO8601().withMessage('validUntil must be ISO8601'),
  body('totalSessions').optional().isInt({ min: 1 }),
  body('usedSessions').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
];

export const updateMilitaryRequestValidation = [
  body('requestNumber').optional().trim().notEmpty(),
  body('validFrom').optional().isISO8601(),
  body('validUntil').optional().isISO8601(),
  body('totalSessions').optional().isInt({ min: 1 }),
  body('usedSessions').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
];
