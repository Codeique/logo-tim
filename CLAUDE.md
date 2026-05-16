# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation map

| File | Purpose |
|------|---------|
| `CLAUDE.md` *(this file)* | Cross-cutting architecture, data flow, roles, key conventions |
| [`backend/BACKEND.md`](backend/BACKEND.md) | Backend commands, module pattern, testing, caching, Prisma conventions |
| [`frontend/FRONTEND.md`](frontend/FRONTEND.md) | Frontend commands, state management, routing, utils, testing |
| [`README.md`](README.md) | Setup, environment variables, API reference, deployment |

## Project Overview

LogoTim is a therapy center management system (speech therapy / terapeutics). Fullstack monorepo: React 18 + Vite frontend, Node.js/Express backend, PostgreSQL via Prisma ORM, Socket.io for real-time updates.

## Development Commands

### Backend (`cd backend`)
```bash
npm run dev          # tsx watch (hot reload, TypeScript)
npm run build        # tsc → dist/
npm test             # jest --runInBand
npm run lint
npm run db:push      # sync schema to DB (dev/Docker, no migration history)
npm run db:migrate   # create + apply migration (use for prod / enum changes)
npm run db:seed      # seed demo data
```

### Frontend (`cd frontend`)
```bash
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # production build
npm run test:run     # vitest run (CI)
```

### Docker (DB only)
```bash
docker-compose up -d   # starts PostgreSQL 16 only; backend/frontend run locally
```

### Environment Setup
```bash
cp .env.example backend/.env
# Edit backend/.env — DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET are required
```

## Architecture

### Data Flow
1. User action → React Query fetch / axios mutation → `/api` (Express route)
2. Controller validates, writes via Prisma, then calls `emitEvent(event, data)` → Socket.io broadcast
3. All connected clients → `useSocket` hook → `queryClient.invalidateQueries` → React Query refetches

### Auth Flow
- Login returns `accessToken` (15 min) + sets `refreshToken` as HttpOnly cookie (7 days)
- `accessToken` stored in Zustand (memory only — not persisted); axios interceptor auto-refreshes on 401
- On page load, `App.jsx` attempts `POST /api/auth/refresh` to restore session from the cookie
- Refresh tokens are hashed (SHA-256) before storage in the `UserToken` table

### Backend structure
Express app entry is `backend/src/index.ts`. Middleware order: `helmet → compression → cors → cookieParser → express.json → requestId → HTTP logger/Prometheus → rate limiters → routes → health/ready/metrics → errorHandler`.

Each module under `src/modules/<name>/` follows: `routes → controller → (service) → (validation)`. Modules: `auth`, `patients`, `therapists`, `rooms`, `sessions`, `transactions`, `evaluations`, `militaryRequests`, `finance`, `travelOrders`, `auditLogs`, `users`. See [`backend/BACKEND.md`](backend/BACKEND.md) for the full module reference, testing setup, and caching details.

### Frontend structure
React Router v6 with nested routes. `ProtectedRoute` checks `accessToken` + optional `roles` prop. Socket.io is a singleton connected once in `App.jsx` via `useSocket()`.

See [`frontend/FRONTEND.md`](frontend/FRONTEND.md) for state management, React Query conventions, route-to-role mapping, and utility functions.

### Database Schema Key Points
- `User` is the auth entity; `Therapist` and `Patient` are profiles linked 1:1 via `userId` (nullable — patients can exist without portal access)
- `Session` links Patient + Therapist + optional Room; conflict-checking runs on create/update
- `Finance` is one record per completed `Session` — tracks `therapistEarning` vs `companyIncome`
- Military patients: `isMilitary: true` + `MilitaryRequest` records (session allowances with `validFrom`/`validUntil`)
- `AuditLog` stores old/new JSON snapshots; `patients.controller.ts` writes it manually to capture `oldValue` before update

### Roles & Access
- `ADMIN` — full access to everything
- `THERAPIST` / `CHIEF_THERAPIST` — see all patients; calendar shows sessions in their assigned rooms; finance shows own earnings only; no access to Transactions page
- `PATIENT` — dashboard shows own profile only (`PatientDashboard` in `Dashboard.jsx`); no other pages

Note: `/finance` route intentionally excludes `CHIEF_THERAPIST` from the frontend `ProtectedRoute` — therapists see only their own earnings via backend role filter.

## Key Conventions

### Backend
- Prisma `Decimal` fields (`hourlyRate`, `sessionPrice`, `accountBalance`) → `.toNumber()`, never `parseFloat()`
- Multi-step writes → `prisma.$transaction` in service files
- `isTherapistRole(req.user.role)` from `lib/roles.ts` — never `role === 'THERAPIST'` (misses CHIEF_THERAPIST)
- Route guards: `authorize(Role.ADMIN, Role.THERAPIST)` — use Prisma enum, not string literals
- Always call `emitEvent` after any write — event names: `patients:updated`, `sessions:updated`, `rooms:updated`, `therapists:updated`, `transactions:updated`, `evaluations:updated`, `militaryRequests:updated`, `finance:updated`
- `MilitaryRequest.status` is a virtual computed field (Prisma result extension in `lib/prisma.ts`) — never stored in or queried from the DB column
- `db push` for dev/Docker; `prisma migrate dev` when migration history matters — enum changes require a migration before production deploy
- `/patients/me` must be registered before `/:id` in routes to prevent Express treating `"me"` as a numeric ID param
- `PUT /patients/:id` writes the audit log manually (to capture `oldValue`); do NOT also attach the `auditLog` middleware to that route

### Frontend
- All reads use React Query; mutations use `api` (axios) directly and rely on Socket.io events for cache invalidation
- Military request status for display: use `computeRequestStatus(validFrom, validUntil)` from `utils/militaryStatus.js` — not the API `status` field
- Chip labels, colors, and role display: use constants from `utils/statusConfig.js` (`SESSION_STATUS`, `ROLE_CONFIG`, `TRANSACTION_TYPE`) — never hardcode Serbian strings inline
- Currency formatting: `formatCurrency(value)` from `utils/currency.js` → Serbian RSD locale
