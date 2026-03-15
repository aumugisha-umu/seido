# Claude Code Global Blueprint

> **Purpose:** Reference document to replicate the full `.claude/` ecosystem at global level (`~/.claude/`) and specialize per project. Built from the SEIDO project's battle-tested setup for a **SaaS B2B multi-role real estate management platform**.

---

## 0. Agent & Skill Catalog — Quick Reference

> This section describes every agent and skill in the ecosystem, their purpose, and when to use them. Use it to understand what's available before setting up a new project.

### 0.1 Agents (15 total)

Agents are role-based specialists dispatched via the `Agent` tool. Each inherits common patterns from `_base-template.md`.

#### Core Development Agents

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **backend-developer** | Senior backend dev — APIs, DB, auth, business logic, server perf. Knows 31 services, 21 repositories, 10 RLS helpers, 16 notification actions. | Building APIs, designing databases, implementing auth, handling business logic, optimizing server performance |
| **frontend-developer** | Senior frontend dev — UI components, real-time hooks, performance (LCP/INP/CLS), accessibility. Knows 58 hooks, 369 components, Tailwind v4 + OKLCH. | Creating web interfaces, complex UI components, optimizing frontend perf, ensuring WCAG 2.1 AA |
| **API-designer** | API architect — endpoint design, Zod validation, multi-role access patterns, REST standards. | Designing new APIs, refactoring existing endpoints, implementing API standards, creating API docs |
| **database-analyzer** | DB schema auditor — PostgreSQL/Supabase schema coherence, RLS policies, triggers, indexes, soft delete patterns. | Audit schema BEFORE any DB modification. Validates triggers, RLS, denormalization, views. |
| **tester** | Testing expert — unit (Vitest), integration, E2E (Puppeteer + Vitest), API testing, role-based security, perf validation. Coverage target 80%. | Writing tests (TDD), E2E multi-role workflows, RLS policy validation, performance testing |

#### Design & Research Agents

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **ui-designer** | Senior UX/UI designer SaaS B2B — 3-phase methodology (Research → ASCII proposal → Execution). Mobile-first, Nielsen heuristics, persona-driven. | Creating interfaces, design system decisions, accessibility compliance. Always proposes ASCII mockup before code. |
| **researcher** | UX/UI Researcher — user research, competitive analysis (Airbnb, Linear, Revolut), persona validation tests. | Qualitative user research, competitive analysis, design recommendations based on persona data |

#### Quality & Maintenance Agents

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **refactoring-agent** | Refactoring specialist — migration to shadcn/ui, extract to Service Layer, real-time v2 hooks, type safety. Quality targets: cyclomatic < 10, duplication < 15%. | Performance improvement, security hardening, UX improvement, code quality improvement |
| **memory-synchronizer** | Documentation sync — audits real metrics vs documented (components, hooks, repos, services, routes). | Post-feature sync, documentation drift detection, memory bank maintenance |
| **ultrathink-orchestrator** | Strategic orchestrator for complex problems — 6-phase Ultrathink methodology (Think Different → Simplify Ruthlessly). Auto-escalation target. | Multi-domain problems (frontend+backend+DB), architectural decisions (>10 files), after 3 failed attempts, conceptual blockers |

#### SEO & Content Agents

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **seo-strategist** | SEO architect & competitive analyst — audit technique, keywords by persona, schema markup, E-E-A-T, hreflang FR/EN/NL, GEO optimization. Tracks 7 competitors. | Competitive analysis, SEO briefs, content strategy, keyword research, technical SEO audit |
| **seo-copywriter** | Conversion copywriter — persuasive SEO-optimized copy for marketing site AND app. 5 frameworks (PAS, AIDA, BAB), tone per persona, CRO data-driven. | Headlines, CTAs, microcopy, notifications, emails, landing pages, blog posts, pricing pages |
| **seo-reviewer** | Content quality gate — Seven Sweeps + Radix 5-competences + persona-fit + SEO/GEO compliance. Score 0-100, threshold >=75 for publication. | Content validation before publication, copy review, SEO compliance audit, persona-fit check |

