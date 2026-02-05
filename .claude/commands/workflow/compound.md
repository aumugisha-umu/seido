---
name: compound
description: Compound learnings after completing work — captures patterns, updates AGENTS.md + progress.txt
---

# Compound Learnings

Capitalize learnings from completed work. Run this after finishing a feature, fixing a complex bug, or completing a refactoring.

## What This Does

1. **Reflects** on what worked and what didn't (5 questions)
2. **Extracts** reusable patterns and anti-patterns from git diff
3. **Updates** knowledge base:
   - `AGENTS.md` — New codebase learnings (format Learning #XXX)
   - `tasks/progress.txt` — Append-only log for current feature
   - `.claude/memory-bank/systemPatterns.md` — If new architectural pattern
4. **Creates** retrospective in `docs/learnings/YYYY-MM-DD-[feature]-retrospective.md`

## Invoke

Use the `sp-compound` skill to execute this workflow.

## When to Run

- After merging/PR a feature branch
- After fixing a complex bug (> 1h debugging)
- After completing a major refactoring
- When all prd.json stories are `passes: true`
- When prompted by `sp-finishing-a-development-branch`
