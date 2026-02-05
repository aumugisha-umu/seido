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

## Bite-Sized Task Granularity

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

## Execution Handoff

After saving the plan:

**"Plan complete. Two execution options:**
1. **Subagent-Driven (this session)** - Use sp-subagent-driven-development
2. **Parallel Session (separate)** - Use sp-executing-plans

**Which approach?"**
