---
name: sp-writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

You write test cases (pressure scenarios), watch them fail (baseline), write the skill, watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools.

**Skills are:** Reusable techniques, patterns, tools, reference guides
**Skills are NOT:** Narratives about how you solved a problem once

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious
- You'd reference this again across projects
- Pattern applies broadly
- Others would benefit

**Don't create for:**
- One-off solutions
- Project-specific conventions (put in CLAUDE.md)

## SKILL.md Structure

```markdown
---
name: skill-name-with-hyphens
description: Use when [specific triggering conditions]
---

# Skill Name

## Overview
Core principle in 1-2 sentences.

## When to Use
Bullet list with SYMPTOMS

## Core Pattern
Before/after code comparison

## Quick Reference
Table for scanning

## Common Mistakes
What goes wrong + fixes
```

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

Same as TDD: RED (baseline) -> GREEN (write skill) -> REFACTOR (close loopholes)

## Skill Creation Checklist

**RED Phase:**
- [ ] Create pressure scenarios
- [ ] Run WITHOUT skill - document baseline
- [ ] Identify patterns in failures

**GREEN Phase:**
- [ ] Write skill addressing specific failures
- [ ] Run WITH skill - verify compliance

**REFACTOR Phase:**
- [ ] Identify new rationalizations
- [ ] Add explicit counters
- [ ] Re-test until bulletproof

**Deployment:**
- [ ] Commit skill to git
