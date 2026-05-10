import request from 'supertest';
import { Role } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildTestApp } from '../__helpers__/app';
import { makePatient } from '../__helpers__/factories';

// Mock auth so we can control req.user per test
jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn(),
  authorize: jest.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next()),
}));

// Mock caches to avoid LRU state issues
jest.mock('../../src/lib/profileCache', () => ({
  getPatientId: jest.fn().mockResolvedValue(1),
  getTherapistId: jest.fn().mockResolvedValue(1),
  invalidatePatientId: jest.fn(),
  invalidateTherapistId: jest.fn(),
}));

import { authenticate } from '../../src/middleware/auth';

const app = buildTestApp();

function asAdmin() {
  (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = { id: 1, role: Role.ADMIN };
    next();
  });
}

const validPatientBody = {
  firstName: 'Marko',
  lastName: 'Nikolić',
  nickname: 'Mika',
  birthDate: '2000-01-15',
  phone: '0601234567',
  diagnosis: 'Disfazija',
  sessionPrice: 80,
  therapistId: 1,
};

describe('GET /api/patients', () => {
  it('returns paginated list for ADMIN', async () => {
    asAdmin();
    prismaMock.patient.findMany.mockResolvedValue([makePatient()] as any);
    prismaMock.patient.count.mockResolvedValue(1);

    const res = await request(app).get('/api/patients');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('calls patient.findMany with pagination skip/take', async () => {
    asAdmin();
    prismaMock.patient.findMany.mockResolvedValue([] as any);
    prismaMock.patient.count.mockResolvedValue(0);

    await request(app).get('/api/patients?page=2&limit=10');

    expect(prismaMock.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});

describe('POST /api/patients', () => {
  it('creates a patient and returns 201', async () => {
    asAdmin();
    const patient = makePatient();
    prismaMock.patient.create.mockResolvedValue(patient as any);

    const res = await request(app)
      .post('/api/patients')
      .send(validPatientBody);

    expect(res.status).toBe(201);
    expect(res.body.firstName).toBe('Marko');
  });

  it('returns 422 when required fields are missing', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/patients')
      .send({ firstName: 'Marko' });

    expect(res.status).toBe(422);
  });
});

describe('PUT /api/patients/:id (BUG-06 audit log)', () => {
  it('fetches old value then updates and writes audit log', async () => {
    asAdmin();
    const patient = makePatient();
    prismaMock.patient.findFirst.mockResolvedValue(patient as any);
    prismaMock.patient.update.mockResolvedValue({ ...patient, firstName: 'Updated' } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const res = await request(app)
      .put('/api/patients/1')
      .send(validPatientBody);

    expect(res.status).toBe(200);
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UPDATE',
          entity: 'Patient',
          entityId: 1,
          userId: 1,
        }),
      }),
    );
  });

  it('returns 404 if patient does not exist', async () => {
    asAdmin();
    prismaMock.patient.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/patients/999')
      .send(validPatientBody);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/patients/:id', () => {
  it('soft-deletes (deactivates) the patient', async () => {
    asAdmin();
    prismaMock.patient.findFirst.mockResolvedValue({ userId: null } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient({ isActive: false }) as any);

    const res = await request(app).delete('/api/patients/1');

    expect(res.status).toBe(200);
    expect(prismaMock.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
    );
  });
});

describe('PATCH /api/patients/:id/toggle-active', () => {
  it('toggles isActive from true to false', async () => {
    asAdmin();
    prismaMock.patient.findFirstOrThrow.mockResolvedValue({ isActive: true } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient({ isActive: false }) as any);

    const res = await request(app).patch('/api/patients/1/toggle-active');

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('toggles isActive from false to true', async () => {
    asAdmin();
    prismaMock.patient.findFirstOrThrow.mockResolvedValue({ isActive: false } as any);
    prismaMock.patient.update.mockResolvedValue(makePatient({ isActive: true }) as any);

    const res = await request(app).patch('/api/patients/1/toggle-active');

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(true);
  });
});

describe('GET /api/patients/me', () => {
  it('returns own profile for PATIENT role', async () => {
    (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { id: 5, role: Role.PATIENT };
      next();
    });
    prismaMock.patient.findUnique.mockResolvedValue(makePatient() as any);

    const res = await request(app).get('/api/patients/me');

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Marko');
  });
});
