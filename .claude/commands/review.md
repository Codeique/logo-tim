Review the current changes (staged or recently modified files).

Quick PR-style review focused on what actually changed.

## Output

1. Critical issues (bugs, security holes, data loss risk)
2. High issues (convention violations, missing required steps)
3. Medium issues (logic gaps, missing error handling at boundaries)
4. Low issues (naming, readability)
5. Suggestions

## Checklist for this project

**Backend changes**
- [ ] Every write calls `emitEvent(...)` — missing this breaks real-time for all clients
- [ ] New controller errors call `next(err)`, not `res.status(500)`
- [ ] `Decimal` fields use `.toNumber()` before returning in response
- [ ] Role checks use `isTherapistRole()` or `authorize(Role.X)` with enum — no raw string comparisons
- [ ] `PUT /patients/:id` does NOT have `auditLog` middleware — it logs manually
- [ ] New paginated endpoints use `parsePagination()`
- [ ] `MilitaryRequest.status` is not being written to or read from the DB column

**Frontend changes**
- [ ] No hardcoded Serbian strings — use `statusConfig.js` constants
- [ ] No `parseFloat()` on currency values — use `formatCurrency()`
- [ ] Military status display uses `computeRequestStatus()` — not the API `status` field
- [ ] Mutations do NOT manually invalidate React Query — Socket.io handles it
- [ ] New protected routes have correct `roles` prop on `ProtectedRoute`

**Rules**
- Be strict but pragmatic
- Do NOT rewrite code in the review — suggest, don't implement
