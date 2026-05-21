import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}
if (process.env.JWT_SECRET!.length < 32)
  throw new Error('JWT_SECRET must be at least 32 characters');
if (process.env.JWT_REFRESH_SECRET!.length < 32)
  throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');

const env = {
  NODE_ENV:           process.env.NODE_ENV || 'development',
  PORT:               parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL:       process.env.FRONTEND_URL || 'http://localhost:5173',
  JWT_SECRET:         process.env.JWT_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  LOG_LEVEL:          process.env.LOG_LEVEL || 'info',
  INTERNAL_ONLY:      process.env.INTERNAL_ONLY === 'true',
} as const;

export = env;
