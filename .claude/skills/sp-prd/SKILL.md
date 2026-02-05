---
name: sp-prd
description: Generate structured PRDs with user stories, acceptance criteria, and sizing. Use when planning a new feature or specifying requirements.
---

# PRD Generation

## Overview

Generate structured Product Requirements Documents through collaborative brainstorming. Asks questions one at a time, shapes the idea, then produces a PRD with user stories and acceptance criteria.

**Can be used standalone or called by Ralph (`sp-ralph`) during its orchestration flow.**

**Philosophy:** "If you cannot describe the change in 2-3 sentences, it is too big. Split it."

## Auto-Invocation Triggers

- "create a prd", "write prd for", "plan this feature"
- "nouvelle feature", "specifier", "definir les requirements"
- Called by `sp-ralph` when user doesn't have a PRD

---

## The Process

### Step 1: Collaborative Brainstorming (One Question at a Time)

**CRITICAL: Ask ONE question per message. Use multiple choice when possible.** This follows the brainstorming skill approach — natural, conversational, not overwhelming.

**Question 1 — The Problem:**
```
What problem are we solving? In one sentence, what should users be able to do
that they can't today?
```

**Question 2 — Affected Roles:**
```
Which SEIDO roles are affected?
A) Gestionnaire only
B) Gestionnaire + Prestataire
C) All roles
D) Other combination
```

**Question 3 — Must-Have Features:**
```
What are the MUST-HAVE capabilities? (minimum viable version)
A) [Minimal inferred from context]
B) [Fuller version]
C) [Phased — MVP first, enhance later]
```

**Question 4 — Technical Shape:**
```
Based on what you described, I think this involves:
- [ ] New database table(s)
- [ ] New API/Server Action(s)
- [ ] New UI component(s)
- [ ] Modification of existing workflow
- [ ] External service integration

Does this match? Anything to add/remove?
```

**Question 5 — Out of Scope:**
```
What is explicitly OUT of scope for this version?
(Prevents scope creep — we can always add later)
```

**Question 6 — Success Scenarios:**
```
How will we know this works? 2-3 concrete scenarios:
Example: "A gestionnaire can X, and then Y happens"
```

Continue asking (typically 5-8 questions total) until enough information for a complete PRD. Use AskUserQuestion tool with multiple choice options when possible.

### Step 2: Generate PRD

```markdown
# PRD: [Feature Name]

> **Generated:** YYYY-MM-DD
> **Status:** Draft
> **Author:** Claude (sp-prd)

## 1. Introduction
[WHY this feature exists. 2-3 sentences max.]

## 2. Goals
- **Primary:** [Main objective]
- **Secondary:** [Nice-to-have]
- **Non-Goals:** [Explicitly excluded]

## 3. User Stories

### US-001: [Title]
As a [gestionnaire/prestataire/locataire], I want [feature] so that [benefit]

**Acceptance Criteria:**
- [ ] [Verifiable criterion 1]
- [ ] [Verifiable criterion 2]
- [ ] Typecheck passes (npx tsc --noEmit)
- [ ] Tests pass (npm test)

**Sizing:** [XS|S|M] — [One sentence scope]

## 4. Functional Requirements
| ID | Requirement | Priority | Story |
|----|-------------|----------|-------|
| FR-001 | [Specific] | Must | US-001 |

## 5. Non-Goals (Out of Scope)
- [From brainstorm answers]

## 6. Design Considerations
- **UI/UX:** [Key decisions]
- **Mobile:** [If prestataire: mobile-first]

## 7. Technical Considerations
- **Database:** [Schema changes]
- **API:** [Endpoints/actions]
- **Dependencies:** [Packages]

## 8. Success Metrics
| Metric | Target | Measure |
|--------|--------|---------|

## 9. Open Questions
- [ ] [Unresolved items]
```

### Step 3: Story Sizing Check

**CRITICAL:** Each story = 2-3 sentences max.

| Size | Scope | Example |
|------|-------|---------|
| XS | 1 file, < 50 lines | Add column migration |
| S | 2-3 files, < 150 lines | Repository method + test |
| M | 4-6 files, < 300 lines | Server action + UI component |
| > M | **MUST SPLIT** | Too big |

**Good size examples (SEIDO):**
- Add column to table with migration
- Add UI component to existing page
- Update Server Action with new logic
- Add filter dropdown to list view

**Too big — must split:**
- "Build entire dashboard" → schema, queries, UI shell, filters, cards
- "Add authentication" → schema, middleware, login UI, sessions

### Step 4: Dependency Ordering

```
1. Schema/database (migrations)
2. Backend (repositories, services, server actions)
3. UI (pages, components)
4. Dashboard/summary (aggregations)
```

### Step 5: Save and Present

Save to: `tasks/prd-[feature-name].md`

Present section by section (200-300 words each). After each:
```
Does this section look right? Anything to adjust?
```

Final report:
```
PRD saved to tasks/prd-[feature-name].md
Stories: X total (Y XS, Z S, W M)
Dependency order: [Story IDs in execution order]
```

If called by Ralph: return control to Ralph for Phase B.
If standalone: suggest "Run /ralph to implement, or /ralph to convert to prd.json."

---

## SEIDO-Specific Checks

When generating PRDs for SEIDO, always consider:
1. **Multi-role impact:** All 4 roles (admin, gestionnaire, prestataire, locataire)
2. **RLS implications:** New tables need RLS policies
3. **Notification needs:** Does this need notifications? Which types?
4. **Mobile-first:** Prestataire = 75% mobile
5. **Repository pattern:** Data access through repositories only
6. **Server Components:** Default to server, minimize 'use client'

## Remember

- Read `AGENTS.md` BEFORE generating — existing learnings may apply
- Check `tasks/` for existing PRDs to avoid duplication
- User stories describe VALUE, not implementation
- Every acceptance criterion must be VERIFIABLE
- "Works correctly" is NOT a valid criterion
