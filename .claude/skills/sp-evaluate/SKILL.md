---
name: sp-evaluate
description: "Feature evaluation using 3-axis GAN scoring (Security 40%, Patterns 30%, Design Quality 30%). Use standalone or auto-invoked by sp-ralph Step 6. Accepts: no args (full branch diff), file paths, story IDs, or flow descriptions."
---

# Feature Evaluation (GAN Pattern)

> Separate evaluation context — avoids self-evaluation bias.
> Methodology: `.claude/agents/feature-evaluator.md`
> Design criteria: `docs/design/design-evaluation-criteria.md`

## Invocation Modes

### Mode A: Full Feature (default — no args)
```
/evaluate
```
Evaluates current branch diff vs main.

1. Run `git diff main...HEAD --name-only` to get changed files
2. Read `.claude/agents/feature-evaluator.md` for methodology
3. Read `docs/design/design-evaluation-criteria.md` for Design Quality axis
4. Score all changed files against 3 axes
5. Output structured report

### Mode B: Specific Files
```
/evaluate path/to/file.tsx path/to/other.tsx
```
Evaluates only the specified files.

### Mode C: Story ID
```
/evaluate US-003
```
1. Read `tasks/prd.json`, find story US-003
2. Identify files from story notes or grep acceptance criteria keywords
3. Evaluate those files

### Mode D: Flow/Domain
```
/evaluate "intervention flow"
/evaluate "gestionnaire pages"
```
1. Grep codebase for files related to the described flow
2. Evaluate the matching file set

### Mode E: Evaluation Plan
```
/evaluate plan
```
1. Read `docs/plans/2026-03-25-feature-evaluation-plan.md` (or latest eval plan)
2. Find all PENDING blocks
3. Execute blocks in parallel (up to 4 agents)
4. Each agent writes results to `docs/plans/eval-results/block-X.md`
5. Update progress tracker in the plan file

## Execution

**For all modes, launch a general-purpose agent with this prompt:**

```
You are the SEIDO feature-evaluator.

FIRST read these files:
1. .claude/agents/feature-evaluator.md — your scoring methodology
2. docs/design/design-evaluation-criteria.md — Design Quality criteria
3. .claude/agents/_base-template.md — SEIDO project context

Then evaluate [SCOPE] against 3 axes:
- Security (40%): auth patterns, RLS, team isolation, input validation
- Patterns (30%): repository pattern, code reuse, TypeScript strictness
- Design Quality (30%): anti-slop criteria, empty states, loading states, role-awareness

Output structured scores per file/component group.
Pass: weighted >= 7.0, no axis < 5.0.
```

**Agent configuration:**
- `subagent_type: "general-purpose"` (NOT code-reviewer — that's a different tool)
- For large scopes (10+ files): split into parallel agents by domain
- For plan execution: one agent per block group (max 4 concurrent)

## Output Format

```
━━━ Feature Evaluation ━━━━━━━━━━━━━━━━━━━━━━━
Scope: [description]
Files reviewed: [count]

Security:       [X]/10  ██████░░░░
Patterns:       [X]/10  ████████░░
Design Quality: [X]/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: [X.X]/10
Result: PASS / FAIL

Blockers: [list or "None"]
Important: [list]
Suggestions: [list]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Integration

- **sp-ralph Step 6:** Auto-invoked after all stories pass (Mode A)
- **Standalone:** User types `/evaluate [args]` any time
- **Plan mode:** User types `/evaluate plan` for exhaustive multi-block audit
