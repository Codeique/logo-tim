import { PrismaClient } from '@prisma/client';
import logger from './logger';

function computeMilitaryStatus(validFrom: Date, validUntil: Date): 'ACTIVE' | 'EXPIRED' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(validFrom); from.setHours(0, 0, 0, 0);
  const until = new Date(validUntil); until.setHours(23, 59, 59, 999);
  return today >= from && today <= until ? 'ACTIVE' : 'EXPIRED';
}

const base = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

base.$on('query', (e) => {
  const level = e.duration > 500 ? 'warn' : 'debug';
  logger.log(level, 'DB query', { duration: `${e.duration}ms`, query: e.query });
});
base.$on('warn', (e) => logger.warn('DB warn', { message: e.message }));
base.$on('error', (e) => logger.error('DB error', { message: e.message }));

const prisma = base.$extends({
  result: {
    militaryRequest: {
      status: {
        needs: { validFrom: true, validUntil: true },
        compute: (r) => computeMilitaryStatus(r.validFrom, r.validUntil),
      },
    },
  },
});

export = prisma;
