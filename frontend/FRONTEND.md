# FRONTEND.md

React 18 + Vite frontend for LogoTim. MUI v5, React Query v5, Zustand, Socket.io, Vitest.

## Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build

npm test           # vitest (watch mode)
npm run test:run   # vitest run (CI / single pass)
# Run a single test file:
npx vitest run tests/utils/militaryStatus.test.js
```

Vite proxies `/api` and `/socket.io` to `http://localhost:3001` in dev — no CORS config needed locally.

## State management

**Zustand** (`src/store/authStore.js`) holds `{ user, accessToken }` in memory only (not persisted to localStorage). On page load, `App.jsx` attempts `POST /api/auth/refresh` to restore session from the HttpOnly refresh cookie — if it fails, the store is cleared and user lands on `/login`.

`useAuthStore.getState()` is used in non-component code (axios interceptors) to read state without subscribing.

## Data fetching

All reads use **React Query**. Query keys follow these conventions:

```js
['patients']              // list
['patient', id]           // single record
['sessions', 'today']     // scoped list
['calendar', from, to]    // calendar range
```

All mutations use `api.axios` directly (not `useMutation`) then rely on Socket.io invalidation for cache updates — avoid manually calling `queryClient.invalidateQueries` after mutations unless Socket.io won't fire (e.g., on delete where no event is needed immediately).

## API layer

`src/api/axios.js` — Axios instance with `baseURL: '/api'` and `withCredentials: true`.

- Request interceptor: reads `accessToken` from Zustand and sets `Authorization: Bearer <token>`.
- Response interceptor: on 401, calls `POST /api/auth/refresh` once (`_retry` flag), updates the store and retries the original request. On second 401, calls `logout()` which clears the store.

## Real-time updates

`src/hooks/useSocket.js` — singleton Socket.io client (`io('/', { path: '/socket.io', transports: ['websocket'] })`).

Mounted once in `App.jsx` via `useSocket()`. On each `*:updated` event it invalidates the corresponding React Query keys:

| Event | Invalidated keys |
|-------|-----------------|
| `patients:updated` | `patients`, `patient` |
| `sessions:updated` | `sessions`, `calendar` |
| `transactions:updated` | `transactions`, `patients`, `patient` |
| `therapists:updated` | `therapists`, `therapist` |
| `rooms:updated` | `rooms` |
| `evaluations:updated` | `evaluations` |
| `militaryRequests:updated` | `militaryRequests` |
| `finance:updated` | `finance` |

## Routing and access control

`ProtectedRoute` in `App.jsx` checks `accessToken` + optional `roles` prop. Unauthorized role → redirect to `/`. Not authenticated → redirect to `/login`.

Route-to-role mapping:
- `/therapists`, `/rooms` — ADMIN only
- `/transactions` — ADMIN only
- `/finance` — ADMIN, THERAPIST (CHIEF_THERAPIST missing — intended, finance shows own earnings)
- All other routes — any authenticated user

## Dashboard branching

`DashboardPage` checks `user.role === 'PATIENT'` and renders `PatientDashboard` (own profile, sessions, transactions, military requests) instead of the admin/therapist stats dashboard. Both live in the same `Dashboard.jsx` file.

## Military request status (client-side)

`src/utils/militaryStatus.js` computes status purely from dates — do **not** use the `status` field from the API response for display, as it may differ from the computed value:

```js
computeRequestStatus(validFrom, validUntil)
// → 'ACTIVE' | 'ACTIVE_WARNING' (≤5 days left) | 'INACTIVE'
requestStatusColor(status)   // → MUI color name
requestStatusLabel(status)   // → Serbian label string
```

## Shared utilities

- `src/utils/currency.js` — `formatCurrency(value, decimals?)` formats to Serbian RSD (`"1.500,00 RSD"`).
- `src/utils/statusConfig.js` — `SESSION_STATUS`, `ROLE_CONFIG`, `ROLE_OPTIONS`, `ACTION_CONFIG`, `TRANSACTION_TYPE` — use these for all chip labels, colors, and role display. Never hardcode Serbian label strings inline.

## Theme

`src/theme.js` exports `getTheme(mode)` — MUI theme factory.  
- Mode (`'light'` | `'dark'`) is stored in `localStorage` key `themeMode`.  
- Primary: `#4A90E2`, Success: `#10B981`, Warning: `#F59E0B`, Error: `#EF4444`.
- All MUI components have global `borderRadius: 10` overrides. `MuiTextField` defaults to `size: 'small'`.

## Dialog components

Shared dialogs in `src/components/`:
- `SessionFormDialog` — create/edit session (conflict checking on save)
- `PatientFormDialog` — create/edit patient
- `TherapistFormDialog` — create/edit therapist
- `MilitaryRequestDialog` — create/edit military request
- `AddTransactionDialog` — add payment/refund
- `AddEvaluationDialog` — add evaluation

All dialogs accept `open`, `onClose`, and optionally an existing record for edit mode.

## Testing

Tests live in `tests/` and run with **Vitest** + `jsdom` environment.

- `tests/setup.js` is the setup file (configured in `vite.config.js`).
- Uses `@testing-library/react` for component/hook tests.
- Test utilities and mocks live alongside the test files.

Run a specific test:
```bash
npx vitest run tests/hooks/useSocket.test.js
```
