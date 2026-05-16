Analyze performance for: $ARGUMENTS

## Output

### Issues Found
### Impact (High / Medium / Low)
### Optimization Suggestions

## Project-specific checks

**Prisma / DB**
- N+1 queries: are related records fetched with `include` in a single query, or with multiple `.findMany` calls in a loop?
- Session conflict detection uses a raw SQL overlap query — adding `include` clauses here can be expensive; keep the conflict check lean
- Large patient lists: `parsePagination()` must be used; confirm `skip`/`take` are passed to `findMany`
- Missing DB indexes on frequently filtered fields (e.g., `patientId`, `therapistId`, `date` on Session)

**Caching**
- `getTherapistId(userId)` / `getPatientId(userId)` from `src/lib/profileCache.ts` — are repeated userId → profileId lookups hitting the cache or bypassing it?
- `getCachedRooms()` / `getCachedTherapists()` from `src/lib/listCache.ts` (60s TTL) — are list endpoints that could use these still hitting DB on every request?
- After mutations: confirm `invalidateTherapistCache()` / `invalidateRoomCache()` / `invalidatePatientId()` etc. are called so caches don't serve stale data

**Real-time / React Query**
- Over-broad invalidation: invalidating `['patients']` also busts `['patient', id]` — check if a more targeted key would suffice
- Socket events firing more than once per action (e.g., emitting in both controller and middleware) causes double refetches

**Frontend**
- Components that call `useQuery` with no `staleTime` will refetch on every focus — add `staleTime` for data that changes only via Socket.io
- Large lists rendered without virtualization (patient or session lists with hundreds of rows)
- Dialog components that fetch data on every open — check if parent already has the data in cache

**Rules**
- Prioritize high-impact improvements (DB query reduction > cache hits > render optimization)
- Do not optimize prematurely — measure first if possible