#### Domain-Specific Agent

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **seido-debugger** | SEIDO-specific debugger — multi-role permissions, intervention workflows (9 statuts), notification delivery, dashboard data, auth, email (IMAP/Resend/Gmail OAuth). | Debug RLS/permissions, intervention workflow stuck, email system issues, real-time connection problems |

#### Template

| Agent | Description | When to Use |
|-------|-------------|-------------|
| **_base-template** | Common config inherited by all agents — Memory Bank refs, auth patterns, repository pattern, skills integration, compound engineering. | Never used directly. Provides shared context to all other agents. |

---

### 0.2 Skills (23 total)

Skills are reusable methodologies invoked via the `Skill` tool. They enforce discipline and prevent common mistakes.

#### A. Process Skills — Core Methodology (6)

| Skill | Description | Trigger |
|-------|-------------|---------|
| **sp-brainstorming** | Collaborative design dialogue — one question at a time, 2-3 approaches, validate incrementally. Saves design to `docs/plans/`. | BEFORE any creative work: new features, new components, modifying behavior. "Let's build...", "I want to add..." |
| **sp-writing-plans** | Write implementation plans with bite-sized TDD tasks (2-5 min each), exact file paths, complete code, verification commands. | Have spec/requirements for a multi-step task, before touching code. Saves to `docs/plans/`. |
| **sp-executing-plans** | Load plan, execute in batches of 3 tasks, quality-gate between batches, report at checkpoints. | Have a written plan to execute in a SEPARATE session with review checkpoints. |
| **sp-test-driven-development** | RED → GREEN → REFACTOR. Failing test first, reuse search, minimal implementation, then refactor. Iron Law: no production code without failing test. | When implementing ANY feature or bugfix, before writing implementation code. |
| **sp-systematic-debugging** | 4-phase root cause investigation: Observe → Hypothesize → Test → Fix. No symptom fixes. Iron Law: no fixes without root cause investigation. | ANY bug, test failure, unexpected behavior. "Ca ne marche pas...", "Erreur...", build failure. |
| **sp-verification-before-completion** | Evidence before claims — run verification, read output, THEN claim result. Post-verification knowledge capture. | About to claim work is complete/fixed/passing, before commits or PRs. |

#### B. Orchestration Skills (5)

| Skill | Description | Trigger |
|-------|-------------|---------|
| **sp-ralph** | Full feature orchestrator: PRD → stories → TDD implementation → quality gate. Zero commits until user validates. Single entry point for non-trivial features. | "ralph", "nouvelle feature", "implement this", "let's build". Calls sp-prd internally. |
| **sp-prd** | Generate structured PRDs with user stories, acceptance criteria, sizing (XS/S/M). Collaborative brainstorming (5-8 questions). | "create a prd", "plan this feature". Also called internally by sp-ralph. |
| **sp-orchestration** | Skill routing trigger matrix + orchestration chains + compound methodology. Decision guide for which skill to invoke. | When Claude needs to decide which skill(s) to invoke for a given request. |
| **sp-subagent-driven-development** | Execute plan via per-task subagents with two-stage review (spec + code quality) after each. Sequential, same session. | Have implementation plan with mostly independent tasks, staying in current session. |
| **sp-dispatching-parallel-agents** | Full worktree lifecycle: analyze parallelizability → branch from current → dispatch isolated agents → simplify → merge → cleanup. | 3+ independent tasks OR 2+ tasks touching different file domains. True parallel execution. |

#### C. Quality Skills (5)

