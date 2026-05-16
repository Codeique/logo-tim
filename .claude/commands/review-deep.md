Deep architecture and correctness review of: $ARGUMENTS

Go beyond surface issues — check architecture fit, invariant correctness, and hidden failure modes.

## Output

### Critical Issues
### High Priority Issues
### Medium Issues
### Low Issues
### Architecture Notes

## Deep review checklist

**Data integrity**
- Session completion: is it guarded against double-completion (409 if already COMPLETED)?
- `Finance` upsert: does `companyIncome = max(sessionPrice − therapistEarning, 0)` hold? Can it go negative?
- `accountBalance` and `remainingSessions` updated atomically inside `prisma.$transaction`?
- Military patients: `isMilitary` checked before decrementing `remainingSessions` and before deducting balance?

**Role & access correctness**
- Does every controller that returns filtered data check `req.user.role` — not just the route guard?
- `PATIENT` role: can they access any endpoint that leaks another patient's data?
- `THERAPIST` / `CHIEF_THERAPIST`: does the backend filter sessions to their assigned rooms, or is that frontend-only?
- Finance endpoint: does it filter by `therapistId` for therapist roles at the DB level?

**Real-time correctness**
- Is `emitEvent` called inside the success path only, not before the write completes?
- Are there writes (especially deletes) that skip `emitEvent`, leaving clients with stale cache?

**Caching correctness**
- After a therapist profile is updated, is `invalidateTherapistCache()` + `invalidateTherapistId(userId)` called?
- After a patient profile is updated, is `invalidatePatientId(userId)` called?
- LRU entries have TTLs (5 min for profiles, 60s for lists) — is stale data acceptable for this use case?

**Frontend state**
- `accessToken` stored in Zustand (memory only) — does anything accidentally persist it to `localStorage`?
- `useAuthStore.getState()` in non-component code (axios interceptors) — correct; subscribing via `useAuthStore(s => s.token)` in interceptors would not work

**Rules**
- Be strict — flag real risks, not style preferences
- Do NOT rewrite code in the review
