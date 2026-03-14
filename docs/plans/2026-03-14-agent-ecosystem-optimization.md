# Agent & Skill Ecosystem Optimization Plan

> **For Claude:** Execute via 4 parallel worktree agents, then merge back to preview.

**Goal:** Optimize the SEIDO agent/skill ecosystem based on Anthropic best practices and community research — compress CLAUDE.md, add deterministic hooks, enrich agents, create missing launch skills.
**Architecture:** 4 independent worktrees (zero file overlap), merge back to preview branch.

---

## Worktree A: CLAUDE.md Compression + Chain Fixes (Tier 1a + Tier 3)

**Branch:** `optimize/claude-md-compression`
**Files:**
- Rewrite: `.claude/CLAUDE.md` (~487 → ~150 lines)
- Create: `.claude/rules/seido-reference.md` (extracted quick ref)
- Create: `.claude/rules/feature-reference.md` (extracted feature tables)
- Create: `.claude/skills/sp-orchestration/SKILL.md` (extracted trigger matrix + chains)
- Modify: `.claude/skills/sp-ralph/SKILL.md` (auto-invoke compound)
- Modify: `.claude/skills/sp-compound/SKILL.md` (auto-invoke memory-sync)
- Modify: `.claude/skills/sp-verification-before-completion/SKILL.md` (suggest compound)
- Modify: `.claude/skills/sp-executing-plans/SKILL.md` (quality-gate per batch)

## Worktree B: Deterministic Hooks (Tier 1b)

**Branch:** `optimize/deterministic-hooks`
**Files:**
- Modify: `.claude/settings.local.json` (add PreToolUse + PostToolUse hooks)

## Worktree C: Agent Enrichment (Tier 1c)

**Branch:** `optimize/agent-enrichment`
**Files:**
- Modify: `.claude/agents/_base-template.md` (add AGENTS.md mandatory read + Craftsmanship Standards)
- Modify: `.claude/agents/backend-developer.md` (add SEIDO-specific RLS/auth patterns)
- Modify: `.claude/agents/frontend-developer.md` (add mobile-first emphasis + AGENTS.md)
- Modify: `.claude/agents/database-analyzer.md` (add AGENTS.md + migration safety)
- Modify: `.claude/agents/API-designer.md` (fix stale status values + add AGENTS.md)
- Modify: `.claude/agents/tester.md` (fix stale status values + add AGENTS.md + Puppeteer patterns)
- Modify: `.claude/agents/refactoring-agent.md` (add AGENTS.md + sp-simplify integration)
- Modify: `.claude/agents/researcher.md` (add WebSearch focus)
- Modify: `.claude/agents/memory-synchronizer.md` (add compound integration)

## Worktree D: New Launch Skills (Tier 2)

**Branch:** `optimize/new-launch-skills`
**Files:**
- Create: `.claude/skills/sp-release/SKILL.md`
- Create: `.claude/skills/sp-monitoring/SKILL.md`
- Create: `.claude/skills/sp-a11y/SKILL.md`
- Create: `.claude/skills/sp-analytics/SKILL.md`

---

## Merge Strategy

After all 4 worktrees complete:
```bash
git checkout preview
git merge optimize/claude-md-compression --no-edit
git merge optimize/deterministic-hooks --no-edit
git merge optimize/agent-enrichment --no-edit
git merge optimize/new-launch-skills --no-edit
```

Zero conflicts expected (no file overlap between worktrees).

---

**Last Updated**: 2026-03-14