| Skill | Description | Trigger |
|-------|-------------|---------|
| **sp-quality-gate** | 4-lens pre-commit review (Security, Performance, Patterns, Tests) + Simplify Quick-Scan + Knowledge Capture. Automated checks first (build, lint, test). | Before commits, when user types "git*", "quality check", "review my code". |
| **sp-simplify** | 3-agent parallel code review (Reuse + Quality + Efficiency). Finds duplicate functions, redundant state, N+1 queries, missed concurrency. | Deep code review, full-app audit, post-implementation cleanup. |
| **sp-requesting-code-review** | Dispatch code-reviewer subagent with structured context (SHAs, plan, description). | After completing tasks, before merge/PR, after major feature implementation. |
| **sp-receiving-code-review** | Technical evaluation of review feedback — verify before implementing. Push back when feedback breaks functionality or violates YAGNI. | Receiving code review feedback, especially if unclear or technically questionable. |
| **sp-compound** | Post-feature learning capture: updates AGENTS.md (learnings), progress.txt (log), creates retrospective doc. Auto-syncs memory bank. | "feature done", "ready to merge", after fixing complex bug (>1h), after major refactoring. |

#### D. Lifecycle Skills (3)

| Skill | Description | Trigger |
|-------|-------------|---------|
| **sp-finishing-a-development-branch** | Branch completion — presents 4 options (merge locally, push/PR, keep, discard). Verifies tests first. | Implementation complete, all tests pass, ready to integrate. |
| **sp-using-git-worktrees** | Create isolated git worktrees with smart directory selection, .gitignore safety, baseline test verification. | Starting feature work needing isolation, before executing implementation plans. |
| **sp-writing-skills** | Meta-skill for creating/editing skills using TDD applied to process docs. RED (pressure test) → GREEN (write skill) → REFACTOR (bulletproof). | Creating new skills, editing existing skills, verifying skills work before deployment. |

#### E. Domain-Specific Skills (4 — project-level only)

| Skill | Description | Trigger |
|-------|-------------|---------|
| **sp-a11y** | WCAG 2.1 AA accessibility audit — Perceivable, Operable, Understandable, Robust. Role-specific checks (gestionnaire/prestataire/locataire). | Creating UI components, before releases, when accessibility is mentioned. |
| **sp-analytics** | Event tracking design (Microsoft Clarity), funnel instrumentation, KPI measurement (MRR, churn, NPS). Privacy-compliant. | Adding analytics, measuring features, designing experiments. |
| **sp-monitoring** | Error budgets, Core Web Vitals (LCP/INP/CLS/TTFB), alerting thresholds, Supabase dashboard monitoring. | Setting up monitoring, investigating production issues, checking application health. |
| **sp-release** | Pre-deployment checklist (code, DB, env, features, changelog) + deployment process (Vercel) + rollback plan + post-deploy smoke test. | Before any production deployment. "deploy", "release", "ship it". |

---

### 0.3 Orchestration Chains — How They Work Together

```
NEW FEATURE (recommended):
  sp-ralph → sp-prd (internal) → stories → sp-tdd (per story) → sp-quality-gate → sp-compound

BUG FIX:
  sp-systematic-debugging → sp-tdd (failing test) → fix → sp-quality-gate → sp-verification → sp-compound

MULTI-DOMAIN (parallel):
  sp-ralph → sp-dispatching-parallel-agents → agents use sp-tdd → sp-quality-gate → sp-compound

PRE-COMMIT:
  sp-quality-gate → fix blockers → knowledge capture → git add/commit/push

SEO CONTENT:
  seo-strategist (brief) → seo-copywriter (write) → seo-reviewer (score ≥75) → publish

DEPLOYMENT:
  sp-release (pre-checks) → deploy → sp-monitoring (post-deploy)
```

---

## Architecture Overview

```
~/.claude/                          # GLOBAL — applies to ALL projects
  CLAUDE.md                         # Universal process rules
  settings.json                     # Hooks, plugins, env
  scripts/                          # Deterministic safety hooks
  skills/                           # Process methodology skills
  agents/                           # Role-based agent definitions

<project>/.claude/                  # PROJECT — overrides/extends global
  CLAUDE.md                         # Domain-specific rules + pointers
  settings.local.json               # Project permissions + hooks
  skills/                           # Domain-specific skills only
  agents/                           # Domain-specific agents only
  rules/                            # Conditional rules (globs-based)
  memory-bank/                      # Project knowledge base
  scripts/                          # Project-specific hooks
```

