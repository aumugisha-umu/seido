---
name: sp-brainstorming
description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.
Leverages the full SEIDO ecosystem — memory bank, learnings, specialized agents, design criteria — to produce informed, high-quality designs.

**Philosophy:** "Understand deeply before designing. Design thoroughly before building."

## Phase 0: Context Loading (BEFORE first question)

**Mandatory reads — do these silently before engaging the user:**

1. Read `.claude/memory-bank/activeContext.md` — current focus and recent work
2. Read `AGENTS.md` — grep for learnings related to user's topic (keywords from their message)
3. Read `tasks/prd.json` — is there active work that overlaps or conflicts?
4. **If UI-related:** read `docs/design/ux-ui-decision-guide.md` + `docs/design/design-evaluation-criteria.md`
5. **If DB-related:** read `.claude/rules/database-rules.md` + `.claude/memory-bank/techContext.md`
6. **If intervention-related:** read `.claude/rules/intervention-rules.md`
7. **If external library involved:** use MCP context7 (`resolve-library-id` → `query-docs`)

**Skip condition:** If the user provides a complete spec/PRD, skip to Phase 2 directly.

## Phase 1: Research (parallel agents when complexity warrants)

**For complex features (3+ files, new domain, unfamiliar territory):**

Dispatch relevant agents in parallel:
- **researcher agent:** competitive analysis, UX patterns for the domain
- **database-analyzer agent:** schema impact assessment (if DB-touching)
- **ui-designer agent:** design research and persona-fit (if UI-touching)
- **context7 MCP:** library docs for any external deps involved

**For simple features:** skip agents, use direct grep/glob to check existing patterns.

**Decision heuristic:**
| Scope | Research Method |
|-------|----------------|
| 1-2 files, single concern | Direct grep/glob — no agents |
| 3-5 files, known domain | Grep + read relevant AGENTS.md learnings |
| 6+ files, new domain, or cross-cutting | Dispatch specialized agents |

## Phase 2: Collaborative Dialogue (one question at a time)

Now engage the user. **Informed by Phase 0-1 findings.**

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message — if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria
- **Surface relevant learnings:** "AGENTS.md shows we hit [pitfall] last time with [similar feature] — should we account for that?"

**Exploring approaches:**
- Search existing codebase for similar patterns/utilities that could be reused or extended
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why
- **For UI approaches:** evaluate against `design-evaluation-criteria.md` (anti-slop check)
- **For DB approaches:** validate against existing schema patterns in `techContext.md`

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## Phase 3: After the Design

**Documentation:**
- Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`

**Implementation — Auto-invoke Ralph:**
- After saving the design doc, assess complexity:
  - **Simple** (1-2 files, single concern, < 30 min): Implement directly without Ralph
  - **Non-trivial** (3+ files, multiple concerns, cross-cutting): **Automatically invoke `sp-ralph`** with the design doc as input
- When invoking Ralph, pass: `"Implement the validated design from docs/plans/YYYY-MM-DD-<topic>-design.md"` + a summary of the design
- Do NOT ask "Ready to implement?" — just proceed with Ralph unless the user explicitly says to stop after design

**Post-implementation — Auto-invoke Compound:**
- After Ralph completes (all stories passed), **automatically invoke `sp-compound`** to capture learnings
- This ensures patterns, pitfalls, and architectural decisions are recorded in AGENTS.md and progress.txt
- Do NOT ask "Want to compound?" — just do it as part of the chain: Brainstorming → Ralph → Compound

## Key Principles

- **One question at a time** — Don't overwhelm with multiple questions
- **Multiple choice preferred** — Easier to answer than open-ended when possible
- **YAGNI ruthlessly** — Remove unnecessary features from all designs
- **Explore alternatives** — Always propose 2-3 approaches before settling
- **Incremental validation** — Present design in sections, validate each
- **Be flexible** — Go back and clarify when something doesn't make sense
- **Leverage the ecosystem** — Never brainstorm in isolation; always check learnings, patterns, and existing code first
