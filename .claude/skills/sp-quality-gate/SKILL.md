---
name: sp-quality-gate
description: Multi-perspective pre-commit review (security, performance, patterns, tests). Use before commits or when user types "git*".
---

# Quality Gate — 4-Lens Pre-Commit Review

## Overview

Multi-perspective code review that checks Security, Performance, Patterns, and Tests before any commit. Runs automated checks (typecheck, lint, tests) and performs manual code review through 4 specialized lenses.

**Adapted from:** Ralph quality checks ("ALL commits must pass your project's quality checks") + Compound Engineering review phase
**Philosophy:** "Catch it before it ships. 4 eyes are better than 1."

## Auto-Invocation Triggers

Invoke this skill when you detect:
- "before commit", "quality check", "review my code"
- "ready to commit", "can I commit", "/quality-gate"
- **"git*"** — When user types git*, invoke quality-gate BEFORE the git add/commit
- "check my changes", "is this ready"
- Before any `sp-verification-before-completion`

## Integration with "git*" Flow

When the user types "git*" (global CLAUDE.md trigger for auto-commit):

```
1. User types: git*
2. FIRST: Run sp-quality-gate (this skill)
3. IF blockers found → Fix blockers → Re-run quality gate
4. IF approved → Proceed with git add . && git commit && git push
```

## The Process

### Step 1: Automated Checks

Run these checks in parallel:

```bash
# TypeScript — ALWAYS required
npx tsc --noEmit

# ESLint — ALWAYS required
npm run lint

# Tests — If stories with testable logic were modified
npm test
```

**If automated checks fail:** Stop immediately. Report failures. Do NOT proceed to lens review.

### Step 2: Gather Changed Files

```bash
# Staged changes
git diff --cached --name-only

# Unstaged changes (if not yet staged)
git diff --name-only

# Untracked files
git status --short
```

### Step 2.5: Simplify Quick-Scan (Active Duplicate Detection)

For each **new function/export** in changed files:
1. Grep `lib/utils/`, `lib/constants/`, `components/ui/`, and adjacent files for similar names/signatures
2. Flag any duplicate as BLOCKER (Lens 3 "Code reuse" — but caught here via active search, not passive review)

This is NOT a full `/simplify` audit — it's a targeted grep for the highest-value check. Full `/simplify` remains available for deep reviews.

### Step 3: 4-Lens Review

For each changed file, apply all 4 lenses:

#### Lens 1: Security (VETO POWER)