**Priority:** User instructions > Project CLAUDE.md > Global CLAUDE.md > System prompt

---

## 1. Global CLAUDE.md (~150 lines)

This file is loaded in EVERY conversation across ALL projects. Keep it concise and universal.

```markdown
# CLAUDE.md — Global Instructions

## INTERDICTIONS (Never violate)

1. **No git without `git*`:** NEVER run git add/commit/push unless user types `git*`
2. **No build without ask:** NEVER run build commands without explicit request. Use lint or typecheck instead
3. **No direct DB calls:** NEVER call database directly in components — Repository/Service Pattern only
4. **No `any` / `console.log`:** NEVER leave untyped code or debug logging in production

## Commit Workflow (on `git*`)

\```
git* → sp-quality-gate (4 lenses + simplify quick-scan)
     → Fix blockers
     → Knowledge Capture (compound? memory? CLAUDE.md? agents?)
     → git add . && git commit && git push origin [branch]
\```

## Skill & Agent Routing (First Response)

**For requests touching 3+ files, new features, bug fixes, workflow changes, or content creation:**

1. Evaluate which skills and/or agents are best suited
2. Present in first response:
   \```
   Approach proposee:
   - [skill/agent 1] — raison
   - [skill/agent 2] — raison
   - Parallelisation: oui/non (+ pourquoi)
   \```
3. Wait for validation before executing

**Skip for:** single-file edit, quick question, typo fix, config change, rename.

## Development Rules

**Architecture:** Repository Pattern | Service Layer | Server Components default | Error Boundaries
**Code Style:** kebab-case files | "handle" prefix events | const functions | Tailwind only | TypeScript strict
**File Org:** < 500 lines/file | Single responsibility | index.ts exports

## Code Craftsmanship Standards

**Applied automatically during ALL code writing.**

### Before Writing Code (Reuse Search)
1. Grep the codebase for similar functions before creating new ones
2. If existing utility does 80%+ of what you need — extend it
3. Check component library (shadcn/ui, etc.) before creating UI components
4. Check existing constants/enums before using string literals

### While Writing Code (Quality Guardrails)
| Anti-Pattern | Correct Pattern |
|---|---|
| Redundant state (derived from existing) | Compute from source state |
| Parameter sprawl (adding params) | Generalize or restructure |
| Copy-paste with variation | Extract shared abstraction |
| Stringly-typed (raw strings) | Use constants/enums/unions |
| `any` types | Proper TypeScript types |
| `console.log` | Remove or use logger |
| Inline styles | Tailwind classes |
| Hardcoded colors | CSS variables |

### After Writing Code (Efficiency Self-Check)
- [ ] No N+1 queries (batch with Promise.all)
- [ ] Independent async ops run in parallel
- [ ] No redundant DB queries (same data fetched twice)
- [ ] No TOCTOU (check-then-act) — operate directly, handle errors
- [ ] No overly broad queries (loading all when filtering for one)
- [ ] Event listeners / subscriptions cleaned up on unmount

## Parallel Execution Protocol

**For ANY multi-task execution (3+ independent tasks or 2+ tasks touching different file domains):**

1. **Analyze parallelizability:** Map file dependencies
2. **Branch awareness:** `git branch --show-current` — worktrees from CURRENT branch
3. **Dispatch:** One Agent per domain with `isolation: "worktree"` + `mode: "bypassPermissions"`
4. **Post-agent simplify:** Each agent runs Craftsmanship self-check before finishing
5. **Merge:** Sequentially merge each worktree branch (`git merge <branch> --no-edit`)
6. **Cleanup:** `git worktree remove` + `git branch -D` + `git worktree prune`

**Do NOT parallelize when:** tasks share files, output of one feeds another, or total changes < 3 files.

## Troubleshooting Protocol

En cas d'erreur non-triviale :
1. INVOQUER `sp-systematic-debugging` IMMEDIATEMENT
2. Suivre le protocole du skill (4 phases)

## Auto-Escalation

Invoquer `ultrathink-orchestrator` si : 3 tentatives echouees | multi-domaines | > 10 fichiers | incomprehension apres analyse.
```

