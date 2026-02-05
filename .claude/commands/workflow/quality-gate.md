---
name: quality-gate
description: Multi-perspective pre-commit review (security, perf, patterns, tests) + typecheck/lint
---

# Quality Gate

Multi-perspective pre-commit review through 4 lenses: Security, Performance, Patterns, and Tests.

## What This Does

1. **Runs automated checks:** `npx tsc --noEmit`, `npm run lint`, `npm test`
2. **Reviews changed files** through 4 specialized lenses
3. **Classifies findings:** BLOCKER (must fix) | WARNING (should fix) | INFO (suggestion)
4. **Generates report** with specific file:line citations
5. **Asks for decision:** Fix / Override / Cancel

## Invoke

Use the `sp-quality-gate` skill to execute this workflow.

## When to Run

- Before any commit (especially when typing "git*")
- Before `sp-verification-before-completion`
- When you want a code review before pushing
- After implementing a complex feature
