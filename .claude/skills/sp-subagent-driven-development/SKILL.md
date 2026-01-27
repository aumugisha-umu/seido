---
name: sp-subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Core principle:** Fresh subagent per task + two-stage review = high quality, fast iteration

## When to Use

- Have implementation plan
- Tasks mostly independent
- Stay in this session (vs sp-executing-plans for parallel session)

## The Process

1. **Read plan** - Extract all tasks with full text
2. **Create TodoWrite** - Track all tasks
3. **Per task:**
   - Dispatch implementer subagent
   - Answer questions if any
   - Implementer implements, tests, commits, self-reviews
   - Dispatch spec reviewer → fixes if needed
   - Dispatch code quality reviewer → fixes if needed
   - Mark task complete
4. **After all tasks** - Final code review
5. **Use sp-finishing-a-development-branch**

## Red Flags

**Never:**
- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed issues
- Dispatch multiple implementation subagents in parallel (conflicts)
- Make subagent read plan file (provide full text instead)
- Start code quality review before spec compliance is approved
- Move to next task while either review has open issues

**If subagent asks questions:**
- Answer clearly and completely
- Don't rush them into implementation

**If reviewer finds issues:**
- Implementer fixes them
- Reviewer reviews again
- Repeat until approved

## Integration

**Required workflow skills:**
- **sp-writing-plans** - Creates the plan this skill executes
- **sp-requesting-code-review** - Code review template
- **sp-finishing-a-development-branch** - Complete after all tasks

**Subagents should use:**
- **sp-test-driven-development** - TDD for each task
