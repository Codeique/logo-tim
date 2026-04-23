import { Request, Response, NextFunction } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import errorHandler from '../../src/middleware/errorHandler';

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const req = {} as Request;
const next = jest.fn() as NextFunction;

function prismaError(code: string): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('test error', { code, clientVersion: '5.0.0' });
}

describe('errorHandler — Prisma errors', () => {
  it('maps P2002 (unique constraint) to 409', () => {
    const res = makeRes();
    errorHandler(prismaError('P2002'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps P2025 (record not found) to 404', () => {
    const res = makeRes();
    errorHandler(prismaError('P2025'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('maps P2003 (foreign key violation) to 409', () => {
    const res = makeRes();
    errorHandler(prismaError('P2003'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('errorHandler — generic errors', () => {
  it('uses err.statusCode if present', () => {
    const res = makeRes();
    const err = Object.assign(new Error('not found'), { statusCode: 404 });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('uses err.status if present', () => {
    const res = makeRes();
    const err = Object.assign(new Error('forbidden'), { status: 403 });
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('defaults to 500 for unrecognised errors', () => {
    const res = makeRes();
    errorHandler(new Error('something broke'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('includes the error message in the response body', () => {
    const res = makeRes();
    errorHandler(new Error('custom message'), req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'custom message' }));
  });
});
