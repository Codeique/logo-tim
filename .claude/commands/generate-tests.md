Generate tests for: $ARGUMENTS

## Output

### Test Cases
List each scenario: happy path, edge cases, failure/error paths.

### Test Code
Write the actual test code.

### Coverage Notes
What is and isn't covered, and why.

## Backend test conventions (Jest, `--runInBand`)

**Integration tests** (`tests/integration/<name>.routes.test.ts`):
- Use `buildTestApp()` from `tests/__helpers__/app.ts` + `supertest`
- Inject auth by setting `req.user` via a stub middleware in the test — do not issue real JWTs
- Prisma is auto-mocked via `moduleNameMapper` → `tests/__mocks__/prisma.ts` (`mockDeep<PrismaClient>()` from `jest-mock-extended`)
- Reset mocks in `beforeEach`: `mockPrisma.patient.findMany.mockResolvedValue([...])`

**Service tests** (`tests/services/<name>.service.test.ts`):
- Import the service directly, pass `tx` (the Prisma mock) as the transaction arg
- Test conflict detection, business logic, guard clauses (e.g., double-completion 409)

**Unit tests** (`tests/unit/`):
- Pure logic, no DB, no HTTP — e.g., `parsePagination`, `isTherapistRole`, `computeStatus`

**Key behaviors to always test:**
- Role-based access: verify 403 when wrong role calls an endpoint
- `emitEvent` called after successful write (spy on `socket.ts`)
- Prisma error codes map correctly (mock `prisma.X.create` to throw `{ code: 'P2002' }` → expect 409)
- Decimal fields returned as numbers, not Prisma `Decimal` objects

## Frontend test conventions (Vitest + jsdom)

**Test files**: `frontend/tests/` — utilities in `utils/`, hooks in `hooks/`, store in `store/`
- Setup file: `tests/setup.js` (configured in `vite.config.js`)
- Use `@testing-library/react` for hook/component tests

**Key things to test:**
- `computeRequestStatus(validFrom, validUntil)` edge cases (exactly 5 days left = ACTIVE_WARNING, past = INACTIVE)
- `formatCurrency` output format matches Serbian RSD locale
- `useSocket` invalidates the correct React Query keys per event
- `authStore` clears token on logout; `getState()` works outside components

Run a single test:
```bash
# Backend
npx jest tests/integration/patients.routes.test.ts --runInBand
# Frontend
npx vitest run tests/utils/militaryStatus.test.js
```
