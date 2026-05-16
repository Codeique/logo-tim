import request from 'supertest';
import { Role, TransactionType } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildTestApp } from '../__helpers__/app';
import { makeTransaction, makePatient } from '../__helpers__/factories';

jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn(),
  authorize: jest.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../src/lib/profileCache', () => ({
  getTherapistId: jest.fn().mockResolvedValue(1),
  getPatientId: jest.fn().mockResolvedValue(1),
  invalidateTherapistId: jest.fn(),
  invalidatePatientId: jest.fn(),
}));

jest.mock('../../src/modules/transactions/transactions.service', () => ({
  applyPayment: jest.fn(),
}));

import { authenticate } from '../../src/middleware/auth';
import { applyPayment } from '../../src/modules/transactions/transactions.service';

const app = buildTestApp();

function asAdmin() {
  (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = { id: 1, role: Role.ADMIN };
    next();
  });
}

function asTherapist() {
  (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = { id: 2, role: Role.THERAPIST };
    next();
  });
}

describe('GET /api/transactions', () => {
  it('returns paginated transaction list for ADMIN', async () => {
    asAdmin();
    prismaMock.transaction.findMany.mockResolvedValue([makeTransaction()] as any);
    prismaMock.transaction.count.mockResolvedValue(1);

    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('scopes THERAPIST to their patients (SEC-06)', async () => {
    asTherapist();
    prismaMock.transaction.findMany.mockResolvedValue([] as any);
    prismaMock.transaction.count.mockResolvedValue(0);

    await request(app).get('/api/transactions');

    // The where clause should include patient.primaryTherapistId filter
    const findManyCall = prismaMock.transaction.findMany.mock.calls[0]?.[0];
    expect(findManyCall?.where?.patient).toEqual({ primaryTherapistId: 1 });
  });
});

describe('POST /api/transactions (BUG-02)', () => {
  it('creates a transaction via applyPayment and returns 201', async () => {
    asAdmin();
    const tx = makeTransaction();
    (applyPayment as jest.Mock).mockResolvedValue({
      transaction: tx,
      updatedPatient: makePatient({ remainingSessions: 2 }),
    });

    const res = await request(app)
      .post('/api/transactions')
      .send({ patientId: 1, amount: 160, type: TransactionType.PAYMENT });

    expect(res.status).toBe(201);
    expect(applyPayment).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 1, amount: 160, createdById: 1 }),
    );
  });

  it('returns 422 for invalid transaction type', async () => {
    asAdmin();

    const res = await request(app)
      .post('/api/transactions')
      .send({ patientId: 1, amount: 160, type: 'INVALID_TYPE' });

    expect(res.status).toBe(422);
  });
});
