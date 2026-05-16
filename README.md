# LogoTim — Therapy Center Management System

A production-ready fullstack system for managing a speech therapy / therapy center.

## Documentation

| File | Audience | Contents |
|------|----------|----------|
| [`CLAUDE.md`](CLAUDE.md) | AI / contributors | Architecture, data flow, roles, cross-cutting conventions |
| [`backend/BACKEND.md`](backend/BACKEND.md) | Backend developers | Commands, module pattern, Prisma conventions, caching, testing |
| [`frontend/FRONTEND.md`](frontend/FRONTEND.md) | Frontend developers | Commands, state management, routing, utils, testing |
| [`README.md`](README.md) *(this file)* | Everyone | Setup, environment variables, API reference, deployment |

---

## Tech Stack

- **Frontend**: React 18 + Vite + Material UI v5
- **Backend**: Node.js 22 + Express 5 + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (15 min access) + Refresh Tokens (7 day HttpOnly cookie)
- **Real-time**: Socket.io
- **PDF**: PDFKit

## Quick Start (Development)

### Prerequisites
- Node.js 22+
- PostgreSQL 14+ running locally

### 1. Clone & Setup

```bash
git clone <repo> logotim && cd logotim
```

### 2. Backend Setup

```bash
cd backend
cp ../.env.example .env
# Edit .env with your DATABASE_URL and JWT secrets
npm install
npx prisma db push
node prisma/seed.js
npm run dev
```

### 3. Frontend Setup (new terminal)

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:5173

---

## Demo Credentials

| Role      | Email                   | Password |
|-----------|-------------------------|----------|
| Admin     | admin@test.com          | 123456   |
| Therapist | therapist@test.com      | 123456   |
| Patient   | patient@test.com        | 123456   |

---

## Docker (Database)

The `docker-compose.yml` starts **PostgreSQL 16 only**. Backend and frontend run locally.

```bash
docker-compose up -d      # Start PostgreSQL
docker-compose down       # Stop
```

To run the full stack on a server, deploy backend and frontend as separate processes or containers pointed at the Postgres instance.

---

## Environment Variables

| Variable            | Description                          | Example                              |
|---------------------|--------------------------------------|--------------------------------------|
| DATABASE_URL        | PostgreSQL connection string         | postgresql://user:pass@host:5432/db  |
| JWT_SECRET          | JWT signing secret (min 32 chars)   | random-32-char-string                |
| JWT_REFRESH_SECRET  | Refresh token secret (min 32 chars) | another-32-char-string               |
| PORT                | Backend port                         | 3001                                 |
| NODE_ENV            | Environment                          | production                           |
| FRONTEND_URL        | Frontend URL for CORS                | http://localhost:5173                |

---

## Database Seed

```bash
cd backend && node prisma/seed.js
```

Seeds:
- 1 admin user
- 3 therapists
- 10 patients (2 military)
- 4 rooms
- 25 demo sessions
- 15 demo transactions
- Military requests & evaluations

---

## API Endpoints

### Auth
| Method | Path                      | Description                     |
|--------|---------------------------|---------------------------------|
| POST   | /api/auth/login           | Login                           |
| POST   | /api/auth/refresh         | Refresh access token            |
| POST   | /api/auth/logout          | Logout (clears cookie)          |
| GET    | /api/auth/me              | Current user                    |

### Patients
| Method | Path                         | Description                          |
|--------|------------------------------|--------------------------------------|
| GET    | /api/patients                | List patients (paginated, searchable)|
| POST   | /api/patients                | Create patient                       |
| GET    | /api/patients/me             | Own patient profile (PATIENT role)   |
| GET    | /api/patients/:id            | Patient detail with relations        |
| PUT    | /api/patients/:id            | Update patient (writes audit log)    |
| DELETE | /api/patients/:id            | Delete patient                       |
| PATCH  | /api/patients/:id/toggle-active | Toggle patient active status      |

### Therapists
| Method | Path                      | Description                     |
|--------|---------------------------|---------------------------------|
| GET    | /api/therapists           | List therapists                 |
| POST   | /api/therapists           | Create therapist                |
| GET    | /api/therapists/:id       | Therapist detail                |
| PUT    | /api/therapists/:id       | Update therapist                |
| DELETE | /api/therapists/:id       | Delete therapist                |

