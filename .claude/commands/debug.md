Analyze and debug the issue described in $ARGUMENTS.

## Approach

1. Identify the layer where the problem originates (DB / backend / frontend / real-time)
2. Narrow down the root cause
3. Propose a targeted fix

## Output

### Possible Causes
### Most Likely Cause
### Fix
### How to Prevent Recurrence

## Project-specific debug checklist

**Prisma / DB**
- Prisma error codes: P2002 → duplicate (409), P2025 → not found (404), P2003 → FK violation (409)
- `Decimal` fields — always `.toNumber()`, never `parseFloat()`; check this on `hourlyRate`, `sessionPrice`, `accountBalance`
- `MilitaryRequest.status` is a virtual field (Prisma result extension) — never stored in DB; confusion here causes empty/stale values

**Auth / RBAC**
- `isTherapistRole(role)` covers both `THERAPIST` and `CHIEF_THERAPIST` — `role === 'THERAPIST'` is always wrong
- 401 on a protected route: check if `authenticate` middleware is applied in the routes file
- 403: check `authorize(...)` args use Prisma `Role` enum, not string literals

**Real-time**
- Socket.io event not triggering a UI refresh: confirm `emitEvent(...)` is called after the write in the controller
- Check `useSocket.js` event-to-query-key mapping — wrong key → stale cache stays

**Session completion**
- Double-completion guard throws 409 if status is already `COMPLETED`
- Balance not updating: check `isPaid` flag and whether patient `isMilitary` (military patients do not get balance deducted)

**React Query**
- Stale data after mutation: Socket.io invalidation should handle it; only add manual `invalidateQueries` if the event won't fire (e.g., delete)
- Wrong data shown: check query key — `['patient', id]` vs `['patients']` are separate caches
