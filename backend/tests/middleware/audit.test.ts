import { Request, Response, NextFunction } from 'express';
import prismaMock from '../__mocks__/prisma';
import { auditLog } from '../../src/middleware/audit';

const makeReq = (user?: { id: number }, params: Record<string, string> = {}): Partial<Request> => ({
  user: user as any,
  params,
  headers: {} as any,
  ip: undefined,
});

function makeRes(statusCode: number) {
  const jsonListeners: Array<(body: unknown) => void> = [];
  const res: Partial<Response> = {
    statusCode,
    json: jest.fn().mockImplementation(function (this: Response, body: unknown) {
      for (const fn of jsonListeners) fn(body);
      return this;
    }),
  };
  // Allow replacing res.json (middleware monkey-patches it)
  Object.defineProperty(res, 'json', {
    writable: true,
    value: res.json,
  });
  return res as Response;
}

const next = jest.fn() as NextFunction;

describe('auditLog middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.auditLog.create.mockResolvedValue({} as any);
  });

  it('writes an audit log after a 2xx response with a logged-in user', async () => {
    const req = makeReq({ id: 1 }) as Request;
    const res = makeRes(201);
    const middleware = auditLog('Patient', 'CREATE');

    middleware(req, res, next);
    // Trigger res.json (simulates controller sending response)
    res.json({ id: 5, firstName: 'Test' });

    // Fire-and-forget — give the micro-task queue a tick
    await Promise.resolve();

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          action: 'CREATE',
          entity: 'Patient',
          entityId: 5,
        }),
      }),
    );
  });

  it('does NOT write audit log when req.user is absent', async () => {
    const req = makeReq(undefined) as Request;
    const res = makeRes(201);
    const middleware = auditLog('Patient', 'CREATE');

    middleware(req, res, next);
    res.json({ id: 5 });
    await Promise.resolve();

    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('does NOT write audit log for 4xx responses', async () => {
    const req = makeReq({ id: 1 }) as Request;
    const res = makeRes(400);
    const middleware = auditLog('Patient', 'CREATE');

    middleware(req, res, next);
    res.json({ message: 'Bad request' });
    await Promise.resolve();

    expect(prismaMock.auditLog.create).not.toHaveBeenCalled();
  });

  it('calls next() to continue the middleware chain', () => {
    const req = makeReq({ id: 1 }) as Request;
    const res = makeRes(200);
    const middleware = auditLog('Patient', 'UPDATE');

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not throw if auditLog.create rejects (fire-and-forget)', async () => {
    prismaMock.auditLog.create.mockRejectedValue(new Error('DB error'));
    const req = makeReq({ id: 1 }) as Request;
    const res = makeRes(200);
    const middleware = auditLog('Patient', 'UPDATE');

    middleware(req, res, next);
    expect(() => res.json({ id: 1 })).not.toThrow();
    await Promise.resolve();
  });
});