### What to SPECIALIZE per project:
- Add project-specific INTERDICTIONS (e.g., auth patterns, framework rules)
- Add project dev commands (npm scripts, DB commands)
- Add memory bank pointers if using memory-bank pattern
- Add project-specific references (docs, design guides)

---

## 2. Global Skills (18 universal)

Each skill lives in `~/.claude/skills/<name>/SKILL.md`.

### Category A: Process Skills (core methodology)

| # | Skill | Lines | Purpose | Specialization Needed |
|---|-------|-------|---------|----------------------|
| 1 | **sp-brainstorming** | 60 | Collaborative design dialogue before any creative work. One question at a time, 2-3 approaches, incremental validation. | None — fully generic |
| 2 | **sp-writing-plans** | 133 | Write implementation plans with bite-sized tasks, TDD, DRY/YAGNI. Save to `docs/plans/`. | Remove risk examples referencing RLS/user archetypes |
| 3 | **sp-executing-plans** | 68 | Load plan, execute in batches of 3, report between batches, quality-gate per batch. | None — fully generic |
| 4 | **sp-test-driven-development** | 91 | RED → GREEN → REFACTOR cycle. Failing test first, minimal implementation, then refactor. | None — fully generic |
| 5 | **sp-systematic-debugging** | 85 | 4-phase debugging: Observe → Hypothesize → Test → Fix. No guessing. | None — fully generic |
| 6 | **sp-verification-before-completion** | 83 | Evidence before claims. Run verification, read output, THEN claim result. Knowledge capture post-verification. | None — fully generic |

### Category B: Orchestration Skills

| # | Skill | Lines | Purpose | Specialization Needed |
|---|-------|-------|---------|----------------------|
| 7 | **sp-ralph** | 251 | Full feature orchestrator: PRD → stories → TDD implementation → quality gate. Zero commits until validated. | Remove SEIDO Checklist section (10 items). Replace with `[PROJECT-SPECIFIC CHECKLIST]` placeholder |
| 8 | **sp-prd** | 202 | Generate structured PRDs with user stories, acceptance criteria, sizing (XS/S/M). | Remove SEIDO-specific role examples. Keep the format generic |
| 9 | **sp-orchestration** | 129 | Skill routing trigger matrix, chain definitions, compound methodology. | Remove SEIDO-specific trigger table. Keep chain patterns generic |
| 10 | **sp-subagent-driven-development** | 60 | Execute plans via parallel subagents in current session. | None — fully generic |
| 11 | **sp-dispatching-parallel-agents** | 169 | Full worktree lifecycle: analyze → branch from current → dispatch → simplify → merge → cleanup. | None — fully generic |

### Category C: Quality Skills

| # | Skill | Lines | Purpose | Specialization Needed |
|---|-------|-------|---------|----------------------|
| 12 | **sp-quality-gate** | 251 | Pre-commit 4-lens review (Security, Performance, Patterns, Tests) + Simplify Quick-Scan + Knowledge Capture. | Remove SEIDO-Specific Checks section (12 items). Replace with `[PROJECT-SPECIFIC CHECKS]` placeholder |
| 13 | **sp-simplify** | 111 | Deep code review for reuse, quality, efficiency. 3-agent parallel analysis. | Remove references to getServerAuthContext/RLS |
| 14 | **sp-requesting-code-review** | 70 | Dispatch reviewer agent with structured context before merge/PR. | None — fully generic |
| 15 | **sp-receiving-code-review** | 75 | Technical rigor when receiving feedback — verify before implementing. | None — fully generic |
| 16 | **sp-compound** | 227 | Post-feature learning capture: AGENTS.md, progress.txt, retrospectives. Auto-sync memory. | None — fully generic |

### Category D: Lifecycle Skills

