---
paths:
  - "lib/**"
  - "components/**"
  - "app/**"
  - "hooks/**"
---

# Code Quality Standards - SEIDO

> Applied automatically during ALL code writing in application files.

## Before Writing Code (Reuse Search)

1. **Grep the codebase** for similar functions before creating new ones (`lib/utils/`, `lib/constants/`, `components/ui/`, adjacent files)
2. **If existing utility does 80%+ of what you need** — extend it, don't create a new one
3. **Check shadcn/ui** before creating UI components
4. **Check existing constants/enums** before using string literals

## While Writing Code (Quality Guardrails)

| Anti-Pattern | Correct Pattern |
|---|---|
| Redundant state (derived from existing) | Compute from source state |
| Parameter sprawl (adding params) | Generalize or restructure |
| Copy-paste with variation | Extract shared abstraction |
| Stringly-typed (raw strings) | Use constants/enums/unions |
| `any` types | Proper TypeScript types |
| `console.log` | Remove or use `logger` |
| Inline styles | Tailwind classes |
| Hardcoded colors | CSS variables from `globals.css` |

## After Writing Code (Efficiency Self-Check)

- [ ] No N+1 queries (batch with `Promise.all`)
- [ ] Independent async ops run in parallel (not sequential)
- [ ] No redundant DB queries (same data fetched twice)
- [ ] No TOCTOU (check-then-act) — operate directly, handle errors
- [ ] No overly broad queries (loading all when filtering for one)
- [ ] Event listeners / subscriptions cleaned up on unmount
- [ ] Separate try-catch for JSON.parse vs business logic errors