### Rooms
| Method | Path                      | Description                     |
|--------|---------------------------|---------------------------------|
| GET    | /api/rooms                | List rooms                      |
| POST   | /api/rooms                | Create room                     |
| GET    | /api/rooms/:id            | Room detail                     |
| PUT    | /api/rooms/:id            | Update room                     |
| DELETE | /api/rooms/:id            | Delete room                     |

### Sessions
| Method | Path                      | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/sessions             | List sessions (filtered by date/role)|
| POST   | /api/sessions             | Create session (conflict check)      |
| GET    | /api/sessions/:id         | Session detail                       |
| PUT    | /api/sessions/:id         | Update session                       |
| DELETE | /api/sessions/:id         | Delete session                       |

### Transactions
| Method | Path                      | Description                     |
|--------|---------------------------|---------------------------------|
| GET    | /api/transactions         | List transactions               |
| POST   | /api/transactions         | Add payment / refund            |

### Evaluations
| Method | Path                      | Description                     |
|--------|---------------------------|---------------------------------|
| GET    | /api/evaluations          | List evaluations                |
| POST   | /api/evaluations          | Add evaluation                  |
| PUT    | /api/evaluations/:id      | Update evaluation               |
| DELETE | /api/evaluations/:id      | Delete evaluation               |

### Military Requests
| Method | Path                         | Description                     |
|--------|------------------------------|---------------------------------|
| GET    | /api/military-requests       | List military requests          |
| POST   | /api/military-requests       | Create military request         |
| PUT    | /api/military-requests/:id   | Update military request         |
| DELETE | /api/military-requests/:id   | Delete military request         |

### Finance & Other
| Method | Path                        | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | /api/finance                | Finance records (role-filtered) |
| GET    | /api/travel-orders/generate | Generate travel order PDF       |
| GET    | /api/audit-logs             | Audit log (admin only)          |

### Health
| Method | Path      | Description                          |
|--------|-----------|--------------------------------------|
| GET    | /health   | Liveness (no DB check)               |
| GET    | /ready    | Readiness (DB ping, 503 on failure)  |
| GET    | /metrics  | Prometheus metrics                   |

---

## Roles & Permissions

| Feature              | Admin | Therapist / Chief Therapist | Patient      |
|----------------------|-------|-----------------------------|--------------|
| All patients         | ✓     | ✓ (all)                     | Self only    |
| All therapists       | ✓     | —                           | —            |
| Rooms management     | ✓     | —                           | —            |
| Calendar             | ✓     | Room sessions (own rooms)   | —            |
| Sessions             | ✓     | Own + room occupancy        | Own          |
| Transactions page    | ✓     | —                           | —            |
| Finance              | ✓     | Own earnings only           | —            |
| Military requests    | ✓     | ✓                           | View         |
| Audit logs           | ✓     | —                           | —            |
| Dashboard            | ✓     | ✓                           | Profile only |

---

## Real-time Events (Socket.io)

Events emitted on data changes:
- `patients:updated`
- `therapists:updated`
- `rooms:updated`
- `sessions:updated`
- `transactions:updated`
- `evaluations:updated`
- `militaryRequests:updated`
- `finance:updated`

Frontend subscribes via `useSocket` hook and invalidates React Query caches automatically.

---

## Deployment Guide

### VPS / Cloud VM

```bash
# 1. Install Node.js 20+, PostgreSQL, and optionally Docker

# 2. Clone repo
git clone <repo> /opt/logotim && cd /opt/logotim

# 3. Configure environment
cp .env.example backend/.env
# Edit backend/.env with production values (DATABASE_URL, JWT secrets, NODE_ENV=production)

# 4. Start database (or use a managed PostgreSQL service)
docker-compose up -d   # starts PostgreSQL only

# 5. Install and build
cd backend && npm install && npm run build && npx prisma db push && node prisma/seed.js
cd ../frontend && npm install && npm run build

# 6. Serve
# Backend: node dist/index.js (or use pm2/systemd)
# Frontend: serve -s dist, or point nginx at the dist/ folder
# Configure nginx reverse proxy + SSL (certbot) for production
```

### Environment Security Checklist
- [ ] Change JWT_SECRET to random 64-char string
- [ ] Change JWT_REFRESH_SECRET to different random 64-char string
- [ ] Change PostgreSQL password
- [ ] Set NODE_ENV=production
- [ ] Set FRONTEND_URL to your domain
- [ ] Enable HTTPS in production