| # | Skill | Lines | Purpose | Specialization Needed |
|---|-------|-------|---------|----------------------|
| 17 | **sp-finishing-a-development-branch** | 104 | Branch completion options: merge, PR, cleanup. Structured decision. | None — fully generic |
| 18 | **sp-using-git-worktrees** | 84 | Create isolated worktrees with safety verification. | None — fully generic |
| 19 | **sp-writing-skills** | 86 | Meta-skill for creating/editing skills with verification. | None — fully generic |

### NOT global (keep per project):

| Skill | Lines | Why project-level |
|-------|-------|-------------------|
| sp-a11y | 98 | Audit criteria reference project roles |
| sp-analytics | 123 | Event taxonomy is project-specific |
| sp-monitoring | 84 | Error budgets/thresholds are project-specific |
| sp-release | 92 | Deployment process is project-specific |

> **These 4 are good TEMPLATES** — copy them into a new project and specialize.

---

## 3. Global Agents (10 universal)

Each agent lives in `~/.claude/agents/<name>.md`.

### Base Template

**`_base-template.md`** (~80 lines, generalized from SEIDO's 187-line version)

Contains the universal parts that ALL agents inherit:
- Official Documentation First (check framework docs before implementing)
- Architecture Patterns (Repository Pattern, Service Layer, Server Components)
- Skills Integration table (which skill to invoke when)
- Red Flags table (thought → skill mapping)
- Code Craftsmanship Standards (mandatory before/while/after writing)
- Quality Gate participation rules
- Compound contribution rules

**To specialize per project:** Add project-specific patterns, DB schema references, auth patterns, role definitions.

### Universal Agents

| # | Agent | Lines | Role | Specialization Needed |
|---|-------|-------|------|----------------------|
| 1 | **backend-developer** | 159 | APIs, DB, auth, business logic, server performance | Remove SEIDO learnings section. Add project-specific DB/auth patterns |
| 2 | **frontend-developer** | 180 | Web UI, components, performance, accessibility | Remove SEIDO learnings section. Add project component library/patterns |
| 3 | **API-designer** | 175 | API design, endpoints, standards, documentation | Remove SEIDO statuses/auth. Add project API conventions |
| 4 | **database-analyzer** | 183 | Schema analysis, coherence checks, migration review | Remove SEIDO learnings. Add project DB schema reference |
| 5 | **tester** | 169 | Unit, integration, E2E, security, performance testing | Remove SEIDO test patterns. Add project test framework/config |
| 6 | **refactoring-agent** | 147 | Performance, security, UX, code quality improvements | Remove SEIDO references. Keep sp-simplify integration |
| 7 | **ui-designer** | 275 | Multi-variant UI design (3-variant methodology) | Remove SEIDO role references. Keep design methodology generic |
| 8 | **researcher** | 145 | UX/UI research, user analysis, design standards | Remove SEIDO personas. Add project user research context |
| 9 | **ultrathink-orchestrator** | 433 | 6-phase deep reasoning for complex problems. Auto-escalation target. | Remove SEIDO references. Keep methodology (THINK DIFFERENT → SIMPLIFY RUTHLESSLY) |
| 10 | **memory-synchronizer** | 145 | Sync documentation with code state | Remove SEIDO file paths. Add project memory-bank paths |

### NOT global (keep per project):

| Agent | Lines | Why project-level |
|-------|-------|-------------------|
| seido-debugger | 165 | Entirely domain-specific (intervention workflow, RLS, notifications) |
| seo-copywriter | 812 | Brand voice, personas, competitors are project-specific |
| seo-reviewer | 592 | Scoring criteria tied to project personas |
| seo-strategist | 871 | Keyword strategy, competitor analysis are project-specific |

> **SEO agents are excellent templates** for any SaaS project needing content marketing. Copy and replace brand/persona references.

---

## 4. Global Scripts (2 universal)

Live in `~/.claude/scripts/`.

### Universal Safety Scripts

#### `block-dangerous-commands.js` (29 lines)
```javascript
// PreToolUse hook — blocks dangerous bash commands
// Checks for: git push --force to main/master, git reset --hard,
// rm -rf /, git clean -fd, DROP TABLE, TRUNCATE
// Returns { "decision": "block", "reason": "..." } or { "decision": "allow" }
```
**Specialization:** None needed — generic safety patterns.

#### `block-secret-writes.js` (20 lines)
```javascript
// PreToolUse hook — blocks writes to sensitive files
// Matches: .env*, *.key, *.pem, *secret*, *credential*, *password*
// Returns { "decision": "block", "reason": "..." } or { "decision": "allow" }
```
**Specialization:** None needed — generic file patterns.

### NOT global (project-specific):

| Script | Lines | Why project-level |
|--------|-------|-------------------|
| check-memory-drift.js | 142 | References project-specific file paths for staleness detection |
| track-changes.js | 74 | CRITICAL_PATTERNS list is project-specific |
| update-active-context.js | 98 | Writes to project memory-bank paths |

> **These 3 are great templates** for any project using the memory-bank pattern. Copy and replace file paths.

---

## 5. Global Settings (`~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/scripts/block-dangerous-commands.js",
            "timeout": 5
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/scripts/block-secret-writes.js",
            "timeout": 5
          }
        ]
      }
    ]
  },
  "enabledPlugins": {
    "superpowers@claude-plugins-official": true
  },
  "alwaysThinkingEnabled": true
}
```

**Per project `settings.local.json`:** Add project-specific permissions (WebFetch domains, allowed Bash commands), PostToolUse hooks (track-changes), Stop hooks (update-active-context), outputStyle.

---

## 6. Project-Level Structure (what stays per project)

```
<project>/.claude/
  CLAUDE.md                    # Domain rules, auth pattern, commands, memory bank pointers
  settings.local.json          # Permissions, project hooks, outputStyle

  skills/
    sp-orchestration/          # Project-specific trigger matrix + chains
    sp-a11y/                   # Project-specific accessibility criteria
    sp-analytics/              # Project-specific event taxonomy
    sp-monitoring/             # Project-specific error budgets
    sp-release/                # Project-specific deployment process
    [domain-skills]/           # Any domain-specific skills (SEO, etc.)

  agents/
    [project]-debugger.md      # Domain-specific debugger
    [domain-agents]/           # SEO, industry-specific agents

  rules/
    [domain]-rules.md          # Conditional rules with globs: frontmatter
    [reference].md             # Quick-reference extracted from CLAUDE.md

  scripts/
    check-memory-drift.js      # Project file paths
    track-changes.js           # Project critical patterns
    update-active-context.js   # Project memory-bank paths

  memory-bank/                 # Project knowledge base
    activeContext.md
    systemPatterns.md
    techContext.md
    productContext.md
    projectbrief.md
    progress.md
