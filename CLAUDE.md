# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LogoTim is a therapy center management system (speech therapy / logopedics). Fullstack monorepo: React 18 + Vite frontend, Node.js/Express backend, PostgreSQL via Prisma ORM, Socket.io for real-time updates.

## Development Commands

### Backend (`cd backend`)
```bash
npm run dev          # Start with tsx watch (hot reload, TypeScript)
npm run build        # Compile TypeScript → dist/
npm start            # Start compiled dist/index.js (production)
npm run db:push      # Push schema changes to DB (no migration history)
npm run db:migrate   # Create and apply a migration (use for production changes)
npm run db:seed      # Seed demo data (node prisma/seed.js)
npm run db:studio    # Open Prisma Studio GUI
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
```

### Docker (DB only)
```bash
docker-compose up -d          # Starts PostgreSQL 16 only; backend/frontend run locally
docker-compose down
```

### Environment Setup
```bash
cp .env.example backend/.env
# Edit backend/.env — DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET are required
```

## Architecture

### Backend (`backend/src/`)
TypeScript compiled to CommonJS (`"module": "commonjs"` in tsconfig), run with `tsx watch` in dev.

- **`index.ts`** — Express app entry; middleware order: helmet → compression → cors → cookieParser → express.json → requestId → logging/metrics → rate limiters → routes → health/ready/metrics → errorHandler
- **`socket.ts`** — Socket.io singleton; `emitEvent(event, data)` broadcasts to all connected clients
- **`config/env.ts`** — Startup env validation + typed constants
- **`middleware/auth.ts`** — `authenticate` (JWT Bearer) + `authorize(...roles)` (RBAC, 403 on failure)
- **`middleware/audit.ts`** — Monkey-patches `res.json` to fire-and-forget `AuditLog` writes on 2xx; has 2 intentional casts — do not add more casts elsewhere
- **`middleware/errorHandler.ts`** — Prisma error mapping: P2002→409, P2003→409, P2025→404; generic 500s
- **`middleware/validate.ts`** — Runs `validationResult`, returns 422 with errors array
- **`lib/roles.ts`** — `isTherapistRole(role)` matches both `THERAPIST` and `CHIEF_THERAPIST`; use this instead of any inline comparison
- **`lib/pagination.ts`** — `parsePagination(query, maxLimit?)` → `{ skip, take, page, limit }`; guards page=0; use in all paginated list controllers
- **`lib/profileCache.ts`** — LRU (5 min TTL, max 500): `getTherapistId(userId)` / `getPatientId(userId)` → profile ID; call invalidate functions after mutations
- **`lib/listCache.ts`** — LRU (60s TTL): `getCachedRooms()` / `getCachedTherapists()`; call invalidate functions after mutations
- **`types/express.d.ts`** — Augments `req.user: { id: number; role: Role }` and `req.requestId: string`

### Backend Modules (`backend/src/modules/`)
13 modules, each with `*.routes.ts` + `*.controller.ts`; write endpoints add `*.validation.ts`; complex logic adds `*.service.ts`.

| Module | Key routes |
|--------|-----------|
| `auth` | POST /login, /refresh, /logout; GET /me |
| `users` | GET /; POST /change-password |
| `patients` | GET /, /me, /:id; POST /; PUT /:id; DELETE /:id; PATCH /:id/toggle-active |
| `therapists` | GET /, /:id; POST /; PUT /:id; DELETE /:id |
| `rooms` | GET /; POST /; PUT /:id; DELETE /:id |
| `sessions` | GET /treatment-types, /, /:id; POST /; PUT /:id; DELETE /:id |
| `transactions` | GET /; POST / |
| `evaluations` | GET /; POST /; PUT /:id; DELETE /:id |
| `militaryRequests` | GET /; POST /; PUT /:id; DELETE /:id |
| `finance` | GET / |
| `travelOrders` | GET /generate (PDF via PDFKit, rate-limited 5/min) |
| `auditLogs` | GET / (ADMIN only) |

