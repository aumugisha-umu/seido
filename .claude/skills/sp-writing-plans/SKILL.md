---
name: sp-writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context. Document everything: which files to touch, code, testing, how to verify. Give bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

**Save plans to:** `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Plan Document Header

Every plan MUST start with:

```markdown
# [Feature Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]

---
```

## PRD-Enhanced Sections (Compound Engineering + Ralph)

When a PRD exists in `tasks/prd-*.md`, incorporate these sections into the plan:

### Acceptance Criteria (Verifiable, Not Vague!)

Good criteria:
- [ ] "Filter dropdown has options: All, Active, Completed" ✅
- [ ] "RLS policy returns empty array for non-team members" ✅
- [ ] Typecheck passes (npx tsc --noEmit) ✅

Bad criteria:
- [ ] "Works correctly" ❌ (too vague)
- [ ] "Is fast" ❌ (not measurable)
- [ ] "Looks good" ❌ (subjective)

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS blocks silent data | Medium | High | Test with 3 user archetypes |
| N+1 queries on list view | High | Medium | Use Promise.all pattern |

### Story Sizing (Ralph Rule)

> **"2-3 sentences max. If you can't describe the change in 2-3 sentences, it's too big. Split it."**
> **Order:** Schema → Backend → UI → Dashboard

| Size | Scope | Example |
|------|-------|---------|
| XS | Single file, < 50 lines | Add column to migration |
| S | 2-3 files, < 150 lines | Add repository method + test |
| M | 4-6 files, < 300 lines | Add server action + UI component |
| > M | MUST SPLIT | Too big for one story |

### Dependencies

- **Technical:** packages, migrations, environment variables
- **Team:** reviews needed, design approval
- **Ordering:** Schema → Backend → UI → Dashboard (Ralph dependency order)

### Link to PRD

If a PRD exists, reference it:
```markdown
**PRD:** `tasks/prd-[feature-name].md`
**prd.json:** `tasks/prd.json` (if converted)
**Current Progress:** `tasks/progress.txt`
```

---

## Quality by Design — Per-Task Proactive Checklist

Every task in the plan MUST include a **"Pitfall guard"** section — a 2-3 line micro-checklist derived from the 3 evaluation axes + craftsmanship standards. This prevents issues from reaching the reactive gates (evaluate, quality-gate, simplify).

```markdown
### Task N: [Component Name]

**Pitfall guard:**
- Reuse: grep `lib/utils/`, `components/ui/` for [relevant pattern] before creating
- Security: [auth/RLS need if applicable, or "N/A"]
- Anti-pattern: [specific risk — e.g., "N+1 on list query → use Promise.all", or "N/A"]
```

**Rules for writing pitfall guards:**
- If the task creates a **new function/component**: MUST include a reuse grep target
- If the task touches **server actions or API routes**: MUST flag auth pattern (`getServerAuthContext`)
- If the task renders **a list or table**: flag N+1 risk + pagination need
- If the task creates **UI with empty state possible**: flag empty state requirement
- If AGENTS.md has a **learning related to this task's domain**: cite it (e.g., "Learning #084: RLS silent fail")
- If none apply: write `Pitfall guard: N/A — pure config/wiring`

---

## Bite-Sized Task Granularity

**Step 0 per task: Reuse search** — search codebase for existing utilities/components that overlap with this task before specifying new code.

Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code" - step
- "Run the tests" - step
- "Commit" - step

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**
[code block]

**Step 2: Run test to verify it fails**
Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL

**Step 3: Write minimal implementation**
[code block]

**Step 4: Run test to verify it passes**
Expected: PASS

**Step 5: Commit**
```

## Remember
- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Plan Review Gate (auto — before handoff)

After writing the plan but BEFORE presenting execution options, **automatically review the plan** through the 3 evaluation axes. This catches design-level issues before any code is written.

**Self-review checklist (run silently, fix inline):**

| Axis | Check | Action if Missing |
|------|-------|-------------------|
| **Security** | Every task touching server actions/API routes has auth pattern in its steps | Add `getServerAuthContext` step |
| **Security** | New DB tables have RLS policy task | Add RLS task after migration |
| **Patterns** | Every task creating new functions has a reuse grep in Step 0 | Add specific grep targets |
| **Patterns** | No task exceeds M size (> 6 files, > 300 lines) | Split the task |
| **Design** | UI tasks specify empty states and loading states | Add to acceptance criteria |
| **Design** | Multi-role features cover gestionnaire + prestataire + locataire views | Add per-role criteria |
| **Simplify** | No two tasks create overlapping utilities | Merge or extract shared task |
| **Simplify** | Tasks reuse existing SEIDO patterns (repository, service, server action) | Reference existing file as template |

If any check fails, fix the plan inline — don't flag it to the user as a separate review step.

**When the plan involves 5+ tasks or crosses 3+ domains:** Auto-invoke `sp-evaluate` in `plan` mode (pass the plan doc as input) to get a second-opinion score. If score < 7.0, revise before presenting to user.

---

## Execution Handoff

After saving and reviewing the plan:

**"Plan complete. Two execution options:**
1. **Subagent-Driven (this session)** - Use sp-subagent-driven-development
2. **Parallel Session (separate)** - Use sp-executing-plans

**Which approach?"**
