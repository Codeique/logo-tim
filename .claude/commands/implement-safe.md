Implement: $ARGUMENTS

Follow the existing plan or description. Modify only what is necessary.

## Output

### Summary of Changes
### Files Modified
### Key Logic Explained
### Edge Cases Handled

## Project conventions checklist

**Backend — every new write endpoint must:**
- [ ] Call `emitEvent('entity:updated', data)` from `src/socket.ts` after the write
- [ ] Use `authorize(Role.X)` with Prisma enum values, never string literals
- [ ] Use `isTherapistRole(role)` when checking therapist access — covers CHIEF_THERAPIST too
- [ ] Call `next(err)` on failure — never `res.status(500).json(...)` directly
- [ ] Use `parsePagination(req.query)` from `src/lib/pagination.ts` for list endpoints
- [ ] Add `auditLog(entity, action)` middleware to the route — **except** `PUT /patients/:id` which logs manually

**Backend — Prisma / data:**
- [ ] `Decimal` fields (`hourlyRate`, `sessionPrice`, `accountBalance`) → `.toNumber()`, never `parseFloat()`
- [ ] Multi-step writes → `prisma.$transaction(async (tx) => { ... })`
- [ ] Never read or write `MilitaryRequest.status` as a DB column — it is a virtual computed field
- [ ] Invalidate relevant LRU caches after mutations: `invalidateTherapistCache()`, `invalidatePatientId()`, etc.

**Frontend — new mutations must:**
- [ ] Use `api` (axios) directly for the mutation call
- [ ] NOT manually call `queryClient.invalidateQueries` — rely on Socket.io event → `useSocket` → auto-invalidation
- [ ] Use constants from `src/utils/statusConfig.js` for any chip labels or role display strings
- [ ] Use `formatCurrency()` from `src/utils/currency.js` for any monetary values
- [ ] Use `computeRequestStatus()` from `src/utils/militaryStatus.js` for military request status display

**Do NOT:**
- Rewrite unrelated code
- Introduce new npm dependencies without a clear reason
- Hardcode Serbian strings — use `statusConfig.js` constants
- Add `console.log` — use the Winston logger (`src/lib/logger.ts`) in backend code
