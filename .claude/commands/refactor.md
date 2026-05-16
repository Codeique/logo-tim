Refactor the following for readability and simplicity: $ARGUMENTS

Scope: within a single file or function. Do not restructure across modules.

## Output

1. What changed and why
2. Files modified
3. Risks or behavior differences to watch for

## Focus areas
- Remove duplication within the file
- Improve variable/function naming
- Simplify nested conditionals or long chains
- Extract repeated inline logic into a named local variable or helper

## Rules
- DO NOT change observable behavior
- DO NOT move logic across files (use `/refactor-smart` for that)
- DO NOT add new dependencies
- Keep the diff small — one concern at a time
- In frontend: do not rename props that are passed from parent components without checking all call sites
- In backend: do not rename exported functions without checking all importers
