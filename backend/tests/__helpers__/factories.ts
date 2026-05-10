import { Role, SessionStatus, TransactionType } from '@prisma/client';

/** Mimics Prisma Decimal for test return values */
export const decimal = (value: number) =>
  ({ toNumber: () => value, toString: () => String(value) } as unknown as import('@prisma/client').Prisma.Decimal);

export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: 'admin@test.com',
  password: '$2b$10$hashedpassword',
  role: Role.ADMIN,
  refreshToken: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  therapist: null,
  patient: null,
  ...overrides,
});

export const makeTherapist = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 2,
  firstName: 'Ana',
  lastName: 'Petrović',
  email: 'ana@test.com',
  hourlyRate: decimal(50),
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  rooms: [],
  user: { email: 'ana@test.com', role: Role.THERAPIST },
  _count: { sessions: 0 },
  ...overrides,
});

export const makePatient = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: null,
  firstName: 'Marko',
  lastName: 'Nikolić',
  nickname: null,
  birthDate: null,
  phone: '0601234567',
  diagnosis: 'Test diagnosis',
  notes: null,
  sessionPrice: decimal(80),
  accountBalance: decimal(0),
  remainingSessions: 0,
  isActive: true,
  isMilitary: false,
  nationalId: null,
  insuranceHolder: null,
  medicalFileNumber: null,
  militaryPost: null,
  primaryTherapistId: 1,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  primaryTherapist: { id: 1, firstName: 'Ana', lastName: 'Petrović' },
  ...overrides,
});

export const makeSession = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  patientId: 1,
  therapistId: 1,
  roomId: 1,
  date: new Date('2025-06-01'),
  startTime: '10:00',
  duration: 60,
  status: SessionStatus.SCHEDULED,
  treatmentType: 'Terapeutski tretman',
  isPaid: false,
  report: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  patient: { id: 1, firstName: 'Marko', lastName: 'Nikolić' },
  therapist: { id: 1, firstName: 'Ana', lastName: 'Petrović' },
  room: { id: 1, name: 'Sala 1', isActive: true },
  finance: null,
  ...overrides,
});

export const makeRoom = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Sala 1',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const makeTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  patientId: 1,
  amount: decimal(160),
  type: TransactionType.PAYMENT,
  note: null,
  createdById: 1,
  createdAt: new Date('2024-01-01'),
  patient: { id: 1, firstName: 'Marko', lastName: 'Nikolić' },
  createdBy: { email: 'admin@test.com' },
  ...overrides,
});

export const makeFinance = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  sessionId: 1,
  therapistId: 1,
  therapistEarning: decimal(50),
  companyIncome: decimal(30),
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

export const makeMilitaryRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  patientId: 1,
  requestNumber: 'MR-001',
  status: 'ACTIVE' as const,
  totalSessions: 10,
  usedSessions: 2,
  validFrom: new Date('2025-01-01'),
  validUntil: new Date('2025-12-31'),
  note: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  patient: { firstName: 'Marko', lastName: 'Nikolić' },
  ...overrides,
});
