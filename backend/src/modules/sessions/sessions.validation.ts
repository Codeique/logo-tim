import { body } from 'express-validator';

export const createSessionValidation = [
  body('patientId').isInt({ min: 1 }).withMessage('Valid patientId required'),
  body('therapistId').isInt({ min: 1 }).withMessage('Valid therapistId required'),
  body('date').isISO8601().withMessage('Valid date (ISO8601) required'),
  body('startTime').matches(/^\d{2}:\d{2}$/).withMessage('startTime must be HH:MM'),
  body('duration').isInt({ min: 15, max: 480 }).withMessage('Duration must be 15–480 minutes'),
  body('roomId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('roomId must be a positive integer'),
  body('treatmentType').optional({ nullable: true }).isString(),
];

export const updateSessionValidation = [
  body('patientId').optional().isInt({ min: 1 }),
  body('therapistId').optional().isInt({ min: 1 }),
  body('date').optional().isISO8601(),
  body('startTime').optional().matches(/^\d{2}:\d{2}$/),
  body('duration').optional().isInt({ min: 15, max: 480 }),
  body('roomId').optional({ nullable: true }).isInt({ min: 1 }),
  body('treatmentType').optional({ nullable: true }).isString(),
  body('isPaid').optional().isBoolean(),
  body('report').optional().isString(),
];
