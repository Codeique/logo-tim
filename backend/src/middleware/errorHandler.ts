import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import logger from '../lib/logger';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

const errorHandler: ErrorRequestHandler = (err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Duplicate entry', field: err.meta?.target });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found' });
      return;
    }
    if (err.code === 'P2003') {
      res.status(409).json({ message: 'Referenced record does not exist or is in use' });
      return;
    }
  }

  logger.error(err.message, { stack: err.stack });

  const status = err.status ?? err.statusCode ?? 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export = errorHandler;
