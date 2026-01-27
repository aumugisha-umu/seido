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
