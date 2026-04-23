// Must run before any module loads so dotenv (in config/env.ts) doesn't override these
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-minimum-32!!';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
