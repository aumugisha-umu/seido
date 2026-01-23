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

### Intervention Status Values

```typescript
type InterventionStatus =
  | 'demande' | 'rejetee' | 'approuvee' | 'demande_de_devis'
  | 'planification' | 'planifiee' | 'en_cours'
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

**En cas d'erreur non-triviale apres 2-3 tentatives :**

1. Consulter `docs/troubleshooting-checklist.md`
2. Trouver la section pertinente (DB, Auth, RLS, Build...)
3. Suivre la checklist de diagnostic
4. Appliquer la solution documentee

**Quick Reference :**
- File editing fails -> Section 1
- Column not found -> Section 2
- User not authenticated -> Section 3
- Permission denied -> Section 4
- Build errors -> Section 5

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

**Last Updated**: 2026-01-23
**Status**: Production Ready
**Current Focus**: User Experience (Google OAuth, Onboarding, Avatars, Notifications)
