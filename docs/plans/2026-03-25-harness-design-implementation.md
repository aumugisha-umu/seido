# Plan: Harness Design Implementation for SEIDO

**Date:** 2026-03-25
**Author:** Claude Code session
**Source:** Anthropic Engineering — "Harness design for long-running application development" + "Effective harnesses for long-running agents"
**Scope:** Improve Claude Code harness (.claude/) to produce higher quality code and design
**Branch:** `claude/harness-design-implementation-weATU`

---

## Context

Anthropic published two engineering articles describing harness patterns that dramatically improved long-running agent output quality:

1. **Multi-session coherence** — Initializer Agent + Coding Agent architecture with structured artifacts (`feature_list.json`, `claude-progress.txt`) that bridge context windows
2. **Design quality** — GAN-inspired Generator/Evaluator feedback loop with a three-agent architecture (Planner, Generator, Evaluator) that eliminates self-evaluation bias

### Current SEIDO Harness State

SEIDO already has strong foundations:
- `tasks/prd.json` + `tasks/progress.txt` (maps to Anthropic's feature_list + progress file)
- Memory Bank (6 files) for cross-session context
- 23 skills + 15 agents for orchestration
- `sp-ralph` for story-by-story implementation
- `sp-quality-gate` for 4-lens pre-commit review
- `sp-brainstorming` + `sp-prd` for design/planning

### Identified Gaps

| Gap | Severity | Description |
|-----|----------|-------------|
| No formalized session startup routine | HIGH | Agent may lose context or declare work done prematurely |
| Evaluation only at commit time | HIGH | Quality feedback arrives too late — errors accumulate across stories |
| No anti-AI-slop design criteria | MEDIUM | UI output can be generic without formal penalization |
| No sprint contracts | MEDIUM | No pre-implementation agreement on deliverables + verification method |
| Story granularity too coarse for complex features | LOW | 7-10 stories where 20-30 sub-stories would be safer |

---

## Implementation Plan

### Change 1: Session Startup Protocol

**Files to modify:**
- `.claude/CLAUDE.md` — Add mandatory startup routine section

**What to add:**

```markdown
## Session Startup Routine (OBLIGATOIRE — Premiere action de chaque session)

1. `cat tasks/prd.json | head -50` — feature en cours, stories status
2. `tail -20 tasks/progress.txt` — derniers progres
3. `git log --oneline -10` — commits recents
4. `npm test -- --reporter=dot 2>&1 | tail -5` — etat des tests
5. Announce: "Resuming [feature]. Next: US-XXX [title]. [X/Y] complete."

Si aucun `tasks/prd.json` actif: lire `.claude/memory-bank/activeContext.md` et annoncer le contexte.
```

**Rationale:** Anthropic found that without a startup routine, agents either attempt to one-shot everything or declare work complete prematurely. This eliminates both failure modes.

**Acceptance criteria:**
- [ ] CLAUDE.md contains Session Startup Routine section
- [ ] Routine is marked OBLIGATOIRE (same level as Server Auth Pattern)
- [ ] Covers: prd status, progress tail, git log, test status, announcement

---

### Change 2: Generator/Evaluator Feedback Loop in Ralph

**Files to modify:**
- `.claude/skills/sp-ralph/SKILL.md` — Add evaluation step in story loop
- `.claude/agents/story-evaluator.md` — NEW agent definition

**New agent: `story-evaluator.md`**

```markdown
# Story Evaluator Agent

Specialized agent that evaluates a single story implementation BEFORE it is marked as complete. Runs as a separate context to avoid self-evaluation bias.

## Input
- Story ID and acceptance criteria
- List of files changed
- The implementation diff

## Evaluation Axes (score 1-10 each)

### Security (weight: 40%)
- Auth pattern: getServerAuthContext / getServerActionAuthContextOrNull
- RLS reliance: no manual auth checks before RLS-protected queries
- Input validation at system boundaries
- Multi-team isolation (team.id filter)

### Patterns (weight: 30%)
- Repository pattern (no direct Supabase in components)
- Code reuse (grep for existing utilities before creating new)
- No any types, console.log, inline styles
- Server Components by default
- File size < 500 lines

### Design Quality (weight: 30%)
- Component hierarchy matches user mental model
- Mobile-first for prestataire views
- Empty states with actionable guidance
- Loading states (skeleton, not spinner)
- No generic AI slop patterns (see criteria below)

## Output Format

```json
{
  "storyId": "US-XXX",
  "scores": { "security": 8, "patterns": 9, "design": 7 },
  "weightedScore": 8.1,
  "passed": true,
  "blockers": [],
  "suggestions": ["Consider extracting shared logic into existing utils/format.ts"]
}
```

## Pass Threshold
- Weighted score >= 7.0 AND no individual axis < 5.0
- Any blocker (security < 7 or patterns violation) = automatic fail
```

**Modification to `sp-ralph/SKILL.md` — Step 5 story loop:**

Insert between current Step 5c (Implement) and Step 5d (Run Checks):

```markdown
#### 5c-bis. Evaluate (Story Evaluator — separate context)

Launch story-evaluator agent with:
- Story ID + acceptance criteria from prd.json
- Files changed: `git diff --name-only`
- Implementation diff: `git diff`

**If passed (score >= 7.0, no blockers):** Proceed to 5d.
**If failed:** Read evaluator feedback, fix issues, re-run evaluator. Max 2 retries before asking user.

This step is MANDATORY for stories sized M or larger.
This step is SKIPPABLE for stories sized XS or S that are pure UI without business logic.
```

**Rationale:** Anthropic's core insight — self-evaluation fails because the model that wrote the code has confirmation bias. A separate evaluation context (different agent, fresh context window) provides honest assessment. This is the GAN principle: the generator and discriminator improve each other through adversarial feedback.

**Acceptance criteria:**
- [ ] `story-evaluator.md` agent created with 3-axis scoring
- [ ] `sp-ralph/SKILL.md` has Step 5c-bis with evaluator invocation
- [ ] Evaluator runs in separate agent context (not inline review)
- [ ] Pass/fail threshold defined (>= 7.0 weighted, no axis < 5.0)
- [ ] Skip conditions defined (XS/S pure UI)
- [ ] Max 2 retries before escalation to user

---

### Change 3: Anti-AI-Slop Design Evaluation Criteria

**Files to create:**
- `docs/design/design-evaluation-criteria.md` — NEW

**Content:**

```markdown
# SEIDO Design Evaluation Criteria

Used by story-evaluator agent and sp-quality-gate Lens 3 (Patterns).
Score 1-10 per component/page evaluated.

## Penalties (each occurrence: -2 points)

### Layout Slop
- Generic centered hero section with gradient background
- Uniform card grid with identical structure and no visual hierarchy
- Symmetric layouts where asymmetry would improve scannability
- Full-width sections with no max-width constraint

### Component Slop
- Generic icons that don't map to SEIDO domain concepts
- Identical card components with no role-based differentiation
- Modal dialogs for simple confirmations (use inline or toast instead)
- Form fields with no contextual help or placeholder guidance

### Interaction Slop
- Page reload for state changes that should be optimistic
- Loading spinners where skeleton screens are appropriate
- No empty state guidance (blank page instead of next-action prompt)
- Desktop-only interactions on prestataire views (must be mobile-first)

### Color/Typography Slop
- Colors not from SEIDO design tokens (globals.css CSS variables)
- Hardcoded hex/rgb values instead of Tailwind classes
- No visual distinction between roles (gestionnaire/prestataire/locataire)
- Body text size inconsistency within same view

## Bonuses (each occurrence: +1 point)

- Contextual micro-interactions (hover states specific to entity type)
- Progressive disclosure (show summary first, details on demand)
- Skeleton loading states matching final layout shape
- Role-aware empty states ("Aucune intervention" + CTA adapted to role)
- Mobile gesture support for prestataire (swipe, long-press)
- Consistent use of SEIDO shared cards pattern (intervention-details-card, summary-card, etc.)
- Breadcrumb/back navigation respecting user's mental model

## Score Interpretation

| Score | Meaning |
|-------|---------|
| 9-10 | Exceptional — cohesive, role-adapted, delightful |
| 7-8 | Good — follows patterns, minor improvements possible |
| 5-6 | Acceptable — functional but generic, needs refinement |
| 3-4 | Poor — multiple slop patterns, feels auto-generated |
| 1-2 | Unacceptable — no SEIDO identity, pure AI slop |
```

**Integration points:**
- Referenced by `story-evaluator.md` (Design Quality axis)
- Referenced by `sp-quality-gate` Lens 3
- Referenced by `docs/design/ux-ui-decision-guide.md` (cross-reference)

**Rationale:** Anthropic found that explicit criteria that penalize generic patterns are essential. Without them, the model defaults to safe, generic output. The criteria must be concrete and scorable, not vague ("make it look good").

**Acceptance criteria:**
- [ ] `design-evaluation-criteria.md` created
- [ ] Penalties and bonuses are SEIDO-specific (not generic)
- [ ] Score scale defined with clear interpretation
- [ ] Referenced by story-evaluator and quality-gate

---

### Change 4: Sprint Contracts in Ralph

**Files to modify:**
- `.claude/skills/sp-ralph/SKILL.md` — Add sprint contract step

**Insert between Step 5a (Announce) and Step 5b (Read Context):**

```markdown
#### 5a-bis. Sprint Contract

Before implementing, write a brief contract to `tasks/sprint-contract.md`:

```markdown
# Sprint Contract — US-XXX: [Title]

## Scope
- Files to create: [list]
- Files to modify: [list]
- Files NOT to touch: [explicit exclusions if relevant]

## Deliverables
- [ ] [Concrete deliverable 1]
- [ ] [Concrete deliverable 2]

## Verification Method
- [ ] TypeScript: npx tsc --noEmit
- [ ] Unit test: [specific test file or "N/A"]
- [ ] E2E: [specific Playwright test or "manual verification"]
- [ ] Visual: [screenshot comparison or "N/A"]

## Constraints
- Max files: [number]
- Max new lines: [estimate]
- Reuse: [existing utilities/components to leverage]
```

This file is OVERWRITTEN each story (not appended). It serves as the agreement between Generator (Step 5c) and Evaluator (Step 5c-bis).

**Skip condition:** Stories sized XS can skip the contract.
```

**Rationale:** Anthropic's Generator and Evaluator negotiate a contract before each sprint, defining what will be built and how it will be verified. This prevents scope creep within stories and gives the evaluator clear criteria to check against.

**Acceptance criteria:**
- [ ] Sprint contract step added to Ralph between 5a and 5b
- [ ] Template includes: scope, deliverables, verification method, constraints
- [ ] Contract is overwritten each story (not accumulated)
- [ ] Skip condition for XS stories
- [ ] Evaluator references contract in its assessment

---

### Change 5: Feature Granularity Rules in PRD Skill

**Files to modify:**
- `.claude/skills/sp-prd/SKILL.md` — Add granularity rules (if this skill exists as a file)
- OR `.claude/skills/sp-ralph/SKILL.md` — Add rules in Phase B (Decomposition)

**Rules to add:**

```markdown
### Story Size Guardrails

| Max Size | Criteria |
|----------|----------|
| XS | 1 file, < 50 lines changed |
| S | 1-2 files, < 150 lines changed |
| M | 3-5 files, < 300 lines changed |

**No L or XL stories allowed.** If a story exceeds M criteria:
1. Split into sub-stories: US-003 -> US-003a, US-003b, US-003c
2. Each sub-story must be independently testable
3. Update dependsOn chains accordingly

**Granularity rule:** A story should touch ONE layer (Schema OR Backend OR UI OR Dashboard). Cross-layer stories must be split.

**Complex feature threshold:** If total stories > 15 OR estimated total lines > 2000, consider splitting into multiple PRDs (Phase 1 / Phase 2).
```

**Rationale:** Anthropic uses 200+ granular features where SEIDO uses 7-10 stories. While SEIDO's stories are more structured (with acceptance criteria), very complex features benefit from finer granularity to keep each implementation step tractable.

**Acceptance criteria:**
- [ ] Size guardrails table added (XS/S/M, no L/XL)
- [ ] Split rule: > M must be decomposed
- [ ] Single-layer rule: one story = one layer
- [ ] Complex feature threshold defined

---

## Implementation Order

```
Priority 1 (Quick wins, high impact):
  Change 1: Session Startup Protocol          ~15 min  — edit CLAUDE.md
  Change 5: Feature Granularity Rules          ~15 min  — edit sp-ralph or sp-prd

Priority 2 (Core architecture, highest ROI):
  Change 2: Generator/Evaluator Loop          ~45 min  — new agent + edit sp-ralph
  Change 4: Sprint Contracts                   ~20 min  — edit sp-ralph

Priority 3 (Design quality):
  Change 3: Anti-AI-Slop Criteria              ~30 min  — new doc + cross-references
```

## Dependencies

```
Change 4 (Sprint Contracts) --depends-on--> Change 2 (Evaluator references contract)
Change 3 (Design Criteria)  --depends-on--> Change 2 (Evaluator references criteria)
Change 1 (Startup) and Change 5 (Granularity) are independent.
```

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Evaluator adds latency to each story | Skip for XS/S pure UI; evaluator is fast (read-only, no tools needed) |
| Over-engineering the harness | Start with evaluator for M+ stories only; expand if proven valuable |
| Design criteria too subjective | Make criteria binary (present/absent), not subjective (good/bad) |
| Sprint contracts become bureaucracy | Keep template minimal; skip for XS; overwrite not accumulate |

## Success Metrics

After implementing all 5 changes, measure over next 3 features:

1. **Rework rate:** Number of post-commit fixes / total commits (target: < 10%)
2. **Story completion rate:** Stories passing evaluator on first try (target: > 70%)
3. **Design score:** Average design axis score from evaluator (target: > 7.0)
4. **Session continuity:** Agent correctly resumes work without re-explaining context (target: 100%)

---

## Files Changed Summary

| File | Action | Change |
|------|--------|--------|
| `.claude/CLAUDE.md` | MODIFY | Add Session Startup Routine section |
| `.claude/skills/sp-ralph/SKILL.md` | MODIFY | Add Step 5a-bis (contract) + Step 5c-bis (evaluator) |
| `.claude/agents/story-evaluator.md` | CREATE | New evaluation agent with 3-axis scoring |
| `docs/design/design-evaluation-criteria.md` | CREATE | Anti-AI-slop criteria with scoring |
| `.claude/skills/sp-prd/SKILL.md` OR sp-ralph Phase B | MODIFY | Add story size guardrails |
| `tasks/sprint-contract.md` | CREATE (runtime) | Template overwritten each story |

**Total estimated effort:** ~2 hours
**Files affected:** 4 modified + 2 created
