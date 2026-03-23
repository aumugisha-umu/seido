# CLAUDE.md — Guidance for Claude Code

## INTERDICTIONS (Never violate)

1. **No git without `git*`:** NEVER run git add/commit/push unless user types `git*`
2. **No build without ask:** NEVER run `npm run build` unless user explicitly asks. Use `npm run lint` or `npx tsc --noEmit [file]` for validation. **Exception:** `npm run build` is required during the `git*` quality-gate commit workflow (automated checks step)
3. **No direct Supabase:** NEVER call Supabase directly in components — Repository Pattern only
4. **No `any` / `console.log`:** NEVER leave `any` types or `console.log` in production code

## Commit Workflow (on `git*`)

**Runs autonomously — no manual validation needed.** Only ask user if a blocker requires a design decision.

```
git* → sp-quality-gate (autonomous, bypassPermissions)
     → Automated: lint && build && tests && Playwright E2E
        (auto-starts `npm run dev` if no server running, waits 30s)
     → 4-lens review + simplify quick-scan
     → Fix blockers autonomously if possible
     → Step 4.5: Knowledge Capture (compound? memory? CLAUDE.md? agents?)
     → Step 4.6: Discovery Tree Sync
        Si des routes/pages/wizards/flows ont ete modifies dans ce commit :
        1. Mettre a jour docs/qa/discovery-tree.json (noeuds ajoutes/modifies/supprimes)
        2. npx tsx scripts/generate-discovery-tree.ts (regenerer le markdown)
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
**Docs First (context7 priority) :** Avant toute modification touchant une librairie externe (Supabase, Next.js, React, Stripe, Resend, shadcn/ui, etc.) :
1. **D'abord** utiliser MCP context7 (`resolve-library-id` → `query-docs`) pour chercher la doc a jour
2. **Si context7 n'a pas la lib ou la section** → consulter la doc officielle en ligne : [Supabase](https://supabase.com/docs), [Next.js](https://nextjs.org/docs), [React](https://react.dev/learn)
3. **Ne jamais coder de memoire** une API/config quand la doc est accessible via context7

**UX/UI :** Consulter `docs/design/ux-ui-decision-guide.md` pour toute modification UX/UI.

**Test Maintenance (auto-update) :** Quand une modification touche :
- Une route (`page.tsx` ajoutee/supprimee/renommee)
- Un wizard/formulaire (etapes ajoutees/supprimees)
- Un statut ou flow d'intervention (nouveau statut, transition modifiee)
- Un bouton/action visible par l'utilisateur
→ Mettre a jour **dans le meme changement** :
1. `docs/qa/discovery-tree.json` — ajouter/modifier/supprimer le noeud concerne
2. Les tests E2E impactes (`tests/e2e/`)
3. Reggenerer le markdown : `npx tsx scripts/generate-discovery-tree.ts`

**Invitations de test :** Toujours utiliser `demo+invite-{timestamp}@seido-app.com` pour les adresses creees lors des tests (E2E, integration).

---

## Discovery Tree (QA)

L'arbre de decouverte est la **source de verite** de tous les chemins testables dans l'application :
- **JSON** (source) : `docs/qa/discovery-tree.json` — source de verite, mis a jour a chaque changement de route/flow
- **Markdown** (lisible) : `docs/qa/discovery-tree.md` — auto-genere via `npx tsx scripts/generate-discovery-tree.ts`
- **103 noeuds** : 9 auth, 70 gestionnaire, 12 locataire, 12 prestataire + 4 scenarios cross-role
- **3 modes** : discovery (lecture), creation (ecriture), destruction (suppression)

Consulter cet arbre avant d'ajouter une nouvelle page ou de modifier un flow existant.

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
npm run test:e2e         # E2E tests (Playwright)
npm run test:e2e:headed  # E2E with visible browser
npm run test:e2e:debug   # E2E with Playwright inspector
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
**Last Updated**: 2026-03-21 | **Status**: Production Ready
