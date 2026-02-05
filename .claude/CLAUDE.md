# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Memory Bank - Documentation Vivante

**SEIDO utilise un systeme Memory Bank pour optimiser le contexte Claude Code.**

### Fichiers Essentiels a Consulter

| Fichier | Usage | Quand le lire |
|---------|-------|---------------|
| `.claude/memory-bank/activeContext.md` | Focus session actuelle | **Debut de chaque session** |
| `.claude/memory-bank/systemPatterns.md` | Architecture et patterns | Avant modifications code |
| `.claude/memory-bank/techContext.md` | Stack, DB schema, RLS | Avant modifications DB |
| `.claude/memory-bank/productContext.md` | Frustrations personas | Avant modifications UX |
| `.claude/memory-bank/projectbrief.md` | Vision et objectifs | Pour contexte global |
| `.claude/memory-bank/progress.md` | Historique et milestones | Pour suivi projet |

### Navigation Rapide

| Besoin | Fichier de reference |
|--------|---------------------|
| Architecture & Patterns | `systemPatterns.md` |
| Commandes dev & DB schema | `techContext.md` |
| Personas & frustrations UX | `productContext.md` |
| Index structurel (domaines, patterns) | `PROJECT_INDEX.json` |

### Regles Conditionnelles

Les fichiers `.claude/rules/*.md` s'appliquent automatiquement :
- `intervention-rules.md` - Workflow interventions
- `database-rules.md` - Modifications DB/RLS
- `ui-rules.md` - Composants UI

### Auto-Update & Commandes

- `activeContext.md` mis a jour automatiquement apres chaque reponse
- `/sync-memory` - Synchronisation rapide
- `/update-memory` - Mise a jour complete

---

## Regles Strictes Projet

### Mise a jour du Rapport d'Audit

**A chaque fois qu'on fait des tests sur l'application**, mettre a jour :
`docs/rapport-audit-complet-seido.md`

### Pas de Build Automatique

**INTERDICTION ABSOLUE de lancer `npm run build` sans demande explicite.**

**Alternatives obligatoires :**
```bash
# Validation TypeScript ciblee (rapide)
npx tsc --noEmit components/ui/my-component.tsx

# Validation ESLint
npm run lint -- components/ui/my-component.tsx
```

**Exceptions :** Uniquement si l'utilisateur tape "git*" ou demande explicitement un build.

---

## Official Documentation First

