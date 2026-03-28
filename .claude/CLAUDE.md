# CLAUDE.md — Guidance for Claude Code

## Boundaries

### Auto-Apply (no confirmation needed)
- Repository Pattern for ALL Supabase queries — never direct calls in components
- `getServerAuthContext(role)` in Server Components, `getServerActionAuthContextOrNull()` in Server Actions
- Grep codebase for existing utils/components before creating new ones
- Docs First: context7 → official docs → never code from memory
- Update `discovery-tree.json` when adding/modifying/removing routes
- Use `demo+invite-{timestamp}@seido-app.com` for test email addresses
- Use `after()` from `next/server` for post-response side-effects (emails, notifications, logs)
- Add `data-testid` on interactive elements for E2E resilience
- Before DB-touching changes: read `lib/database.types.ts` + check existing RLS in `.claude/rules/database-rules.md`
- Before adding/modifying routes: consult `docs/qa/discovery-tree.json` for existing paths

### Ask First (before implementation)
- New DB migration or schema change
- New server action with business logic
- Modifying auth/RLS/middleware/security
- Cross-cutting changes touching 3+ domains (DB+API+UI)
- Adding new npm dependency
- Modifying billing/subscription/payment flow
- Deleting or renaming files used across multiple modules
- Changing intervention status flow or quote statuts
- Deleting DB data or dropping columns
- Updating `.claude/rules/*.md`, agent configs, or skill definitions

### Never Do
- `git add`/`commit`/`push` without user typing `git*`
- `npm run build` without explicit ask (exception: `git*` FULL gate)
- `npm run dev` without explicit ask
- Leave `any` types or `console.log` in production code
- Direct Supabase calls in components (Repository Pattern only)
- Commit `.env`, credentials, or secrets
- Force-push to `main`/`preview` branches
- Use `users.team_id` for access control (use `team_members`)
- Use `.single()` for multi-team queries (use `.limit(1)`)
- Create new files when editing existing ones achieves the goal
- Skip `sp-systematic-debugging` when encountering non-trivial bugs
- Create migration files manually — use `npx supabase migration new <name>`

## Project Structure

```
app/                    → Next.js App Router
  [role]/(with-navbar)/ → Role-scoped pages (admin, gestionnaire, prestataire, locataire)
  actions/              → Server actions
  api/                  → API routes (REST + cron/ + webhooks)
components/             → Reusable UI components (grouped by domain)
  ui/                   → shadcn/ui primitives
hooks/                  → Custom React hooks
lib/
  services/
    core/               → Supabase clients, BaseRepository, error handler
    repositories/       → Data access layer (one per entity)
    domain/             → Business logic services
  email/                → Resend client, EMAIL_CONFIG
  types/                → Shared TypeScript types
  validation/           → Zod schemas
  utils/                → Utility functions
contexts/               → React contexts (auth, realtime, subscription)
supabase/migrations/    → SQL migrations (chronological)
tests/                  → E2E (Playwright) + unit (Vitest) + integration
  shared/pages/         → Shared Page Object Models
docs/                   → Design docs, plans, learnings, QA
.claude/                → Agent configs, skills, rules, memory bank, hooks
blog/articles/          → Markdown blog posts with YAML frontmatter
middleware.ts           → Auth routing + role redirect (root file)
```

> Exact counts evolve — use `Glob` to count. Structural map above is stable.

**Key references:**
- **User paths:** `docs/qa/discovery-tree.json` — source of truth for all testable routes (103 nodes, 3 modes)
- **DB schema:** `lib/database.types.ts` (generated) + `supabase/migrations/` (SQL source)
- **RLS functions:** 10 helpers — see `.claude/rules/database-rules.md`
- **Intervention flow:** 9 statuts, 7 quote statuts — see `.claude/rules/intervention-rules.md`

## Commit Workflow (on `git*`)

**Runs autonomously — no manual validation needed.** Only ask user if a blocker requires a design decision.

```
git* → Triage: LIGHT or FULL quality gate?

LIGHT (default — UI, config, styling, docs, simple fixes, single-concern):
  → npm run lint
  → Quick eyeball review of changed files (no agent)
  → git add . && git commit && git push origin [branch]

FULL (security, auth, RLS, DB migrations, multi-domain, new features with business logic):
  → sp-quality-gate (autonomous, bypassPermissions)
  → Automated: lint && build && tests && Playwright E2E
  → 4-lens review + simplify quick-scan
  → Fix blockers autonomously
  → Knowledge Capture + Discovery Tree Sync
  → git add . && git commit && git push origin [branch]

Triggers for FULL gate:
  - Touches auth/RLS/middleware/security
  - New DB migration or schema change
  - New server action with business logic
  - Changes to billing/subscription/payment
  - Cross-cutting changes (3+ domains: DB+API+UI)
  - User explicitly asks for full review

Commit message format: `type(scope): description` — types: feat, fix, refactor, docs, test, chore
```

