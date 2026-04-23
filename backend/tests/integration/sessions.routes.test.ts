import request from 'supertest';
import { Role, SessionStatus } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildTestApp } from '../__helpers__/app';
import { makeSession, makePatient, makeFinance } from '../__helpers__/factories';

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

// Mock the conflict checks so we can control them per test
jest.mock('../../src/modules/sessions/sessions.service', () => ({
  checkRoomConflict: jest.fn().mockResolvedValue(false),
  checkTherapistConflict: jest.fn().mockResolvedValue(false),
  completeSession: jest.fn(),
}));

import { authenticate } from '../../src/middleware/auth';
import { checkRoomConflict, checkTherapistConflict, completeSession } from '../../src/modules/sessions/sessions.service';

const app = buildTestApp();

beforeEach(() => {
  jest.clearAllMocks();
  // Re-apply default behaviours after clearAllMocks
  asAdmin();
  (checkRoomConflict as jest.Mock).mockResolvedValue(false);
  (checkTherapistConflict as jest.Mock).mockResolvedValue(false);
});

function asAdmin() {
  (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
    req.user = { id: 1, role: Role.ADMIN };
    next();
  });
}

const newSessionBody = {
  patientId: 1,
  therapistId: 1,
  roomId: 1,
  date: '2025-06-01',
  startTime: '10:00',
  duration: 60,
};

describe('GET /api/sessions', () => {
  it('returns session list', async () => {
    asAdmin();
    prismaMock.session.findMany.mockResolvedValue([makeSession()] as any);
    prismaMock.session.count.mockResolvedValue(1);

    const res = await request(app).get('/api/sessions');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/sessions', () => {
  it('creates a session and returns 201', async () => {
    asAdmin();
    const session = makeSession();
    prismaMock.session.create.mockResolvedValue(session as any);

    const res = await request(app).post('/api/sessions').send(newSessionBody);

    expect(res.status).toBe(201);
    expect(prismaMock.session.create).toHaveBeenCalledTimes(1);
  });

  it('returns 409 when room has a conflict', async () => {
    asAdmin();
    (checkRoomConflict as jest.Mock).mockResolvedValueOnce(true);

    const res = await request(app).post('/api/sessions').send(newSessionBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/room/i);
  });

  it('returns 409 when therapist has a conflict', async () => {
    asAdmin();
    (checkTherapistConflict as jest.Mock).mockResolvedValueOnce(true);

    const res = await request(app).post('/api/sessions').send(newSessionBody);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/therapist/i);
  });
});

describe('PUT /api/sessions/:id — complete session (DI-04)', () => {
  it('delegates to completeSession service and returns updated session', async () => {
    asAdmin();
    const completedSession = makeSession({ status: SessionStatus.COMPLETED });
    // Existing session is SCHEDULED
    prismaMock.session.findUnique
      .mockResolvedValueOnce(makeSession({ status: SessionStatus.SCHEDULED }) as any)
      .mockResolvedValueOnce(completedSession as any);

    (completeSession as jest.Mock).mockResolvedValue({
      session: completedSession,
      finance: makeFinance(),
      patient: makePatient(),
    });

    const res = await request(app)
      .put('/api/sessions/1')
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(completeSession).toHaveBeenCalledWith(1);
  });

  it('skips re-completion when session is already COMPLETED', async () => {
    asAdmin();
    // Both findUnique calls return COMPLETED
    prismaMock.session.findUnique.mockResolvedValue(makeSession({ status: SessionStatus.COMPLETED }) as any);
    prismaMock.session.update.mockResolvedValue(makeSession({ status: SessionStatus.COMPLETED }) as any);

    const res = await request(app)
      .put('/api/sessions/1')
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    // completeSession should NOT be called a second time
    expect(completeSession).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/sessions/:id', () => {
  it('cancels the session (sets status to CANCELED)', async () => {
    asAdmin();
    prismaMock.session.update.mockResolvedValue(makeSession({ status: SessionStatus.CANCELED }) as any);

    const res = await request(app).delete('/api/sessions/1');

    expect(res.status).toBe(200);
    expect(prismaMock.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: SessionStatus.CANCELED } }),
    );
  });
});
