import { body } from 'express-validator';

export const createRoomValidation = [
  body('name').trim().notEmpty().withMessage('Room name is required'),
];

export const updateRoomValidation = [
  body('name').optional().trim().notEmpty().withMessage('Room name cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];
