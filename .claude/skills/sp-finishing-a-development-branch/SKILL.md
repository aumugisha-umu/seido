---
name: sp-finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests -> Present options -> Execute choice -> Clean up.

## The Process

### Step 1: Verify Tests

**Before presenting options:**

```bash
npm test / cargo test / pytest / go test ./...
```

**If tests fail:** Stop. Don't proceed to Step 2.

**If tests pass:** Continue.

### Step 2: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master
```

### Step 3: Present Options

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

### Step 4: Execute Choice

#### Option 1: Merge Locally
```bash
git checkout <base-branch>
git pull
git merge <feature-branch>
<test command>
git branch -d <feature-branch>
```

#### Option 2: Push and Create PR
```bash
git push -u origin <feature-branch>
gh pr create --title "<title>" --body "..."
```

#### Option 3: Keep As-Is
Report: "Keeping branch. Worktree preserved."

#### Option 4: Discard
**Confirm first:** Require typed "discard" confirmation.

### Step 5: Cleanup Worktree

For Options 1, 2, 4: `git worktree remove <path>`
For Option 3: Keep worktree.

### Step 6: Compound Learnings (Recommended)

After merge/PR (Options 1-2), suggest invoking sp-compound:

```
Feature integrated successfully.

📚 Run /compound to capture learnings from this work?
This updates AGENTS.md + progress.txt for future sessions.
```

This is the natural trigger for knowledge compounding — the feature is complete,
the branch is integrated, and the context is fresh for reflection.

**Skip if:** The change was trivial (typo fix, config tweak, no learnings to capture).

---

## Red Flags

**Never:**
- Proceed with failing tests
- Merge without verifying tests on result
- Delete work without confirmation
- Force-push without explicit request

**Always:**
- Verify tests before offering options
- Present exactly 4 options
- Get typed confirmation for Option 4