**Before making ANY modification:**
1. **Always consult official documentation first**:
   - [Supabase Official Docs](https://supabase.com/docs)
   - [Next.js Official Docs](https://nextjs.org/docs)
   - [React Official Docs](https://react.dev/learn)
2. **Apply official recommendations** over custom patterns found in codebase

---

## UX/UI Design Guidelines

**Pour TOUTE modification UX/UI, TOUJOURS consulter :**

### Point d'Entree Principal

`docs/design/ux-ui-decision-guide.md` - Index complet vers :
- `ux-common-principles.md` - Nielsen, Material Design 3, Apple HIG
- `ux-components.md` - Navigation, Forms, Notifications
- `ux-anti-patterns.md` - Erreurs a eviter
- `ux-metrics.md` - KPIs UX, Core Web Vitals

### Guidelines par Role

| Role | Persona | Guidelines | Focus |
|------|---------|------------|-------|
| Gestionnaire | `persona-gestionnaire-unifie.md` | `ux-role-gestionnaire.md` | 70% users, productivite |
| Prestataire | `persona-prestataire.md` | `ux-role-prestataire.md` | 75% mobile terrain |
| Locataire | `persona-locataire.md` | `ux-role-locataire.md` | Occasionnel, simplicite |
| Admin | - | `ux-role-admin.md` | Interface dense |

### Design System

- **Design Tokens** : `app/globals.css` (couleurs OKLCH, spacing)
- **Composants** : shadcn/ui (50+ composants) - verifier avant de creer
- **Icones** : Lucide React uniquement

**Principe** : "Creer une fois, utiliser partout"
- Verifier shadcn/ui avant de creer
- Etendre avec props/variants au lieu de dupliquer
- JAMAIS hardcoder couleurs ou styles inline

---

## Server Component Authentication Pattern

**Pattern OBLIGATOIRE pour toutes les pages Server Component :**

```typescript
import { getServerAuthContext } from '@/lib/server-context'

export default async function MyPage() {
  // Centralized auth + team fetching (1 line)
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  const data = await someService.getData(team.id)
  return <MyPageClient data={data} />
}
```

**ANTI-PATTERNS a eviter :**
- Auth manuelle avec `createServerSupabaseClient()` + `supabase.auth.getUser()`
- Pas d'authentification du tout (faille de securite)

> Details complets : `systemPatterns.md` section "Server Authentication"

---

## Development Commands (Essentiels)

```bash
# Development
npm run dev              # Dev server
npm run lint             # ESLint validation
npx tsc --noEmit [file]  # Validation TS ciblee

# Database
npm run supabase:types   # Regenerer lib/database.types.ts
npm run supabase:migrate # Nouvelle migration

# Testing
npm test                 # Tous les tests
npx playwright test      # Tests E2E
```

> Liste complete : `techContext.md`

---

## Quick Reference

### Intervention Status Values (9 statuts - mis a jour 2026-01-26)

```typescript
// NOTE: demande_de_devis et en_cours ont ete SUPPRIMES
// Les devis sont geres via requires_quote + intervention_quotes
type InterventionStatus =
  | 'demande' | 'rejetee' | 'approuvee'
  | 'planification' | 'planifiee'
  | 'cloturee_par_prestataire' | 'cloturee_par_locataire'
  | 'cloturee_par_gestionnaire' | 'annulee'
```

### User Roles

- **Admin** : Administration systeme
- **Gestionnaire** : Gestion biens + interventions (70% users)
- **Prestataire** : Execution services + devis (75% mobile)
- **Locataire** : Demandes intervention + suivi

### Database Clients

```typescript
// Browser Client (Client Components)
import { createBrowserSupabaseClient } from '@/lib/services'

// Server Client (Server Components/Actions)
import { createServerSupabaseClient } from '@/lib/services'
```

### Notifications (Server Actions)

```typescript
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

> 16 actions disponibles - voir `systemPatterns.md` section "Notification Architecture"

---

## Features 2026-01 (Reference)

| Feature | Fichiers principaux |
|---------|-------------------|
| Google OAuth | `app/auth/login/login-form.tsx`, `app/auth/callback/page.tsx` |
| Onboarding Modal | `components/auth/onboarding-modal.tsx` |
| Avatar System | `app/api/upload-avatar/route.ts`, `components/profile-page.tsx` |
| Intervention Types | Tables `intervention_type_categories`, `intervention_types` |
| PWA Push | `lib/send-push-notification.ts`, `app/api/push/` |
| Email Reply Sync | `lib/services/domain/email-reply.service.ts` |
| **Email Notification Module** | `lib/services/domain/email-notification/` (15 fichiers refactorisés) |

---

## Development Rules

### Architecture Decisions

1. **Repository Pattern** pour acces donnees (pas d'appels Supabase directs)
2. **Service Layer** pour logique metier
3. **Server Components** par defaut (minimiser 'use client')
4. **Error Boundaries** aux niveaux composant + service

### Code Style

- kebab-case pour fichiers composants (`my-component.tsx`)
- Event handlers prefixes "handle" (`handleClick`)
- Const functions : `const functionName = () => {}`
- Tailwind pour tout styling (pas CSS inline)
- TypeScript strict partout

### File Organization

- **< 500 lignes par fichier** : Separer si plus grand
- **Single responsibility** : Un concern par module
- **Proper exports** : Utiliser index.ts pour imports propres

---

## Troubleshooting Protocol

**En cas d'erreur non-triviale :**

1. **INVOQUER** `sp-systematic-debugging` **IMMEDIATEMENT**
2. Suivre le protocole du skill (4 phases)
3. Consulter `docs/troubleshooting-checklist.md` si recommande

**Quick Reference :**
- File editing fails -> Section 1
- Column not found -> Section 2
- User not authenticated -> Section 3
- Permission denied -> Section 4
- Build errors -> Section 5

---

## Auto-Escalation vers Ultrathink Orchestrator

**Declencheurs automatiques :**

| Condition | Action |
|-----------|--------|
| 3 tentatives echouees sur le meme bug | → Invoquer `ultrathink-orchestrator` |
| Probleme multi-domaines (DB + API + UI) | → Invoquer `ultrathink-orchestrator` |
| Decision architecturale majeure (> 10 fichiers) | → Invoquer `ultrathink-orchestrator` |
| "Je ne comprends pas pourquoi..." apres analyse | → Invoquer `ultrathink-orchestrator` |

**Invocation :**
```
Utiliser Task tool avec subagent_type: ultrathink-orchestrator
Model: opus (capacite de raisonnement maximale)
L'agent orchestre ensuite les agents specialises selon la matrice de delegation
```

**Methodologie Ultrathink (6 phases) :**

| Phase | Nom | Objectif |
|-------|-----|----------|
| 1 | THINK DIFFERENT | Questionner chaque hypothese |
| 2 | OBSESS OVER DETAILS | Lire le code comme une oeuvre d'art |
| 3 | PLAN LIKE DA VINCI | Architecture claire avant execution |
| 4 | CRAFT, DON'T CODE | Artisanat, noms qui chantent |
| 5 | ITERATE RELENTLESSLY | Tests, screenshots, raffinement |
| 6 | SIMPLIFY RUTHLESSLY | Retirer tout le superflu |

> Details complets : `.claude/agents/ultrathink-orchestrator.md`

---

## Skills Auto-Invocation

**Philosophie**: "If a skill exists and 1% chance applies, invoke it."
**Priorite**: Process Skills > Implementation Skills

### Matrice de Declenchement

| Skill | Red Flags | Priorite |
|-------|-----------|----------|
| `sp-brainstorming` | "Je vais creer...", "Nouvelle feature...", "Modifier comportement..." | **CRITIQUE** |
| `sp-systematic-debugging` | "Bug...", "Erreur...", "Test echoue...", "Ca ne marche pas..." | **CRITIQUE** |
| `sp-test-driven-development` | "Je vais implementer...", "Je vais coder..." | **HAUTE** |
| `sp-verification-before-completion` | "C'est fait...", "Pret a commiter...", "Fix applique..." | **CRITIQUE** |
| `sp-writing-plans` | "Tache complexe...", "> 3 fichiers a modifier..." | **HAUTE** |
| `sp-requesting-code-review` | Implementation terminee, avant merge/PR | **HAUTE** |
| `sp-ralph` | "ralph", "nouvelle feature", "let's build", "implement this" | **CRITIQUE** |
| `sp-prd` | "create a prd", "specifier", "plan this feature" (standalone) | **HAUTE** |
| `sp-quality-gate` | "git*", "before commit", "quality check", "review my code" | **CRITIQUE** |
| `sp-compound` | "feature done", "ready to merge", "compound", "retrospective" | **HAUTE** |

### Declencheurs Specifiques SEIDO

| Contexte | Skills a Invoquer |
|----------|-------------------|
| Nouvelle feature a implementer | **`sp-ralph`** (orchestrateur complet, appelle sp-prd si besoin) |
| PRD seul sans implementation | `sp-prd` (standalone) |
| Modification workflow intervention | `sp-brainstorming` + `sp-test-driven-development` |
| Nouvelle migration DB | `sp-verification-before-completion` |
| Bug RLS/permissions | `sp-systematic-debugging` |
| Nouveau composant UI | `sp-brainstorming` |
| Feature multi-domaines | `sp-writing-plans` + `sp-dispatching-parallel-agents` |
| Avant commit / "git*" | `sp-quality-gate` (AVANT le git add/commit) |
| Feature completee / mergee | `sp-compound` (capitaliser les learnings) |

### Patterns d'Orchestration

**Chain: New Feature (via Ralph — recommended)**
```
sp-ralph (orchestrateur complet, zero commit) :
  → appelle sp-prd si besoin (brainstorm + PRD)
  → decompose en stories (prd.json)
  → implemente story par story (TDD)
  → quality gate finale
  → rapport — user fait git* quand valide
  → sp-compound apres commit
```

**Chain: Bug Fix**
```
sp-systematic-debugging → sp-tdd (failing test) → [fix] →
sp-quality-gate → sp-verification-before-completion → sp-compound
```

**Chain: Multi-Domain**
```
sp-ralph (PRD + stories) →
sp-dispatching-parallel-agents → [agents use sp-tdd] →
sp-quality-gate → sp-verification-before-completion → sp-compound
```

---

## Compound Engineering + Ralph Methodology

**SEIDO utilise le cycle Compound Engineering + Ralph pour maximiser qualite et productivite.**

### Le Cycle Complet (via Ralph)

```
/ralph → sp-prd (brainstorm + PRD) → prd.json (stories) →
Implementation story-by-story (TDD) → Quality Gate →
Rapport final (zero commit) → git* quand valide →
/compound → AGENTS.md + progress.txt enrichis
```

### Skills par Phase

| Phase | Skills | Fichiers |
|-------|--------|----------|
| **Spec + Plan** | `sp-ralph` (appelle `sp-prd`) | `tasks/prd-*.md` + `tasks/prd.json` |
| **Work** | `sp-ralph` (TDD interne) | Code + tests |
| **Review** | `sp-ralph` (quality gate interne) | Quality report |
| **Commit** | User tape `git*` → `sp-quality-gate` | Commit + push |
| **Compound** | `sp-compound` | `AGENTS.md` + `tasks/progress.txt` + `docs/learnings/*.md` |

### Declencheurs Supplementaires

| Contexte | Skills a Invoquer |
|----------|-------------------|
| Nouvelle feature a implementer | **`sp-ralph`** (point d'entree unique) |
| PRD seul (sans implementation) | `sp-prd` (standalone) |
| Avant commit / "git*" | `sp-quality-gate` (OBLIGATOIRE) |
| Feature completee | `sp-compound` (OBLIGATOIRE) |
| Toutes stories passes:true | `sp-compound` + `/update-memory` |

### Knowledge Base Files

| Fichier | Purpose | Quand lire |
|---------|---------|------------|
| `AGENTS.md` | Learnings codebase (pitfalls, patterns) | **AVANT implementation** |
| `tasks/progress.txt` | Log learnings feature en cours | Pendant implementation |
| `tasks/prd.json` | User stories + acceptance criteria | Pour choisir prochaine story |

### Distinction progress.txt vs progress.md

| Fichier | Scope | Format | Mis a jour par |
|---------|-------|--------|----------------|
| `.claude/memory-bank/progress.md` | Milestones projet (Phases 1-5+) | Markdown structure | `/update-memory` |
| `tasks/progress.txt` | Log learnings feature EN COURS | Append-only, date/story | `sp-compound` apres chaque story |

---

## Essential References

**Official Docs :**
- [Supabase SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React 19 Features](https://react.dev/blog/2024/12/05/react-19)

**Project Docs :**
- `docs/refacto/database-refactoring-guide.md` - Migration guide
- `docs/refacto/Tests/HELPERS-GUIDE.md` - E2E testing patterns
- `lib/services/README.md` - Services architecture

---

**Last Updated**: 2026-02-04
**Status**: Production Ready
**Current Focus**: Multi-Team Support + Google Maps Integration + Compound Engineering + Ralph Methodology
