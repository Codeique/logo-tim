import { body } from 'express-validator';

export const createTherapistValidation = [
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('hourlyRate').optional().isFloat({ min: 0 }).withMessage('hourlyRate must be ≥ 0'),
  body('roomIds').optional().isArray(),
  body('roomIds.*').optional().isInt({ min: 1 }),
];

export const updateTherapistValidation = [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('roomIds').optional().isArray(),
  body('roomIds.*').optional().isInt({ min: 1 }),
];
