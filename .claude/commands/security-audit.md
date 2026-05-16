Security audit of: $ARGUMENTS

## Output

### Vulnerabilities Found
### Risk Level (Critical / High / Medium / Low)
### Fix Recommendations

## Project-specific security checks

**Authentication**
- JWT secrets loaded from `env.ts` and validated at startup (min 32 chars) — check they aren't short or reused
- Access tokens expire in 15 min; refresh tokens in 7 days as HttpOnly cookie — confirm `httpOnly: true` and `sameSite` are set on the cookie
- Refresh tokens stored as SHA-256 hash in `UserToken` table — verify raw token is never persisted
- `_retry` flag on axios prevents infinite 401 loops — confirm it's reset correctly

**Authorization / RBAC**
- All protected routes have `authenticate` + `authorize(Role.X)` middleware applied in the routes file
- `isTherapistRole(role)` used wherever THERAPIST + CHIEF_THERAPIST should both have access — `role === 'THERAPIST'` is a bug
- `PATIENT` role: can only access `/patients/me` and their own sessions/transactions — verify no endpoint returns other patients' data when called by a PATIENT
- Finance endpoint: must filter by `therapistId` at the DB level for therapist roles, not just in the frontend

**Input validation**
- Write endpoints have `express-validator` chains in `*.validation.ts` and apply the `validate` middleware
- Patient fields with financial impact (`sessionPrice`, `accountBalance`) — are updates restricted to ADMIN?
- `patientId` and `therapistId` in session creation — verify the referenced records exist (FK constraint handles it, but explicit 400 is better than 500)

**Data exposure**
- `AuditLog` endpoint restricted to ADMIN — it contains `oldValue`/`newValue` JSON with patient PII
- Patient `nationalId`, `insuranceHolder`, `medicalFileNumber`, `militaryPost` — confirm these are not returned in list endpoints, only in detail (`/patients/:id`)
- Error responses from `errorHandler` — confirm Prisma error details (table names, constraint names) are not leaked in production

**Injection**
- All DB access via Prisma parameterized queries — no raw SQL string concatenation
- If `prisma.$queryRaw` is used anywhere: verify it uses tagged template literals (safe), not string interpolation

**CSRF**
- Refresh token flow uses HttpOnly cookie — CSRF-safe only if `sameSite` attribute is set
- Mutations use `Authorization: Bearer` header (not cookie) — not vulnerable to CSRF

**Rules**
- Focus on real exploitable risks
- Flag anything that leaks patient medical or financial data