| Check | SEIDO-Specific | Severity |
|-------|----------------|----------|
| Auth present | `getServerAuthContext()` in all Server Components/Actions | BLOCKER |
| RLS aware | Check for silent RLS failures (Learning #001) | BLOCKER |
| User identity | `userProfile.id` not client-side userId (Learning #002) | BLOCKER |
| Multi-team isolation | Queries filter by `team.id` | BLOCKER |
| No hardcoded secrets | No API keys, passwords, tokens in code | BLOCKER |
| Input validation | User inputs sanitized at boundaries | WARNING |
| OWASP Top 10 | XSS, injection, CSRF checks | BLOCKER |

#### Lens 2: Performance (WARNING ONLY)

| Check | SEIDO-Specific | Severity |
|-------|----------------|----------|
| N+1 queries | Lists must batch with Promise.all (Learning #008) | WARNING |
| Missed parallelism | Independent async ops must use Promise.all | WARNING |
| TOCTOU anti-pattern | Operate directly, handle errors (no check-then-act) | WARNING |
| Redundant DB queries | Same data fetched twice in same request | WARNING |
| Overly broad queries | Loading all when filtering for one | WARNING |
| Separate queries pattern | Nested relations with RLS (Learning #004) | WARNING |
| Pagination | Large datasets must be paginated | WARNING |
| Client bundle | Minimize 'use client' directives | WARNING |
| Image optimization | Next/Image for all images | INFO |
| Memory leaks | Event listeners / subscriptions not cleaned up on unmount | WARNING |
| Realtime channels | Single RealtimeProvider, no duplicate channels | WARNING |

#### Lens 3: Patterns (VETO on critical)

| Check | SEIDO-Specific | Severity |
|-------|----------------|----------|
| Repository Pattern | No direct Supabase calls in components | BLOCKER |
| Code reuse | New function duplicates existing utility (grep first!) | BLOCKER |
| Redundant state | State derived from existing state — compute instead | WARNING |
| Parameter sprawl | Adding params instead of generalizing | WARNING |
| Copy-paste variation | Near-duplicate code blocks — extract shared abstraction | WARNING |
| Stringly-typed code | Raw strings where constants/enums exist | WARNING |
| `any` / `console.log` | Must be properly typed; remove debug logging | BLOCKER |
| Server Components default | 'use client' only when necessary | WARNING |
| Module Facade | Files > 500 lines must be split | BLOCKER |
| Naming conventions | kebab-case files, handleX events, const functions | WARNING |
| Error handling | Error boundaries at component + service level | WARNING |
| AGENTS.md patterns | Check all applicable learnings | VARIES |

#### Lens 4: Tests (VETO on critical paths)

| Check | SEIDO-Specific | Severity |
|-------|----------------|----------|
| Business logic tested | Services and server actions have unit tests | BLOCKER (critical) |
| 3 user archetypes | Auth features test 3 types (Learning #009) | BLOCKER (auth) |
| Edge cases | Null, empty, multi-team scenarios | WARNING |
| E2E for workflows | Intervention workflow changes need E2E | BLOCKER |
| Typecheck passes | `npx tsc --noEmit` clean | BLOCKER |

### Step 4: Generate Report

```markdown
## Quality Gate Report

**Date:** YYYY-MM-DD HH:MM
**Files:** X files changed, Y lines added, Z lines removed
**Automated:** TypeScript ✓ | Lint ✓ | Tests ✓

### Blockers (Must Fix Before Commit)

- [SECURITY] `file.ts:42` — Missing auth check in server action
  **Fix:** Add `const { user, profile, team, supabase } = await getServerAuthContext('role')`

- [PATTERNS] `component.tsx:155` — Direct Supabase call bypasses repository
  **Fix:** Use `InterventionRepository.getById()`

### Warnings (Should Fix)

- [PERF] `service.ts:78` — N+1 query in list method
  **Suggestion:** Batch with `Promise.all` (see Learning #008)

- [PATTERNS] `page.tsx:1` — Could be Server Component instead of Client
  **Suggestion:** Remove 'use client', move state to child component

### Approved

- [SECURITY] All Server Components use `getServerAuthContext` ✓
- [SECURITY] Multi-team isolation via `team.id` filter ✓
- [PATTERNS] Repository pattern respected ✓
- [TESTS] TypeScript compiles clean ✓

---

**Recommendation:** [APPROVED ✅ | FIX BLOCKERS ❌]
```

### Step 4.5: Knowledge Capture Check

After all blockers/warnings are resolved and before committing, review the work for learnings to persist:

| Question | If YES → Action |
|----------|-----------------|
| Did we discover a non-obvious pitfall or pattern? | → **Compound:** Add learning to `AGENTS.md` via `sp-compound` |
| Did we learn something about the user, project, or external reference? | → **Memory Bank:** Save to `.claude/projects/.../memory/` (user, project, feedback, or reference type) |
| Did this work reveal a missing or wrong instruction in CLAUDE.md? | → **CLAUDE.md:** Update the relevant section |
| Did an agent or skill behave incorrectly or miss something important? | → **Agent/Skill:** Update the `.claude/agents/*.md` or `.claude/skills/*/SKILL.md` file |
| Did we establish a new reusable pattern (code or process)? | → **systemPatterns.md:** Add to memory-bank patterns |

**If nothing to persist** — skip silently and proceed to commit.
**If learnings found** — apply them NOW (before commit), so the commit includes both the feature AND the knowledge updates.

### Step 5: User Decision

If blockers found:
```
Your decision:
1. Fix blockers (recommended) — I'll fix them now
2. Override — Commit anyway (not recommended, reason required)
3. Cancel — Don't commit yet
```

If only warnings:
```
No blockers found. Warnings are advisory.
Your decision:
1. Commit as-is ✅
2. Fix warnings first
3. Cancel
```

If clean:
```
Quality Gate PASSED ✅ — No blockers, no warnings.
Proceeding with commit.
```

## Severity Definitions

| Level | Icon | Meaning | Action |
|-------|------|---------|--------|
| BLOCKER | 🔴 | Security risk, pattern violation, critical test missing | Must fix or explicitly override |
| WARNING | 🟡 | Performance concern, minor pattern deviation | Should fix, user decides |
| INFO | 🟢 | Suggestion for improvement | Nice to have |

## Skip Conditions

Quality gate can be lighter for:
- **Documentation-only changes** (*.md files) — Skip Performance + Tests lenses
- **Config changes** (*.json, *.yml) — Skip Performance lens
- **Test-only changes** — Skip Tests lens (they ARE the tests)

Still ALWAYS run: TypeScript check + Security lens

## SEIDO-Specific Checks (Quick Reference)

These are the most common issues caught by the quality gate in SEIDO:

1. **Missing `getServerAuthContext`** in new pages — Security BLOCKER
2. **Direct Supabase calls** outside repositories — Patterns BLOCKER
3. **`.single()` instead of `.limit(1)`** for multi-team queries — Security BLOCKER
4. **Nested `select()` with RLS tables** — Performance WARNING
5. **Missing notification integration** for workflow changes — Patterns WARNING
6. **Push notification URLs without role prefix** — Patterns WARNING
7. **'use client' on pages that could be Server Components** — Patterns WARNING
8. **Duplicate utility function** created when one already exists — Patterns BLOCKER
9. **Missed `Promise.all`** for independent async operations — Performance WARNING
10. **`any` types or `console.log`** left in production code — Patterns BLOCKER
11. **Redundant DB query** (same data fetched twice in same handler) — Performance WARNING
12. **Inline styles or hardcoded colors** instead of Tailwind/CSS variables — Patterns WARNING

## Remember

- Read `AGENTS.md` BEFORE reviewing — existing learnings are your checklist
- Be SPECIFIC: cite file:line, not "somewhere in the code"
- Classify correctly: BLOCKER means MUST fix, WARNING means SHOULD fix
- Explain the "why" — teach, don't police
- The goal is catching bugs BEFORE they ship, not creating bureaucracy