```

### Project CLAUDE.md Template (~80 lines)

```markdown
# CLAUDE.md — [Project Name]

## Memory Bank
[Table pointing to memory-bank files]
Rules auto-loaded from `.claude/rules/*.md`.

## Project-Specific Rules
[Auth pattern, framework conventions, domain constraints]

## Development Commands
[Project npm scripts, DB commands, test commands]

## [Framework] Authentication Pattern
[Project's auth pattern with code example]

## Project References
[Official docs, project docs, design guides]

## Extracted Content (Lazy-Loaded)
[Pointers to rules/ files for status values, roles, features]
```

---

## 7. New Project Setup Checklist

When starting a new project with this ecosystem:

### Step 1: Verify Global Setup
```bash
# Check global structure exists
ls ~/.claude/CLAUDE.md
ls ~/.claude/skills/
ls ~/.claude/agents/
ls ~/.claude/scripts/
```

### Step 2: Initialize Project Structure
```bash
mkdir -p .claude/skills .claude/agents .claude/rules .claude/scripts .claude/memory-bank
```

### Step 3: Create Project CLAUDE.md
- Copy template from Section 6
- Fill in: auth pattern, dev commands, domain rules
- Add memory-bank pointers

### Step 4: Copy & Specialize Template Skills
```bash
# Copy skills that need project specialization
cp -r ~/.claude/skills/sp-quality-gate .claude/skills/  # Add project-specific checks
cp -r ~/.claude/skills/sp-ralph .claude/skills/          # Add project checklist
cp -r ~/.claude/skills/sp-orchestration .claude/skills/  # Add project triggers
```

Edit each to add project-specific sections:
- **sp-quality-gate:** Add `## [Project]-Specific Checks` section
- **sp-ralph:** Add `## [Project] Checklist` section
- **sp-orchestration:** Add project trigger matrix

### Step 5: Copy & Specialize Template Agents
- Copy `_base-template.md` → add project patterns, DB schema, roles
- Copy needed agents → add project learnings sections
- Create domain-specific agents (debugger, SEO, etc.)

### Step 6: Create Project Rules
```markdown
---
globs: ["lib/services/**", "app/actions/**"]
---
# [Domain] Reference
[Status values, role definitions, API conventions]
```

### Step 7: Create Project Hooks (if using memory-bank)
- Copy `track-changes.js` → update CRITICAL_PATTERNS
- Copy `update-active-context.js` → update file paths
- Copy `check-memory-drift.js` → update source paths
- Add to `settings.local.json`

### Step 8: Initialize Memory Bank
```bash
# Create starter files
touch .claude/memory-bank/{activeContext,systemPatterns,techContext,productContext,projectbrief,progress}.md
```

### Step 9: First Session Verification
```
1. Open Claude Code in project
2. Verify global skills are available (check skill list)
3. Verify project CLAUDE.md is loaded (check instructions)
4. Test: "git*" → should trigger quality-gate
5. Test: "new feature" → should propose skill routing
```

---

## 8. Skill Interaction Map

```
                    ┌─────────────────┐
                    │   User Request   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Skill Routing   │ ← CLAUDE.md first-response rule
                    │  (propose plan)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐ ┌──────▼──────┐
     │ Bug Fix    │  │ New Feature│ │ Refactoring │
     └────────┬───┘  └──────┬─────┘ └──────┬──────┘
              │              │              │
     ┌────────▼───┐  ┌──────▼─────┐ ┌──────▼──────┐
     │ systematic │  │ brainstorm │ │  simplify   │
     │ debugging  │  │     ↓      │ │     ↓       │
     │     ↓      │  │   ralph    │ │ quality-gate│
     │    TDD     │  │  (or prd)  │ └─────────────┘
     │  (fix it)  │  │     ↓      │
     └────────┬───┘  │  TDD loop  │
              │      │     ↓      │
              │      │ quality-   │
              │      │   gate     │
              │      └──────┬─────┘
              │              │
              └──────┬───────┘
                     │
            ┌────────▼────────┐
            │  verification   │ ← Evidence before claims
            │  before         │
            │  completion     │
            └────────┬────────┘
                     │
            ┌────────▼────────┐
            │   git* commit   │ ← quality-gate + knowledge capture
            └────────┬────────┘
                     │
            ┌────────▼────────┐
            │    compound     │ ← Capture learnings
            └─────────────────┘
```

---

## 9. Files Summary

| Location | Count | Type |
|----------|-------|------|
| **Global CLAUDE.md** | 1 | Universal process rules |
| **Global skills** | 19 | Process/methodology skills |
| **Global agents** | 10 | Role-based agents (generalized) |
| **Global scripts** | 2 | Safety hooks |
| **Global settings** | 1 | Hooks + plugins config |
| **Per-project CLAUDE.md** | 1 | Domain-specific rules |
| **Per-project skills** | 3-8 | Domain overrides + new domain skills |
| **Per-project agents** | 2-5 | Domain-specific agents |
| **Per-project rules** | 2-5 | Conditional domain rules |
| **Per-project scripts** | 3 | Memory-bank hooks |
| **Per-project memory-bank** | 6 | Project knowledge base |

**Total global files: ~33** | **Per-project files: ~20-30**
