import request from 'supertest';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prismaMock from '../__mocks__/prisma';
import { buildTestApp } from '../__helpers__/app';
import { makeUser } from '../__helpers__/factories';

jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn().mockImplementation((req, _res, next) => {
    req.user = { id: 1, role: Role.ADMIN };
    next();
  }),
  authorize: jest.fn().mockReturnValue((_req: unknown, _res: unknown, next: () => void) => next()),
}));

const app = buildTestApp();

describe('POST /api/auth/login', () => {
  it('returns 200 + accessToken for valid credentials', async () => {
    const hashedPw = await bcrypt.hash('secret', 1);
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ password: hashedPw }) as any);
    prismaMock.user.update.mockResolvedValue(makeUser() as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.role).toBe(Role.ADMIN);
  });

  it('returns 401 for wrong password', async () => {
    const hashedPw = await bcrypt.hash('correctpassword', 1);
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ password: hashedPw }) as any);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'anything' });

    expect(res.status).toBe(401);
  });

  it('returns 422 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'secret' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears refresh cookie', async () => {
    prismaMock.user.update.mockResolvedValue(makeUser() as any);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 200 with user object for authenticated user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser() as any);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
  });

  it('returns 404 when user no longer exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer test');

    expect(res.status).toBe(404);
  });
});
