import request from 'supertest';
import { Role } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildTestApp } from '../__helpers__/app';
import { makeMilitaryRequest } from '../__helpers__/factories';

const RequestStatus = { ACTIVE: 'ACTIVE', EXPIRED: 'EXPIRED' } as const;

jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn().mockImplementation((req, _res, next) => {
    req.user = { id: 1, role: Role.ADMIN };
    next();
  }),
  authorize: jest.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('../../src/lib/profileCache', () => ({
  getPatientId: jest.fn().mockResolvedValue(1),
  getTherapistId: jest.fn().mockResolvedValue(1),
  invalidatePatientId: jest.fn(),
  invalidateTherapistId: jest.fn(),
}));

const app = buildTestApp();

describe('GET /api/military-requests (BUG-08 — status computed on read)', () => {
  it('returns ACTIVE status for requests within date range', async () => {
    const today = new Date();
    const from = new Date(today);
    from.setMonth(from.getMonth() - 1);
    const until = new Date(today);
    until.setMonth(until.getMonth() + 1);

    // Store stale EXPIRED in DB — controller must recompute
    const staleRecord = makeMilitaryRequest({
      status: RequestStatus.EXPIRED,
      validFrom: from,
      validUntil: until,
    });
    prismaMock.militaryRequest.findMany.mockResolvedValue([staleRecord] as any);

    const res = await request(app).get('/api/military-requests');

    expect(res.status).toBe(200);
    expect(res.body[0].status).toBe(RequestStatus.ACTIVE);
  });

  it('returns EXPIRED status for requests outside date range', async () => {
    const past = new Date('2020-01-01');
    const pastEnd = new Date('2020-06-01');

    const staleRecord = makeMilitaryRequest({
      status: RequestStatus.ACTIVE,
      validFrom: past,
      validUntil: pastEnd,
    });
    prismaMock.militaryRequest.findMany.mockResolvedValue([staleRecord] as any);

    const res = await request(app).get('/api/military-requests');

    expect(res.status).toBe(200);
    expect(res.body[0].status).toBe(RequestStatus.EXPIRED);
  });
});

describe('POST /api/military-requests', () => {
  it('creates a military request with computed status and returns 201', async () => {
    const today = new Date();
    const from = new Date(today);
    from.setMonth(from.getMonth() - 1);
    const until = new Date(today);
    until.setMonth(until.getMonth() + 1);

    const record = makeMilitaryRequest({ validFrom: from, validUntil: until });
    prismaMock.militaryRequest.create.mockResolvedValue(record as any);

    const res = await request(app)
      .post('/api/military-requests')
      .send({
        patientId: 1,
        requestNumber: 'MR-001',
        validFrom: from.toISOString(),
        validUntil: until.toISOString(),
        totalSessions: 10,
      });

    expect(res.status).toBe(201);
  });
});

describe('DELETE /api/military-requests/:id', () => {
  it('deletes the request and returns 200', async () => {
    prismaMock.militaryRequest.delete.mockResolvedValue(makeMilitaryRequest() as any);

    const res = await request(app).delete('/api/military-requests/1');

    expect(res.status).toBe(200);
    expect(prismaMock.militaryRequest.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
