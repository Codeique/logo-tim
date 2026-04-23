# BACKEND.md

TypeScript/Express backend for LogoTim. PostgreSQL via Prisma, Socket.io for real-time, Jest for tests.

## Commands

```bash
npm run dev            # tsx watch (hot reload)
npm run build          # tsc → dist/
npm start              # node dist/index.js

npm run lint           # eslint src --ext .ts
npm run lint:fix

npm test               # jest --runInBand (all tests)
npm run test:watch
npm run test:coverage
# Run a single test file:
npx jest tests/integration/patients.routes.test.ts --runInBand

npm run db:push        # sync schema without migration history (dev/Docker)
npm run db:migrate     # prisma migrate dev (creates migration files — use for prod)
npm run db:seed        # tsx prisma/seed.js
npm run db:studio      # Prisma Studio GUI
```

## Entry point and middleware order

`src/index.ts` applies middleware in this exact order:  
`helmet → compression → cors → cookieParser → express.json → requestId → HTTP logger/Prometheus → rateLimiters → routes → health/ready/metrics → errorHandler`

`src/config/env.ts` **must be the first import** in `index.ts` — it validates all required env vars and throws on startup if any are missing or too short.

## Module pattern

Each module under `src/modules/<name>/` follows:

```
<name>.routes.ts      — express Router, applies authenticate/authorize + validation middleware
<name>.validation.ts  — express-validator chains (only for write endpoints)
<name>.controller.ts  — thin: parse req, call service or Prisma, call emitEvent, send response
<name>.service.ts     — only when logic is complex (multi-step writes, conflict checks)
```

Always call `next(err)` in controllers — never call `res.status(500).json(...)` directly. The errorHandler maps Prisma codes automatically: P2002 → 409, P2025 → 404, P2003 → 409.

## Auth

- `authenticate` (Bearer JWT) populates `req.user: { id: number; role: Role }`.
- `authorize(...roles)` returns 403 if `req.user.role` is not included. Always use Prisma `Role` enum, not string literals.
- Access token: 15 min. Refresh token: 7 days, stored as HttpOnly cookie and hashed (SHA-256) in `UserToken` table.
- `isTherapistRole(role)` from `src/lib/roles.ts` returns `true` for both `THERAPIST` and `CHIEF_THERAPIST`. Never do `role === 'THERAPIST'` inline.

## Prisma conventions

- `Decimal` fields (`hourlyRate`, `sessionPrice`, `accountBalance`) → call `.toNumber()`, never `parseFloat()`.
- Multi-step writes → `prisma.$transaction(async (tx) => { ... })` inside service files.
- `MilitaryRequest.status` is a **virtual computed field** via Prisma result extension in `src/lib/prisma.ts` — never stored in DB, never queried from DB column. Computed from `validFrom`/`validUntil`.
- `src/lib/prisma.ts` also logs slow queries (>500ms as `warn`, otherwise `debug`).

## Caching

**`src/lib/profileCache.ts`** — LRU (5 min TTL, max 500):  
- `getTherapistId(userId)` / `getPatientId(userId)` → profile ID  
- Call `invalidateTherapistId(userId)` / `invalidatePatientId(userId)` after mutations

**`src/lib/listCache.ts`** — LRU (60s TTL):  
- `getCachedRooms()` / `getCachedTherapists()`  
- Call `invalidateRoomCache()` / `invalidateTherapistCache()` after mutations

## Real-time

After every write, call `emitEvent(event, data)` from `src/socket.ts`.  
Event names: `patients:updated`, `sessions:updated`, `rooms:updated`, `therapists:updated`, `transactions:updated`, `evaluations:updated`, `militaryRequests:updated`, `finance:updated`.

## Audit logging

Most routes use the `auditLog(entity, action)` middleware (monkey-patches `res.json`).  
**Exception**: `PUT /patients/:id` writes the audit log manually in the controller to capture `oldValue` before the update. Do NOT also add the `auditLog` middleware to that route — it would double-log without the old value.

## Session completion

Completing a session is atomic via `completeSession(sessionId)` in `sessions.service.ts`:
1. Update session status to `COMPLETED`
2. Upsert `Finance` record (`therapistEarning = hourlyRate × durationHours`, `companyIncome = sessionPrice − therapistEarning`)
3. Decrement `remainingSessions` for civilian patients (clamped at 0); increment `usedSessions` on the active `MilitaryRequest` for military patients

Guard against double-completion: the service throws 409 if `status === 'COMPLETED'` already.

## Pagination

`parsePagination(req.query, maxLimit?)` from `src/lib/pagination.ts` → `{ skip, take, page, limit }`. Default limit 50, default max 100. Use this in every paginated list controller.

## Routes ordering note

`/patients/me` is registered **before** `/:id` in `patients.routes.ts` so Express does not treat the literal string `"me"` as a numeric ID param.

## Rate limits

- `/api/auth` — 20 req / 15 min
- `/api` (all other) — 300 req / 15 min
- `/api/travel-orders/generate` — 5 req / min (separate limiter on that router)

## Health / metrics endpoints

- `GET /health` — liveness, no DB check
- `GET /ready` — DB ping (`SELECT 1`), returns 503 on failure
- `GET /metrics` — Prometheus (prom-client default metrics + `http_request_duration_seconds` histogram)

## Testing

Tests live in `tests/` with three sub-patterns:

| Path | Pattern |
|------|---------|
| `tests/unit/` | Pure logic, no DB, no HTTP |
| `tests/services/` | Service functions with Prisma mock |
| `tests/integration/` | Full HTTP via `supertest` + Prisma mock |
| `tests/middleware/` | Middleware in isolation |

**Prisma mock** — `tests/__mocks__/prisma.ts` uses `jest-mock-extended` (`mockDeep<PrismaClient>()`). Jest's `moduleNameMapper` in `package.json` redirects all `lib/prisma` imports to this mock automatically.

**Test app** — `tests/__helpers__/app.ts` exports `buildTestApp()` — a minimal Express instance with all routes and errorHandler, used in integration tests with supertest. Auth is injected manually by each test (set `req.user` via a stub middleware).

**Setup file** — `tests/jest.setup.ts` sets required env vars (`JWT_SECRET`, etc.) before any module loads. Tests run with `--runInBand` to avoid port/mock conflicts.
