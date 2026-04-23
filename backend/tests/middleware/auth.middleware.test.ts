import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../../src/middleware/auth';

const makeReq = (token?: string): Partial<Request> => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
  ip: '127.0.0.1',
  path: '/test',
  requestId: 'test-id',
  user: undefined as any,
});

const makeRes = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const next = jest.fn() as NextFunction;

const JWT_SECRET = process.env.JWT_SECRET!;

const validToken = jwt.sign({ userId: 1, role: Role.ADMIN }, JWT_SECRET, { expiresIn: '15m' });
const expiredToken = jwt.sign({ userId: 1, role: Role.ADMIN }, JWT_SECRET, { expiresIn: '-1s' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authenticate', () => {
  it('calls next() and sets req.user for a valid token', () => {
    const req = makeReq(validToken) as Request;
    const res = makeRes() as Response;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 1, role: Role.ADMIN });
  });

  it('responds 401 when Authorization header is missing', () => {
    const req = makeReq() as Request;
    const res = makeRes() as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 for an expired token', () => {
    const req = makeReq(expiredToken) as Request;
    const res = makeRes() as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 401 for a malformed token', () => {
    const req = makeReq('not.a.real.token') as Request;
    const res = makeRes() as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('responds 401 when header does not start with "Bearer "', () => {
    const req = { ...makeReq(), headers: { authorization: `Token ${validToken}` } } as unknown as Request;
    const res = makeRes() as Response;
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authorize', () => {
  const makeAuthedReq = (role: Role): Request =>
    ({ user: { id: 1, role } } as Request);

  it('calls next() when role is allowed', () => {
    const middleware = authorize(Role.ADMIN, Role.THERAPIST);
    middleware(makeAuthedReq(Role.ADMIN), makeRes() as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('responds 403 when role is not in the allowed list', () => {
    const middleware = authorize(Role.ADMIN);
    const res = makeRes() as Response;
    middleware(makeAuthedReq(Role.THERAPIST), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows CHIEF_THERAPIST when only THERAPIST is listed', () => {
    const middleware = authorize(Role.THERAPIST, Role.CHIEF_THERAPIST);
    middleware(makeAuthedReq(Role.CHIEF_THERAPIST), makeRes() as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
