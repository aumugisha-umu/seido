# CLAUDE.md — Guidance for Claude Code

## INTERDICTIONS (Never violate)

1. **No git without `git*`:** NEVER run git add/commit/push unless user types `git*`
2. **No build without ask:** NEVER run `npm run build` unless user explicitly asks. Use `npm run lint` or `npx tsc --noEmit [file]` for validation. **Exception:** `npm run build` is required during the `git*` quality-gate commit workflow (automated checks step)
3. **No direct Supabase:** NEVER call Supabase directly in components — Repository Pattern only
4. **No `any` / `console.log`:** NEVER leave `any` types or `console.log` in production code

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
**Last Updated**: 2026-03-25 | **Status**: Production Ready
