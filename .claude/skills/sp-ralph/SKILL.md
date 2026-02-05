---
name: sp-ralph
description: Full orchestrator from PRD creation to implementation. Guides user through brainstorming, PRD, story decomposition, and implements story-by-story with TDD — all local, no commits until validated.
---

# Ralph — Full Feature Orchestrator

## Overview

Ralph is the **single entry point** for implementing any non-trivial feature in SEIDO. It orchestrates the full cycle: PRD → stories → implementation → tests. Delegates PRD creation to `sp-prd` when needed.

**Philosophy:** "From vague idea to tested code. One story at a time. Zero commits until green."

## Auto-Invocation Triggers

- "ralph", "/ralph", "lance ralph"
- "nouvelle feature", "implement this feature", "let's build"
- "j'ai une idee", "je veux ajouter", "on va creer"

## CRITICAL RULES

1. **ZERO COMMITS** during the entire process. Everything stays local.
2. **Commit only when:** user types `git*` AND all tests pass with zero errors.
3. **One story at a time.** Never implement multiple stories in parallel.
4. **User validates each phase.** Supervised mode.
5. **Read `AGENTS.md` FIRST.** Before any implementation.

---

## The Flow

```
Phase A: DISCOVERY ── Step 1-2: Entry + PRD (delegates to sp-prd if needed)
Phase B: DECOMPOSITION ── Step 3-4: prd.json + user validation
Phase C: IMPLEMENTATION ── Step 5: Story-by-story TDD loop
Phase D: VALIDATION ── Step 6-7: Quality gate + final report
```

---

## Phase A: DISCOVERY

### Step 1: Entry

Check `tasks/` for existing PRDs, then ask:

```
Ralph here. Let's build this feature step by step.

1. I have a PRD ready (paste or point to file)
2. I have a rough idea — help me shape it
3. Resume work on existing prd.json
```

Use AskUserQuestion tool.

- **Option 1:** Read PRD, validate structure, skip to Phase B.
- **Option 2:** **Invoke sp-prd** — it handles brainstorming + PRD generation.
- **Option 3:** Read existing `tasks/prd.json`, show status, resume at first `passes: false` story.

### Step 2: PRD Validation

After sp-prd generates the PRD (or user provides one), verify:
- All stories have acceptance criteria (min 2 per story)
- Every story has "Typecheck passes" criterion
- Logic stories have "Tests pass" criterion
- No story larger than M size
- Dependency order is correct (Schema → Backend → UI → Dashboard)

If issues found, fix with user before proceeding.

---

## Phase B: DECOMPOSITION

### Step 3: Convert PRD → prd.json

If existing prd.json has a different feature, archive first:
```
tasks/archive/YYYY-MM-DD-[old-feature]/prd.json + progress.txt
```

Generate `tasks/prd.json`:
```json
{
  "project": "SEIDO",
  "featureName": "[Name]",
  "branchName": "feature/[feature-name]",
  "description": "[From PRD]",
  "createdAt": "YYYY-MM-DD",
  "prdSource": "tasks/prd-[feature-name].md",
  "status": "in_progress",
  "userStories": [
    {
      "id": "US-001",
      "title": "[Title]",
      "description": "As a [role], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Typecheck passes (npx tsc --noEmit)"],
      "priority": 1,
      "dependsOn": [],
      "sizing": "S",
      "passes": false,
      "notes": ""
    }
  ]
}
```

**Priority ordering:**
| Priority | Layer | SEIDO Examples |
|----------|-------|----------------|
| 1 | Schema | Migrations, RLS, `npm run supabase:types` |
| 2 | Backend | Repositories, services, server actions |
| 3 | UI | Pages, components, forms |
| 4 | Dashboard | Aggregation views, stats |

Initialize `tasks/progress.txt` (if not exists):
```
# Progress Log — [Feature Name]
# Started: YYYY-MM-DD
# Stories: X total
---
```

### Step 4: User Validates Stories

Present story table:
```
| # | ID | Title | Size | Depends On | Layer |
|---|-----|-------|------|-----------|-------|
| 1 | US-001 | ... | XS | — | Schema |
| 2 | US-002 | ... | S | US-001 | Backend |

Does this look right? Anything to split, merge, or reorder?
```

Wait for validation before Phase C.

---

## Phase C: IMPLEMENTATION

### Step 5: Story-by-Story Loop

For each story where `passes: false` and all `dependsOn` are `passes: true`:

#### 5a. Announce
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 US-XXX: [Title] (Size: S) [X/Y]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acceptance Criteria:
- [ ] Criterion 1
- [ ] Typecheck passes
```

#### 5b. Read Context
1. Read `AGENTS.md` — check applicable learnings
2. Read relevant existing codebase files
3. Check `systemPatterns.md` for patterns

#### 5c. Implement
- **Logic stories:** TDD — write failing test → implement → pass
- **UI stories:** Implement component → typecheck
- **Schema stories:** Migration → `npm run supabase:types`

#### 5d. Run Checks
```bash
npx tsc --noEmit       # ALWAYS
npm test               # If tests exist
npm run lint           # If lint rules affected
```
**If checks fail:** Fix immediately. Do NOT proceed.

#### 5e. Verify Acceptance Criteria
```
✅ US-XXX Criteria Check:
- [x] Criterion 1 — Verified
- [x] Typecheck — 0 errors
All met ✅
```

#### 5f. Update State
- prd.json: `passes: true`, add `notes`
- progress.txt: append entry with files + learnings

#### 5g. Ask User
```
✅ US-XXX done. [X/Y] stories complete.
Next: US-YYY — [Title] (Size: S)
Continue?
```

### Edge Cases During Implementation

**Story too big:** Split in prd.json (US-003 → US-003a, US-003b), update deps, continue smaller.

**Unfixable failure:** Note in story `notes`, ask user for decision (skip/restructure/investigate).

**User stops mid-feature:** Save state to prd.json + progress.txt. "Run /ralph to resume."

---

## Phase D: VALIDATION

### Step 6: Final Quality Gate

When ALL stories `passes: true`:

```bash
npx tsc --noEmit    # TypeScript
npm run lint         # ESLint
npm test             # All tests
```

Review changed files through 4 lenses (Security, Performance, Patterns, Tests).
If blockers → fix → re-run. Loop until zero blockers.

### Step 7: Final Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ralph Complete — [Feature Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stories: X/X ✅ | TypeScript: 0 errors ✅ | Tests: passing ✅

Files changed: [list]

Everything is local — no commits made.
→ Type git* to commit + push
→ Type /compound to capture learnings
```

---

## SEIDO Checklist (Quick Reference)

- [ ] `getServerAuthContext` in all Server Components/Actions
- [ ] RLS policies for new tables
- [ ] Repository Pattern (no direct Supabase calls)
- [ ] `.limit(1)` not `.single()` for multi-team queries
- [ ] Separate queries + Promise.all for RLS nested relations
- [ ] Mobile-first for prestataire views
- [ ] Server Components default, minimize 'use client'
