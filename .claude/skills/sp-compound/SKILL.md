---
name: sp-compound
description: Capitalize learnings after completing a feature or fixing a complex bug. Updates AGENTS.md, progress.txt, and creates retrospectives.
---

# Compound — Knowledge Compounding

## Overview

The missing step in most development workflows. After completing work, systematically extract learnings and update the knowledge base so the NEXT feature is faster, safer, and better.

**Adapted from:** Compound Engineering (Every/Kieran Klaassen) + Ralph progress.txt
**Philosophy:** "Each session enriches AGENTS.md + progress.txt for the next one."

## Auto-Invocation Triggers

Invoke this skill when you detect:
- "feature done", "c'est termine", "ready to merge"
- "what did we learn", "lessons learned", "retrospective"
- "compound", "capitalize learnings", "/compound"
- After `sp-finishing-a-development-branch` completes (Options 1-2)
- When all stories in `tasks/prd.json` are `passes: true`
- After fixing a complex bug (> 1h debugging effort)
- After completing a major refactoring

## The 4 Phases

### Phase 1: Reflection (5 Questions)

Ask the user (or self-reflect from git history) these 5 questions:

```markdown
## Compound Reflection

1. **What patterns worked exceptionally well?**
   [Review: which approaches saved time or prevented bugs?]

2. **What patterns failed or caused friction?**
   [Review: what took longer than expected? What broke?]

3. **What new patterns did we discover?**
   [Review: any novel approaches we haven't used before?]

4. **What surprised us?**
   [Review: unexpected behaviors, edge cases, gotchas?]

5. **What would we do differently?**
   [Review: if we started over, what would change?]
```

If the user doesn't want to answer interactively, infer answers from:
- `git log --oneline` (recent commits)
- `git diff main...HEAD --stat` (scope of changes)
- `tasks/progress.txt` (if exists, in-progress learnings)
- Conversation history (debugging sessions, decisions made)

### Phase 2: Knowledge Extraction

Review the git diff and extract:

1. **Reusable Patterns** (used 2+ times in this feature)
   - Code patterns that worked well
   - Architecture decisions that paid off
   - Testing approaches that caught bugs

2. **Anti-Patterns Encountered**
   - Things that looked right but failed
   - Common mistakes we made (and fixed)
   - Misleading error messages or silent failures

3. **Edge Cases Discovered**
   - Unexpected behaviors
   - Role-specific quirks
   - Data scenarios we didn't anticipate

4. **Architecture Decisions**
   - Why we chose approach A over B
   - Trade-offs we accepted
   - Future implications

### Phase 3: Update Knowledge Base (3 Files)

#### 3a. Update `AGENTS.md` (Root)

For each NEW learning (not already in AGENTS.md):

```markdown
#### Learning #XXX: [Short Title]
**Problem:** [What went wrong — be specific]
**Solution:** [How to fix it correctly — actionable]
**Example:** [file:line where implemented]
**When to Use:** [Context that triggers this knowledge]
**Added:** YYYY-MM-DD | **Source:** [Feature/bug that revealed this]
```

**Rules:**
- Only add GENUINELY new learnings (check existing ones first)
- Increment the learning number
- Update the "Total Learnings" count in the header
- Update the "Last Updated" date
- Place in the correct category section (or create new section)

#### 3b. Append to `tasks/progress.txt`

Append a new entry (do NOT overwrite existing content):

```
## YYYY-MM-DD HH:MM — [US-XXX: Story Title or Bug Description]
- Implemented: [Brief description of what was done]
- Files: [Key files changed]
- Learnings: [1-2 sentence summary of what we learned]
- Decision: [Any architectural decision made and why]
```

If `tasks/progress.txt` doesn't exist, create it:
```
# Progress Log — [Feature Name or "General"]
# Started: YYYY-MM-DD

---

[Then append the entry]
```

#### 3c. Update `systemPatterns.md` (if applicable)

Only update `.claude/memory-bank/systemPatterns.md` if:
- A NEW architectural pattern was established (not just used)
- An existing pattern was significantly modified
- A new anti-pattern was discovered that affects architecture

### Phase 4: Create Retrospective

Create `docs/learnings/YYYY-MM-DD-[feature-name]-retrospective.md`:

```markdown
# Retrospective: [Feature Name]

**Date:** YYYY-MM-DD
**Duration:** [Estimate from git log]
**Stories Completed:** X / Y
**Branch:** [branch name]

## What Went Well
- [Bullet points]

## What Could Be Improved
- [Bullet points]

## New Learnings Added to AGENTS.md
- Learning #XXX: [Title]
- Learning #YYY: [Title]

## Patterns Discovered
- [Pattern description → where it's useful]

## Anti-Patterns Avoided (or Encountered)
- [Anti-pattern → how we fixed it]

## Recommendations for Similar Future Work
- [Actionable recommendation 1]
- [Actionable recommendation 2]

## Files Changed
[Output of git diff --stat for the feature branch]
```

## Output Report

After completing all 4 phases, present:

```markdown
## Compound Report

### Knowledge Updates
- **AGENTS.md:** +X new learnings (total: Y)
- **progress.txt:** +Z entries
- **systemPatterns.md:** [Updated / No changes needed]

### New Learnings
1. Learning #XXX: [Title] — [1-line summary]
2. Learning #YYY: [Title] — [1-line summary]

### Retrospective
Saved to: `docs/learnings/YYYY-MM-DD-[feature]-retrospective.md`

### prd.json Status
[If applicable: X/Y stories completed, Z remaining]

### Impact
These learnings will help future agents with:
- [Specific scenario 1 where this knowledge applies]
- [Specific scenario 2]
```

## When NOT to Compound

Skip compounding for:
- Trivial changes (typo fixes, config tweaks)
- Changes with zero learnings (pure copy-paste from existing pattern)
- Work-in-progress (compound when the FEATURE is done, not mid-story)

## Integration with Other Skills

| Trigger | What Happens |
|---------|-------------|
| `sp-finishing-a-development-branch` completes | Suggest running `/compound` |
| All prd.json stories `passes: true` | Auto-suggest compounding |
| `/compound` command | Run this skill directly |
| Complex bug fixed | User or agent triggers compound |

## SEIDO-Specific Considerations

- **Multi-role learnings:** Tag learnings with which roles are affected
- **RLS learnings:** Especially valuable — RLS bugs are silent and hard to debug
- **Performance learnings:** Note the before/after impact
- **Notification learnings:** Cross-system impact (email, push, in-app)

## Remember

- Read `AGENTS.md` BEFORE adding — don't duplicate existing learnings
- Think "next agent" — write for someone who wasn't here during implementation
- Quality > Quantity — 1 great learning beats 5 obvious ones
- The compound step is what makes the NEXT feature faster — don't skip it
