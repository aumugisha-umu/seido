---
name: sp-using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

## Directory Selection Process

### 1. Check Existing Directories
```bash
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

### 2. Check CLAUDE.md
```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

### 3. Ask User
If no directory exists and no preference specified.

## Safety Verification

**MUST verify directory is ignored before creating worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null
```

**If NOT ignored:** Add to .gitignore, commit, then proceed.

## Creation Steps

### 1. Detect Project Name
```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. Create Worktree
```bash
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. Run Project Setup
Auto-detect: `npm install`, `cargo build`, `pip install`, etc.

### 4. Verify Clean Baseline
Run tests. If fail: report, ask whether to proceed.

### 5. Report Location
```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)
Ready to implement <feature-name>
```

## Red Flags

**Never:**
- Create worktree without verifying it's ignored
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous

**Always:**
- Follow priority: existing > CLAUDE.md > ask
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline

## Integration

**Pairs with:**
- **sp-finishing-a-development-branch** - Cleanup after work complete
- **sp-executing-plans** or **sp-subagent-driven-development** - Work happens in worktree
