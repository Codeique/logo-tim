import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  const level = e.duration > 500 ? 'warn' : 'debug';
  logger.log(level, 'DB query', { duration: `${e.duration}ms`, query: e.query });
});
prisma.$on('warn', (e) => logger.warn('DB warn', { message: e.message }));
prisma.$on('error', (e) => logger.error('DB error', { message: e.message }));

export = prisma;
