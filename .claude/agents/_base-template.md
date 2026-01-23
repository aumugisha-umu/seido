# Agent Base Template — SEIDO

> **Note**: Ce template contient le contexte commun a tous les agents SEIDO.
> Chaque agent herite de ce template et ajoute uniquement son expertise specifique.

## Memory Bank Context

**Avant de commencer, TOUJOURS consulter :**

| Fichier | Usage | Priorite |
|---------|-------|----------|
| `.claude/memory-bank/activeContext.md` | Focus session actuelle | **TOUJOURS** |
| `.claude/memory-bank/systemPatterns.md` | Architecture et patterns | Avant code |
| `.claude/memory-bank/techContext.md` | Stack, DB, RLS, commandes | Avant DB |
| `.claude/memory-bank/productContext.md` | Frustrations personas | Avant UX |
| `.claude/PROJECT_INDEX.json` | Carte structurelle | Navigation |

**Apres modifications significatives :**
- Les hooks mettent a jour automatiquement `activeContext.md`
- Pour sync complete : executer `/sync-memory`

## Metriques SEIDO (2026-01-23)

| Categorie | Count |
|-----------|-------|
| Composants | 369 |
| Hooks | 58 |
| Repositories | 21 |
| Domain Services | 31 |
| API Routes | 113 |
| Server Actions | 16 |
| Tables DB | 39 |
| RLS Functions | 10 |
| Migrations | 131+ |

**4 Roles Utilisateur** : Admin, Gestionnaire (70%), Prestataire (75% mobile), Locataire

## Official Documentation First

**Before implementing, check:**
- [Next.js 15 docs](https://nextjs.org/docs) - App Router, Server Components
- [React 19 docs](https://react.dev) - Hooks, patterns
- [Supabase docs](https://supabase.com/docs) - DB, Auth, RLS
- [shadcn/ui docs](https://ui.shadcn.com) - Components

## Architecture Patterns (Reference)

> Details complets : `systemPatterns.md`

### Patterns Obligatoires

```typescript
// Server Auth (TOUTES les pages Server Component)
const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

// Repository Pattern (JAMAIS d'appels Supabase directs)
const repository = new InterventionRepository(supabase)

// Notifications (Server Actions)
await createInterventionNotification(interventionId)

// Real-time (v2 hooks via RealtimeProvider)
useRealtimeNotificationsV2({ onInsert: (n) => {} })
```

### Anti-Patterns (NE JAMAIS FAIRE)

| Anti-Pattern | Alternative |
|--------------|-------------|
| Appels Supabase directs | Repository Pattern |
| Auth manuelle | `getServerAuthContext()` |
| Client Components par defaut | Server Components first |
| Channels realtime multiples | RealtimeProvider unique |
| `npm run build` automatique | `npx tsc --noEmit [file]` |

## Intervention Status Flow

```
demande → approuvee/rejetee → demande_de_devis → planification →
planifiee → en_cours → cloturee_par_prestataire →
cloturee_par_locataire → cloturee_par_gestionnaire | annulee
```

## Conventions

| Element | Convention | Exemple |
|---------|------------|---------|
| Components | kebab-case | `intervention-card.tsx` |
| Hooks | camelCase + use | `useAuth.ts` |
| Services | kebab-case + .service | `notification.service.ts` |
| Repositories | kebab-case + .repository | `user.repository.ts` |
| Server Actions | kebab-case + -actions | `notification-actions.ts` |

## Fichiers Cles

| Usage | Chemin |
|-------|--------|
| Types DB | `lib/database.types.ts` |
| Auth server | `lib/server-context.ts` |
| Services index | `lib/services/index.ts` |
| CSS tokens | `app/globals.css` |
| Notification actions | `app/actions/notification-actions.ts` |

---

*Derniere mise a jour: 2026-01-23*