### Frontend (`frontend/src/`)
- **`api/axios.js`** — Axios instance, base `/api`, auto-attaches JWT from Zustand, auto-refreshes on 401
- **`store/authStore.js`** — Zustand store persisted to `localStorage` as `auth-storage`; holds `{ user, accessToken }`
- **`hooks/useSocket.js`** — Singleton Socket.io client; on each `*:updated` event calls `queryClient.invalidateQueries`
- **`App.jsx`** — Route tree; `ProtectedRoute` checks `accessToken` + optional `roles` prop
- **`pages/`** — One file per page; React Query for fetches, axios for mutations
- **`components/`** — Shared dialogs: `SessionFormDialog`, `PatientFormDialog`, `TherapistFormDialog`, `MilitaryRequestDialog`, `AddTransactionDialog`, `AddEvaluationDialog`; plus `Layout`
- **`theme.js`** — MUI theme factory; mode toggled via `localStorage` key `themeMode`

### Data Flow
1. User action → React Query mutation → `api` axios → Express route
2. Controller → Prisma → DB, then `emitEvent(event, data)` → Socket.io broadcast
3. All clients → `useSocket` → `queryClient.invalidateQueries` → React Query refetches

### Auth Flow
- Login returns `accessToken` (short-lived) + sets `refreshToken` as HttpOnly cookie
- `accessToken` stored in Zustand; axios interceptor auto-refreshes on 401 before retrying

### Database Schema Key Points
- `User` is the auth entity; `Therapist` and `Patient` are profiles linked 1:1 via `userId` (nullable — patients can exist without portal access)
- `Session` links Patient + Therapist + optional Room; conflict-checking on create/update
- `Finance` is one record per completed `Session` — tracks `therapistEarning` vs `companyIncome`
- Military patients: `isMilitary: true` + `MilitaryRequest` records (session allowances with `validFrom`/`validUntil`)
- `AuditLog` stores old/new JSON snapshots; `patients.controller.ts` writes it manually to capture `oldValue` before update

### Roles & Access
- `ADMIN` — full access to everything
- `THERAPIST` / `CHIEF_THERAPIST` — see all patients; calendar shows sessions in their assigned rooms (not just own sessions); finance shows own earnings only; no access to Transactions page
- `PATIENT` — dashboard shows own profile only (PatientDashboard component in Dashboard.jsx); no other pages visible

## Key Conventions
- Prisma `Decimal` fields (`hourlyRate`, `sessionPrice`, `accountBalance`) → use `.toNumber()`, not `parseFloat()`
- Multi-step writes (session completion, payments) → `prisma.$transaction` in service files
- Always call `emitEvent` after any write; event names: `patients:updated`, `sessions:updated`, `rooms:updated`, `therapists:updated`, `transactions:updated`, `evaluations:updated`, `militaryRequests:updated`, `finance:updated`
- Role scoping: `isTherapistRole(req.user.role)` from `lib/roles.ts` — never `role === 'THERAPIST'` (misses CHIEF_THERAPIST); never the array form (TypeScript strict rejects it)
- Route guards: `authorize(Role.ADMIN, Role.THERAPIST)` — Prisma enum preferred over string literals
- `Transaction.type` is a `TransactionType` Prisma enum (PAYMENT | REFUND | ADJUSTMENT) — not a raw string
- `MilitaryRequest.status` in DB is not authoritative — always compute via `computeStatus(validFrom, validUntil)` on read; never query the DB column directly
- Rate limits: `/api/auth` 20 req/15min; `/api` 300 req/15min; `/api/travel-orders/generate` 5 req/min
- Health endpoints: `GET /health` (liveness, no DB), `GET /ready` (DB ping), `GET /metrics` (Prometheus)
- `db push` for dev/Docker; `prisma migrate dev` when migration history matters — enum changes require a migration before production deploy
- `/patients/me` must be registered before `/:id` in routes.ts to prevent Express treating "me" as a numeric ID param
