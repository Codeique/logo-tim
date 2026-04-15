import { body } from 'express-validator';

export const createEvaluationValidation = [
  body('patientId').isInt({ min: 1 }).withMessage('Valid patientId required'),
  body('date').isISO8601().withMessage('Valid date (ISO8601) required'),
  body('content').trim().notEmpty().withMessage('Content required'),
  body('therapyProposal').optional().isString(),
];

export const updateEvaluationValidation = [
  body('date').optional().isISO8601(),
  body('content').optional().trim().notEmpty(),
  body('therapyProposal').optional().isString(),
];
