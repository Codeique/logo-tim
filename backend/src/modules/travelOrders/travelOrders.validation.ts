import { query } from 'express-validator';

export const generateValidation = [
  query('patientId').isInt({ min: 1 }).withMessage('Valid patientId required'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('month must be between 1 and 12'),
  query('year').isInt({ min: 2000, max: 2100 }).withMessage('year must be between 2000 and 2100'),
];
