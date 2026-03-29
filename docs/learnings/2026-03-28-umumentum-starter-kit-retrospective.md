# Retrospective: umumentum-ai-starter-kit

**Date:** 2026-03-28
**Duration:** ~3 hours (design + implementation)
**Branch:** preview (seido-app) + main (umumentum-ai-starter-kit)
**Deliverable:** Public GitHub repo — 42 files, 3865 lines

## What Went Well

- **Design-first approach**: Writing a full design doc (`docs/plans/2026-03-28-claude-starter-kit-design.md`) before any implementation prevented scope creep and kept the structure coherent
- **SEIDO pattern extraction**: Successfully generalized SEIDO-specific patterns (hooks, memory bank, agent harness) into stack-agnostic templates
- **sp-onboarding skill**: The 3-mode detection (new project / existing with .claude / existing without .claude) covers all realistic use cases
- **Design system from day 1**: Creating `design-system-rules.md` + `design-evaluation-criteria.md` as part of the scaffold ensures every project starts with component governance
- **Agent quality**: Including `## Example Output` sections in every agent file — proven by 2500+ repo analysis to be the #1 quality driver

## What Could Be Improved

- **Background agent sandbox**: Lost ~20 minutes discovering that background agents can't write outside the project sandbox. Should have tested with a single file first before dispatching 2 agents for 10 files each
- **Batch file creation**: Writing 42 files one by one is tedious. A scaffold script (like `create-harness.sh`) would be faster for future iterations
- **settings.local.json portability**: The hook scripts use `node` paths that assume Node.js is globally available. Could fail on systems with only `nvm` or Docker-only setups
- **No automated tests**: The starter kit has no tests for its own hook scripts. A simple `node -c script.js` syntax check would catch basic errors

## New Learnings Added to AGENTS.md

- Learning #218: Background agents cannot write outside the project sandbox
- Learning #219: settings.local.json hooks require async stdin pattern on Windows
- Learning #220: Agent quality scales with Example Output sections, not instruction length
- Learning #221: GAN evaluation pattern — separate context eliminates self-evaluation bias
- Learning #222: Design system must be scaffolded at project creation, not retrofitted
- Learning #223: Anti-AI-slop scoring prevents generic AI-generated UI patterns
- Learning #224: Skill content > skill quantity — 6 empty skills are worse than 3 complete ones

## Patterns Discovered

- **3-tier boundary model** (Auto-Apply / Ask First / Never Do) — clean mental model for CLAUDE.md governance that scales across any project
- **GAN evaluation** — dispatching a fresh agent for code review eliminates the self-evaluation bias inherent in same-context reviews
- **Anti-slop scoring rubric** — penalty-based scoring (-2 per generic pattern, +1 per contextual adaptation) is more actionable than subjective "does it look good?"
- **Hook scripts as safety net** — 6 lightweight JS scripts (block-dangerous-commands, block-secret-writes, track-changes, etc.) provide guardrails without requiring user discipline

## Anti-Patterns Avoided

- **Premature abstraction**: Didn't create a "framework" — just well-organized markdown files and Node.js scripts
- **Over-configuration**: Used sensible defaults in CLAUDE.md that work out-of-the-box, with clear customization points
- **Vendor lock-in**: All patterns are stack-agnostic except context7 MCP (which is optional)

## Recommendations for Similar Future Work

1. **Test hook scripts with a smoke test**: `for f in .claude/scripts/*.js; do echo '{}' | node "$f" && echo "OK: $f"; done`
2. **Add a `.gitignore` template** to the starter kit for common patterns (node_modules, .env, etc.)
3. **Consider a `LICENSE` file** — currently missing from the public repo
4. **Add `sp-onboarding` E2E test**: Create a temp directory, run onboarding with mocked answers, verify scaffold output
5. **SEIDO-specific**: Apply anti-slop scoring (Learning #223) retroactively to existing dashboards — many were built before the rubric existed

## Files Created

```
42 files total:
- 1 README.md + 1 LEARNINGS.md (root)
- 1 CLAUDE.md + 2 settings files (config)
- 6 hook scripts (.claude/scripts/)
- 13 skill SKILL.md files (.claude/skills/)
- 9 agent files (.claude/agents/)
- 2 design rules (.claude/rules/)
- 5 memory bank templates (.claude/memory-bank/)
- 2 auto-memory queue files (.claude/auto-memory/)
```
