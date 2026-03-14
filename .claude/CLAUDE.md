# CLAUDE.md — Guidance for Claude Code

## INTERDICTIONS (Never violate)

1. **No git without `git*`:** NEVER run git add/commit/push unless user types `git*`
2. **No build without ask:** NEVER run `npm run build` unless user explicitly asks. Use `npm run lint` or `npx tsc --noEmit [file]` for validation. **Exception:** `npm run build` is required during the `git*` quality-gate commit workflow (automated checks step)
3. **No direct Supabase:** NEVER call Supabase directly in components — Repository Pattern only
4. **No `any` / `console.log`:** NEVER leave `any` types or `console.log` in production code

## Commit Workflow (on `git*`)

```
git* → sp-quality-gate (4 lenses + simplify quick-scan)
     → Fix blockers
     → Step 4.5: Knowledge Capture (compound? memory? CLAUDE.md? agents?)
     → git add . && git commit && git push origin [branch]
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

Rules auto-loaded from `.claude/rules/*.md`: intervention-rules, database-rules, ui-rules, seido-reference, feature-reference.
Commands: `/sync-memory` (quick sync) | `/update-memory` (full update)

---

## Regles Obligatoires

**Audit :** A chaque test, mettre a jour `docs/rapport-audit-complet-seido.md`
**Docs First :** Consulter [Supabase](https://supabase.com/docs), [Next.js](https://nextjs.org/docs), [React](https://react.dev/learn) avant modification.
**UX/UI :** Consulter `docs/design/ux-ui-decision-guide.md` pour toute modification UX/UI.

---

## Server Component Authentication Pattern

**Pattern OBLIGATOIRE pour toutes les pages Server Component :**

```typescript
import { getServerAuthContext } from '@/lib/server-context'

export default async function MyPage() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  const data = await someService.getData(team.id)
  return <MyPageClient data={data} />
}
```

**ANTI-PATTERNS :** Auth manuelle avec `createServerSupabaseClient()` + `supabase.auth.getUser()`, ou pas d'auth du tout. Details : `systemPatterns.md` section "Server Authentication"

---

## Development Commands

```bash
npm run dev              # Dev server (only if asked)
npm run lint             # ESLint validation
npx tsc --noEmit [file]  # Validation TS ciblee
npm run supabase:types   # Regenerer lib/database.types.ts
npm run supabase:migrate # Nouvelle migration
npm test                 # Unit tests (vitest)
npm run test:e2e         # E2E tests (Puppeteer + vitest)
npm run test:e2e:headed  # E2E with visible browser
```

> Complete list: `techContext.md`

---

## Development Rules

**Architecture:** Repository Pattern | Service Layer | Server Components default | Error Boundaries
**Code Style:** kebab-case files | "handle" prefix events | const functions | Tailwind only | TypeScript strict
**File Org:** < 500 lines/file | Single responsibility | index.ts exports

---

## Code Craftsmanship Standards (Embedded from /simplify)

**Applied automatically during ALL code writing.**

### Before Writing Code (Reuse Search)
1. **Grep the codebase** for similar functions before creating new ones (`lib/utils/`, `lib/constants/`, `components/ui/`, adjacent files)
2. **If existing utility does 80%+ of what you need** — extend it, don't create a new one
3. **Check shadcn/ui** before creating UI components
4. **Check existing constants/enums** before using string literals

### While Writing Code (Quality Guardrails)
| Anti-Pattern | Correct Pattern |
|---|---|
| Redundant state (derived from existing) | Compute from source state |
| Parameter sprawl (adding params) | Generalize or restructure |
| Copy-paste with variation | Extract shared abstraction |
| Stringly-typed (raw strings) | Use constants/enums/unions |
| `any` types | Proper TypeScript types |
| `console.log` | Remove or use `logger` |
| Inline styles | Tailwind classes |
| Hardcoded colors | CSS variables from `globals.css` |

### After Writing Code (Efficiency Self-Check)
- [ ] No N+1 queries (batch with `Promise.all`)
- [ ] Independent async ops run in parallel (not sequential)
- [ ] No redundant DB queries (same data fetched twice)
- [ ] No TOCTOU (check-then-act) — operate directly, handle errors
- [ ] No overly broad queries (loading all when filtering for one)
- [ ] Event listeners / subscriptions cleaned up on unmount
- [ ] Separate try-catch for JSON.parse vs business logic errors

---

## Parallel Execution Protocol

**For ANY multi-task execution (3+ independent tasks or 2+ tasks touching different file domains):**

1. **Analyze parallelizability:** Map file dependencies — tasks touching different files can run in parallel
2. **Branch awareness:** `git branch --show-current` — worktrees MUST branch from the CURRENT branch, not main
3. **Dispatch:** Launch one Agent per domain with `isolation: "worktree"` + `mode: "bypassPermissions"`. Each agent commits on its worktree branch.
4. **Post-agent simplify:** Each agent runs Craftsmanship Standards self-check on its changes before finishing
5. **Merge:** Sequentially merge each worktree branch into the current branch (`git merge <branch> --no-edit`)
6. **Cleanup:** `git worktree remove` + `git branch -D` for each worktree, then `git worktree prune`

**Do NOT parallelize when:** tasks share files, output of one feeds another, or total changes < 3 files.

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
**Last Updated**: 2026-03-14 | **Status**: Production Ready
