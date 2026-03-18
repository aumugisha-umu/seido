---
name: sp-dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies — full worktree lifecycle with branch awareness, simplify checks, merge, and cleanup
---

# Dispatching Parallel Agents (Worktree Protocol)

## Overview

When you have multiple independent tasks, dispatch isolated agents in git worktrees for true parallel execution. Each agent works on its own copy of the repo, commits independently, and changes are merged back.

**Core principle:** Analyze → Branch from current → Dispatch isolated → Simplify check → Merge → Clean.

## When to Use

**Use when:**
- 3+ independent tasks OR 2+ tasks touching different file domains
- Tasks don't share modified files
- Each task can be described and verified independently
- Total changes span enough files that parallelism saves time

**Don't use when:**
- Tasks share files (merge conflicts guaranteed)
- Output of one task feeds another (sequential dependency)
- Total changes < 3 files (overhead > benefit)
- Tasks modify the same DB migration or shared config

## The Protocol

### Step 1: Analyze Parallelizability

Map file dependencies for each task:

```
Task A: modifies lib/services/foo.ts, components/foo/
Task B: modifies lib/services/bar.ts, components/bar/
Task C: modifies lib/utils/shared.ts  ← SHARED with A
```

**Decision:**
- A & B → parallel (no overlap)
- A & C → sequential (shared file)
- Group: [A+C sequential] || [B parallel]

### Step 2: Branch Awareness

**CRITICAL:** Worktrees MUST branch from the CURRENT branch, not main.

```bash
# Get current branch
git branch --show-current
# Example: feature/import-wizard
```

Each agent's worktree will create a branch like `worktree/task-a` FROM the current branch HEAD.

### Step 3: Dispatch Agents

Launch one Agent per independent domain:

```typescript
// All in a SINGLE message for true parallelism
Agent({
  name: "task-a-domain",
  prompt: `You are on branch worktree/task-a branched from [CURRENT_BRANCH].

    TASK: [Specific task description]
    FILES: [Exact files to modify]
    VERIFY: [How to verify — lint, typecheck, test command]

    WORKFLOW:
    1. Implement the changes
    2. Run verification: npm run lint (or specific command)
    3. Self-check: Apply Code Craftsmanship Standards from CLAUDE.md
       - Before Writing: Did you search for existing utilities to reuse?
       - While Writing: No anti-patterns from the table?
       - After Writing: No N+1, no missed parallelism, no redundant queries?
    4. Fix any issues found in self-check
    5. git add [specific files] && git commit -m "feat: [description]"

    CONSTRAINTS:
    - Only modify files listed above
    - Do NOT touch files outside your scope
    - Commit your changes before finishing`,
  isolation: "worktree",
  mode: "bypassPermissions"
})

Agent({
  name: "task-b-domain",
  prompt: `...same structure...`,
  isolation: "worktree",
  mode: "bypassPermissions"
})
```

**Agent prompt MUST include:**
1. Explicit file scope (what to touch, what NOT to touch)
2. Verification command to run
3. Craftsmanship self-check requirement
4. Git commit instruction

### Step 4: Review Agent Results

When agents return:
1. Read each agent's summary
2. Note the worktree branch names and paths
3. Check for unexpected file overlaps

### Step 5: Merge Back

Sequentially merge each worktree branch into the current branch:

```bash
# For each completed worktree branch
git merge worktree/task-a --no-edit
git merge worktree/task-b --no-edit
```

**If merge conflict:** Resolve manually, prioritizing the domain expert's changes.

### Step 6: Cleanup

```bash
# Remove each worktree
git worktree remove /path/to/worktree-a
git worktree remove /path/to/worktree-b

# Delete worktree branches
git branch -D worktree/task-a
git branch -D worktree/task-b

# Prune stale worktree references
git worktree prune
```

### Step 7: Final Verification

Run full verification on the merged result:

```bash
npm run lint        # ESLint
npm test            # If tests affected
```

If issues found post-merge, fix them on the current branch.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Worktree from main instead of current branch | `git branch --show-current` FIRST |
| Agent doesn't commit | Explicitly say "git commit" in prompt |
| Overlapping file scopes | Map dependencies in Step 1 |
| Agent modifies unexpected files | Add "ONLY modify X, do NOT touch Y" |
| Forgetting cleanup | Always run Step 6, even if agents fail |
| Missing self-check | Include Craftsmanship Standards in every agent prompt |

## Quick Reference

```
1. Map file deps → group independent tasks
2. git branch --show-current → note current branch
3. Dispatch agents with isolation: "worktree" + explicit scope + self-check
4. Review results
5. git merge each branch --no-edit
6. git worktree remove + git branch -D + git worktree prune
7. Final lint/test on merged result
```
