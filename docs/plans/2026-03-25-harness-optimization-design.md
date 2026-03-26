# Harness Optimization Design
**Date:** 2026-03-25
**Source:** Anthropic Engineering articles + SEIDO ecosystem audit
**Goal:** Optimize .claude/ ecosystem for better skill/agent communication, respect file size limits, add validated patterns

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session startup | Hook-based (C) | Zero instruction cost, automatic, visible summary |
| Evaluator timing | End-of-feature in Ralph + standalone `/evaluate` | Anthropic simplified to single-pass for Opus 4.6 |
| CLAUDE.md trim | Moderate (B) — move Craftsmanship + Parallel Protocol | ~57 lines saved → 175 target |
| Sprint contracts | Dropped | Anthropic removed for Opus 4.6 |
| Standalone evaluate | Scoped — accepts file paths, story IDs, flow descriptions | User flexibility |
| Brainstorming upgrade | 3-phase with ecosystem hooks | Currently 61 lines, zero integration |

## Changes

### 1. Session Startup Hook
- **New:** `.claude/scripts/session-startup.js`
- **Modify:** `.claude/settings.local.json` — add SessionStart hook
- Reads: prd.json, progress.txt, git log, branch, activeContext.md
- Prints formatted summary block visible to user

### 2. CLAUDE.md Trim (232 → ~175 lines)
- **Move out:** Code Craftsmanship Standards (~45 lines) → `.claude/skills/sp-simplify/craftsmanship-standards.md`
- **Move out:** Parallel Execution Protocol (~20 lines) → pointer to sp-dispatching-parallel-agents
- **Keep:** Troubleshooting Protocol, Discovery Tree (small, useful)
- **Add:** 1-line _base-template instruction for agent dispatch

### 3. Feature Evaluator
- **New:** `.claude/agents/feature-evaluator.md` (~80 lines)
- **Modify:** `.claude/skills/sp-ralph/SKILL.md` — add Step 6 (post-stories evaluation)
- 3 axes: Security (40%), Patterns (30%), Design Quality (30%)
- Pass: weighted ≥ 7.0, no axis < 5.0
- Standalone: `/evaluate [file|story|flow]`

### 4. Anti-AI-Slop Design Criteria
- **New:** `docs/design/design-evaluation-criteria.md`
- SEIDO-specific penalties and bonuses
- Referenced by feature-evaluator + sp-quality-gate Lens 3

### 5. Story Granularity Rules
- **Modify:** `.claude/skills/sp-prd/SKILL.md` — extend Step 3 sizing
- No L/XL stories, single-layer rule, complex feature threshold

### 6. seo-strategist Split
- **New:** `.claude/agents/references/seo-data.md` (extracted reference data)
- **Modify:** `.claude/agents/seo-strategist.md` (433 → ~250 lines)

### 7. sp-brainstorming Upgrade
- **Modify:** `.claude/skills/sp-brainstorming/SKILL.md` (61 → ~120 lines)
- Phase 0: Context loading (memory bank, AGENTS.md, rules)
- Phase 1: Research agents (researcher, database-analyzer, context7)
- Phase 2: Enhanced dialogue (informed by learnings + criteria)
- Phase 3: After design (unchanged — Ralph → Compound chain)

## Implementation Order

1. CLAUDE.md trim + craftsmanship extraction (unblock headroom)
2. Session startup hook (independent)
3. Anti-slop design criteria doc (independent)
4. sp-brainstorming upgrade (independent)
5. Feature evaluator agent + Ralph integration (depends on 3)
6. Story granularity rules in sp-prd (independent)
7. seo-strategist split (independent)

Parallelizable: [1,2,3,4,6,7] can all run independently. Only 5 depends on 3.

## File Impact Summary

| File | Action | Lines |
|------|--------|-------|
| `.claude/CLAUDE.md` | Modify (trim) | -57 net |
| `.claude/scripts/session-startup.js` | Create | ~80 |
| `.claude/settings.local.json` | Modify | +5 |
| `.claude/skills/sp-simplify/craftsmanship-standards.md` | Create | ~50 |
| `.claude/skills/sp-brainstorming/SKILL.md` | Modify | 61→120 |
| `.claude/skills/sp-ralph/SKILL.md` | Modify | +20 |
| `.claude/skills/sp-prd/SKILL.md` | Modify | +15 |
| `.claude/agents/feature-evaluator.md` | Create | ~80 |
| `.claude/agents/seo-strategist.md` | Modify | 433→250 |
| `.claude/agents/references/seo-data.md` | Create | ~180 |
| `docs/design/design-evaluation-criteria.md` | Create | ~90 |
