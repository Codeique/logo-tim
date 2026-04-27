import { body } from 'express-validator';

const baseRules = [
  body('firstName').trim().notEmpty().withMessage('Ime je obavezno'),
  body('lastName').trim().notEmpty().withMessage('Prezime je obavezno'),
  body('nickname').trim().notEmpty().withMessage('Nadimak je obavezan'),
  body('birthDate').notEmpty().withMessage('Datum rođenja je obavezan').isISO8601().withMessage('birthDate must be ISO8601'),
  body('phone').trim().notEmpty().withMessage('Telefon je obavezan'),
  body('diagnosis').trim().notEmpty().withMessage('Dijagnoza je obavezna'),
  body('sessionPrice').notEmpty().withMessage('Cena tretmana je obavezna').isFloat({ min: 0 }).withMessage('sessionPrice must be ≥ 0'),
  body('therapistId').notEmpty().withMessage('Terapeut je obavezan').isInt({ min: 1 }).withMessage('therapistId must be a valid ID'),
  body('isMilitary').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('nationalId').if(body('isMilitary').equals('true')).trim().notEmpty().withMessage('Matični broj je obavezan za vojnog osiguranika'),
  body('insuranceHolder').if(body('isMilitary').equals('true')).trim().notEmpty().withMessage('Nosač osiguranja je obavezan za vojnog osiguranika'),
  body('medicalFileNumber').if(body('isMilitary').equals('true')).trim().notEmpty().withMessage('Broj kartona je obavezan za vojnog osiguranika'),
  body('militaryPost').if(body('isMilitary').equals('true')).trim().notEmpty().withMessage('Vojni pošt. je obavezan za vojnog osiguranika'),
];

export const createPatientValidation = baseRules;

export const updatePatientValidation = baseRules;
