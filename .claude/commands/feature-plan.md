Plan the implementation of: $ARGUMENTS

You are a senior software architect. Produce a concrete plan before any code is written.

## Output

### Feature Goal

### Affected Backend Modules
List which files under `backend/src/modules/<name>/` need to change or be created.

### Affected Frontend Components
List pages, dialogs, hooks, and utilities that need to change.

### Prisma Schema Changes
- New models / fields / enums?
- If adding an enum value: requires `prisma migrate dev`, not just `db push`
- If adding a Decimal field: ensure `.toNumber()` is used everywhere it's read

### API Changes
New or modified routes. For each: method, path, authorize roles, request body, response shape.

### Implementation Plan
Ordered steps. Each step should be independently deployable or at least testable.

### Real-time
Which `emitEvent(...)` call needs to be added/changed? Which React Query keys does `useSocket.js` need to invalidate?

### Role & Access Control
- Which roles can call new endpoints? Use Prisma `Role` enum in `authorize()`
- Does the frontend `ProtectedRoute` need a `roles` prop updated?
- Does the backend need an `isTherapistRole()` check for therapist-scoped data?

### Risks

## Rules
- Do NOT write code
- Prefer adding to existing modules over creating new ones
- Every write endpoint must call `emitEvent` — plan which event name to use
- Every new paginated endpoint must use `parsePagination()` from `src/lib/pagination.ts`
- New financial fields (`Decimal` in Prisma) need `.toNumber()` in every controller/service that reads them