## Skill & Agent Routing (First Response)

**For requests touching 3+ files, new features, bug fixes, workflow changes, or content creation:**

1. **Evaluate** which skills and/or agents are best suited
2. **Present** in first response:
   ```
   Approach proposee:
   - [skill/agent 1] — raison
   - [skill/agent 2] — raison
   - Parallelisation: oui/non (+ pourquoi)
   ```
3. **Wait for validation** before executing

**Skip for:** single-file edit, quick question, typo fix, config change, rename.

**Agent dispatch:** When spawning agents, include `Read .claude/agents/_base-template.md first` in the prompt for full SEIDO context.

---

## Memory Bank

| Fichier | Quand le lire |
|---------|---------------|
| `.claude/memory-bank/activeContext.md` | **Debut de chaque session** |
| `.claude/memory-bank/systemPatterns.md` | Avant modifications code |
| `.claude/memory-bank/techContext.md` | Avant modifications DB |
| `.claude/memory-bank/productContext.md` | Avant modifications UX |
| `.claude/memory-bank/projectbrief.md` | Pour contexte global |
| `.claude/memory-bank/progress.md` | Pour suivi projet |

Rules auto-loaded from `.claude/rules/*.md`: intervention-rules, database-rules, ui-rules, code-quality, testing-rules, seido-reference, feature-reference.
Commands: `/sync-memory` (quick sync) | `/update-memory` (full update)

---

## Development Commands

```bash
npm run dev                            # Dev server (only if asked)
npm run lint                           # ESLint validation
npx tsc --noEmit [file]                # Validation TS ciblee
npx supabase migration new <name>      # Creer migration (auto-timestamp)
npm run supabase:types                 # Regenerer lib/database.types.ts
npm test                               # Unit tests (vitest)
npm run test:e2e                       # E2E tests (Playwright)
npm run test:e2e:headed                # E2E with visible browser
npm run test:e2e:debug                 # E2E with Playwright inspector
```

**Migrations:** TOUJOURS utiliser `npx supabase migration new <name>` — ne jamais creer les fichiers SQL manuellement (timestamp incorrecte = conflits de migration).

> Complete list: `techContext.md`

**After DB reset:** `node scripts/create-admin-user.mjs` — recreates admin@seido-app.com (Admin API, idempotent). Required because SQL migrations cannot reliably create auth.users entries (GoTrue internal columns).

---

## Development Rules

**Architecture:** Repository Pattern | Service Layer | Server Components default | Error Boundaries
**Code Style:** kebab-case files | "handle" prefix events | const functions | Tailwind only | TypeScript strict
**File Org:** < 500 lines/file | Single responsibility | index.ts exports

---

**Code Craftsmanship:** Applied automatically during all code writing. Full checklist: `.claude/skills/sp-simplify/craftsmanship-standards.md`
**Parallel Execution:** See `sp-dispatching-parallel-agents` skill for full protocol. Key rule: worktrees branch from CURRENT branch, not main.
**Design Quality:** Anti-AI-slop criteria: `docs/design/design-evaluation-criteria.md`

---

## Troubleshooting Protocol

**En cas d'erreur non-triviale :**
1. **INVOQUER** `sp-systematic-debugging` **IMMEDIATEMENT**
2. Suivre le protocole du skill (4 phases)
3. Consulter `docs/troubleshooting-checklist.md` si recommande

Quick Ref: File editing (S1), Column not found (S2), Auth (S3), Permissions (S4), Build (S5)

---

## Auto-Escalation

Invoquer `ultrathink-orchestrator` si : 3 tentatives echouees | multi-domaines (DB+API+UI) | > 10 fichiers | incomprehension apres analyse. Details : `.claude/agents/ultrathink-orchestrator.md`

---

## Essential References

**Official:** [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs) | [Next.js App Router](https://nextjs.org/docs/app) | [React 19](https://react.dev/blog/2024/12/05/react-19)
**Project:** `docs/refacto/database-refactoring-guide.md` | `docs/refacto/Tests/HELPERS-GUIDE.md` | `lib/services/README.md`

---

## Extracted Content (Lazy-Loaded)

- **Quick Reference** (status, roles, DB clients): `.claude/rules/seido-reference.md`
- **Feature Reference** (2026-01/02/03): `.claude/rules/feature-reference.md`
- **Skill Routing** (triggers, chains, compound): `sp-orchestration` skill

---
**Last Updated**: 2026-03-28 | **Status**: Production Ready
