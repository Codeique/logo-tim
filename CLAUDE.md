# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogoTim is a therapy center management system (speech therapy / logopedics). It's a fullstack monorepo with a React frontend and Node.js/Express backend, using PostgreSQL via Prisma ORM.

## Development Commands

### Backend (`cd backend`)
```bash
npm run dev          # Start with tsx watch (hot reload, TypeScript)
npm run build        # Compile TypeScript → dist/
npm start            # Start compiled dist/index.js (production)
npm run db:push      # Push schema changes to DB (no migration history)
npm run db:migrate   # Create and apply a migration (use for production changes)
npm run db:seed      # Seed demo data (tsx prisma/seed.ts)
npm run db:studio    # Open Prisma Studio GUI
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
```

### Docker (full stack)
```bash
docker-compose up --build -d
docker-compose exec backend npm run db:seed
docker-compose down
```

### Environment Setup
```bash
cp .env.example backend/.env
# Edit backend/.env — DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET are required
```

## Architecture

### Backend (`backend/src/`)
The backend is **TypeScript** (compiled to `dist/` via `tsc`, run with `tsx watch` in dev). CommonJS output (`"module": "commonjs"` in tsconfig).

- **`index.ts`** — Express app entry point; mounts all routes, middleware, and initializes Socket.io
- **`socket.ts`** — Socket.io singleton; exposes `emitEvent(event, data)` called from controllers after mutations
- **`config/env.ts`** — Startup env validation + exports typed constants (`PORT`, `JWT_SECRET`, etc.)
- **`lib/prisma.ts`** — Singleton `PrismaClient` (one instance for the entire process)
- **`lib/logger.ts`** — Singleton winston logger (JSON in production, colorized in dev)
- **`middleware/auth.ts`** — `authenticate` (JWT Bearer verification) and `authorize(...roles)` (RBAC) middleware
- **`middleware/audit.ts`** — Wraps `res.json` to fire-and-forget audit log writes to `AuditLog` table
- **`middleware/errorHandler.ts`** — Handles Prisma errors (P2002→409, P2025→404) and generic 500s
- **`middleware/validate.ts`** — Runs `validationResult` from express-validator, returns 422 on failure
- **`lib/roles.ts`** — `isTherapistRole(role)` helper; use instead of inline `[Role.THERAPIST, Role.CHIEF_THERAPIST].includes()` (TypeScript rejects the array form under strict mode)
- **`lib/pagination.ts`** — `parsePagination(query, maxLimit?)` returns `{ skip, take, page, limit }` with page=0 guard; use in all paginated list controllers
- **`lib/profileCache.ts`** — LRU cache for `userId → therapist/patient profile ID` (5 min TTL); use `getTherapistId(userId)` / `getPatientId(userId)` instead of inline `prisma.therapist.findUnique`
- **`lib/listCache.ts`** — LRU cache for room and therapist lists (60s TTL); use `getCachedRooms()` / `getCachedTherapists()` and invalidate on mutations
- **`modules/`** — 12 domain modules, each with `*.routes.ts`, `*.controller.ts`, and optionally `*.service.ts`; all write endpoints have `*.validation.ts`
- **`types/express.d.ts`** — Global augmentation: `req.user: { id: number; role: Role }`

### Frontend (`frontend/src/`)
- **`api/axios.js`** — Axios instance with base `/api`, auto-attaches JWT access token from Zustand store, and auto-refreshes via `/api/auth/refresh` on 401
- **`store/authStore.js`** — Zustand store (persisted to localStorage as `auth-storage`) holding `user`, `accessToken`, `refreshToken`
- **`hooks/useSocket.js`** — Singleton Socket.io client; listens to server events and calls `queryClient.invalidateQueries` to keep React Query caches fresh
- **`App.jsx`** — Route tree with `ProtectedRoute` component for auth + role guards
- **`pages/`** — One file per page; data fetching via React Query, mutations via axios
- **`components/`** — Shared UI components (Layout, etc.)
- **`theme.js`** — MUI theme factory supporting light/dark mode (toggled via localStorage `themeMode`)

### Data Flow Pattern
1. User action → React Query mutation → `api` axios instance → Express route
2. Controller → Prisma → DB, then `emitEvent(event)` → Socket.io broadcast
3. All clients → `useSocket` → `queryClient.invalidateQueries` → stale React Query data refetches

### Auth Flow
- Login returns `accessToken` (short-lived JWT) + `refreshToken` (long-lived)
- Both stored in Zustand persisted store
- Axios interceptor silently refreshes on 401 before retrying the failed request

### Database Schema Key Points
- `User` is the auth entity; `Therapist` and `Patient` are profiles linked 1:1 to `User` (nullable for patients without portal access)
- `Session` links Patient + Therapist + Room; has conflict-checking on create
- `Finance` is derived (one record per completed Session) tracking therapist earnings vs. company income
- Military patients have `isMilitary: true` + `MilitaryRequest` records with session allowances
- `AuditLog` captures old/new JSON values for admin review

### Roles
- `ADMIN` — full access
- `THERAPIST` / `CHIEF_THERAPIST` — own patients/sessions/finance
- `PATIENT` — self-service view only

## Key Conventions
- Backend is TypeScript compiled to CommonJS; frontend uses ES modules (`import`/`export`)
- Prisma `Decimal` fields (hourlyRate, sessionPrice, accountBalance) use `.toNumber()` — not `parseFloat()`
- All multi-step writes (session completion, payments) go through service functions using `prisma.$transaction`
- After any write operation, controllers call `emitEvent` with the appropriate event name (e.g., `sessions:updated`)
- Role scoping: use `isTherapistRole(req.user.role)` from `lib/roles.ts` — never `role === 'THERAPIST'` (misses CHIEF_THERAPIST) and never the array form (TypeScript strict rejects it)
- Route guards: use `authorize(Role.ADMIN, Role.THERAPIST)` — `authorize()` accepts `Role[]` type-checked against the Prisma enum; string literals also work but the enum is preferred
- `Transaction.type` is a `TransactionType` Prisma enum (PAYMENT | REFUND | ADJUSTMENT) — not a raw string
- Rate limiting: `/api/auth` at 20 req/15min; all `/api` at 300 req/15min; `/api/travel-orders/generate` at 5 req/min
- Health endpoints: `GET /health` (liveness, no DB), `GET /ready` (readiness + DB ping), `GET /metrics` (Prometheus)
- `prisma db push` is used in development and Docker (no migration files); use `prisma migrate dev` when migration history is needed — schema changes to `Transaction.type` enum require a migration before deploying to production
- `audit.ts` monkey-patches `res.json` with 2 intentional casts (binding + Prisma.InputJsonValue); all other casts in the codebase are avoidable and should not be added
- `MilitaryRequest.status` in the DB is not authoritative — always computed via `computeStatus(validFrom, validUntil)` on read; do not query the DB column directly
