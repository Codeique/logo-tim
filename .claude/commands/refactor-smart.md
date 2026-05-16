Refactor across modules or restructure: $ARGUMENTS

Scope: cross-file or structural refactoring. Use this when a single-file fix isn't enough.

## Output

### What Was Improved
### Why It Matters
### Files Changed
### Migration Notes (if any callers need updating)

## Focus areas
- Move misplaced logic to the correct layer (e.g., business logic in a controller → move to service)
- Extract shared utilities that are duplicated across modules
- Align a module with the standard pattern: `routes → controller → service → validation`
- Consolidate duplicated Prisma queries into a shared service function

## Project-specific structural rules
- Business logic (conflict checks, balance calculations, session completion) belongs in `*.service.ts`, not controllers
- Controllers must stay thin: parse request → call service or Prisma → call `emitEvent` → send response
- Shared backend utilities go in `src/lib/` — not inline in controllers or routes
- Shared frontend utilities go in `src/utils/` — never inline Serbian strings or status mappings in components
- If extracting a new util: add it to `statusConfig.js` (labels/colors), `currency.js` (formatting), or `militaryStatus.js` (military date logic) as appropriate

## Rules
- DO NOT change observable behavior
- DO NOT add new npm dependencies
- Update all call sites when renaming or moving exports
- Run `npm test` (backend) and `npm run test:run` (frontend) after to confirm nothing broke
