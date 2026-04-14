# LogoTim — Therapy Center Management System

A production-ready fullstack system for managing a speech therapy / therapy center.

## Tech Stack

- **Frontend**: React 18 + Vite + Material UI
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT + Refresh Tokens
- **Real-time**: Socket.io
- **PDF**: PDFKit

## Quick Start (Development)

### Prerequisites
- Node.js 20+
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

## Docker (Production)

```bash
# Build and start all services
docker-compose up --build -d

# Run seed data
docker-compose exec backend node prisma/seed.js

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

App runs at: http://localhost

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

| Method | Path                      | Description                     |
|--------|---------------------------|---------------------------------|
| POST   | /api/auth/login           | Login                           |
| POST   | /api/auth/refresh         | Refresh token                   |
| POST   | /api/auth/logout          | Logout                          |
| GET    | /api/auth/me              | Current user                    |
| GET    | /api/patients             | List patients (paginated)       |
| POST   | /api/patients             | Create patient                  |
| GET    | /api/patients/:id         | Patient detail with relations   |
| PUT    | /api/patients/:id         | Update patient                  |
| GET    | /api/therapists           | List therapists                 |
| POST   | /api/therapists           | Create therapist                |
| GET    | /api/rooms                | List rooms                      |
| POST   | /api/rooms                | Create room                     |
| GET    | /api/sessions             | List sessions (filtered)        |
| POST   | /api/sessions             | Create session (conflict check) |
| PUT    | /api/sessions/:id         | Update session                  |
| GET    | /api/transactions         | List transactions               |
| POST   | /api/transactions         | Add payment/refund              |
| GET    | /api/evaluations          | List evaluations                |
| POST   | /api/evaluations          | Add evaluation                  |
| GET    | /api/military-requests    | List military requests          |
| POST   | /api/military-requests    | Create military request         |
| GET    | /api/finance              | Finance records                 |
| GET    | /api/travel-orders/generate | Generate travel order PDF    |
| GET    | /api/audit-logs           | Audit log (admin only)          |

---

## Roles & Permissions

| Feature              | Admin | Therapist | Patient |
|----------------------|-------|-----------|---------|
| All patients         | ✓     | Own only  | Self    |
| All therapists       | ✓     | —         | —       |
| Rooms management     | ✓     | —         | —       |
| Calendar             | ✓     | ✓         | —       |
| Sessions             | ✓     | Own       | Own     |
| Transactions         | ✓     | ✓ (add)   | View    |
| Finance              | ✓     | Own       | —       |
| Military requests    | ✓     | ✓         | View    |
| Audit logs           | ✓     | —         | —       |

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
# 1. Install Docker & Docker Compose
curl -fsSL https://get.docker.com | sh

# 2. Clone repo
git clone <repo> /opt/logotim && cd /opt/logotim

# 3. Configure environment
cp .env.example backend/.env
# Edit backend/.env with production values

# 4. Deploy
docker-compose up --build -d

# 5. Seed database
docker-compose exec backend node prisma/seed.js

# 6. Set up nginx reverse proxy (optional, if using domain)
# Point domain to server IP
# Configure SSL with certbot
```

### Environment Security Checklist
- [ ] Change JWT_SECRET to random 64-char string
- [ ] Change JWT_REFRESH_SECRET to different random 64-char string
- [ ] Change PostgreSQL password
- [ ] Set NODE_ENV=production
- [ ] Set FRONTEND_URL to your domain
- [ ] Enable HTTPS in production
