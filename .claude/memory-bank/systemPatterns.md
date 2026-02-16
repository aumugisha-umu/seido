# SEIDO System Patterns & Architecture

## Architecture Globale

```
+-------------------------------------------------------------+
|                     Next.js 15 App Router                    |
+-------------------------------------------------------------+
|  Server Components (default)  |  Client Components (minimal) |
|  - Page data loading          |  - Interactive forms         |
|  - Auth via getServerAuth()   |  - Real-time updates         |
+-------------------------------------------------------------+
|                    Domain Services (33)                      |
|  intervention, notification, email, scheduling, etc.        |
+-------------------------------------------------------------+
|                    Repositories (19)                         |
|  intervention, notification, user, building, address, etc.  |
+-------------------------------------------------------------+
|                    Supabase (PostgreSQL + RLS)               |
|  44 tables | 79 fonctions | 209 indexes | 47 triggers       |
+-------------------------------------------------------------+
```

## Patterns Critiques a Respecter

### 1. Server Authentication (OBLIGATOIRE)

Toutes les pages Server Components DOIVENT utiliser `getServerAuthContext()` :

```typescript
// CORRECT - Pattern centralise
import { getServerAuthContext } from '@/lib/server-context'

export default async function Page() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  // team.id est TOUJOURS disponible ici
}

// INTERDIT - Auth manuelle
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
// ... 10+ lignes de code duplique
```

> Source: lib/server-context.ts - 21 pages migrees vers ce pattern

### 2. Repository Pattern (OBLIGATOIRE)

JAMAIS d'appels Supabase directs dans les composants ou services :

```typescript
// CORRECT - Via Repository
const repository = new InterventionRepository(supabase)
const interventions = await repository.findAll()

// INTERDIT - Appel direct Supabase
const { data } = await supabase.from('interventions').select('*')
```

> Source: lib/services/README.md - 19 repositories implementes (incl. email-link)

### 3. Notification Architecture

Flux obligatoire pour les notifications multi-canal :

```
Server Action -> Domain Service -> Repository -> Supabase
                    |                |
             Push Notifications   Email (Resend)
```

**20 Server Actions disponibles** (`app/actions/notification-actions.ts`) :
- `createInterventionNotification`, `notifyInterventionStatusChange`
- `createBuildingNotification`, `notifyBuildingUpdated`, `notifyBuildingDeleted`
- `createLotNotification`, `notifyLotUpdated`, `notifyLotDeleted`
- `createContactNotification`
- `markNotificationAsRead`, `markAllNotificationsAsRead`
- `createCustomNotification`, `notifyDocumentUploaded`
- `notifyContractExpiring`, `checkExpiringContracts`, `createContractNotification`
- **NEW (2026-02-02)** `notifyQuoteRequested`, `notifyQuoteApproved`, `notifyQuoteRejected`, `notifyQuoteSubmittedWithPush`

```typescript
// Exemple d'utilisation
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

> Source: app/actions/notification-actions.ts (1249 lignes)

### 30. Shared Cards Pattern for Consistent UI (NOUVEAU 2026-02-12)

Pattern pour afficher les informations d'intervention de manière cohérente entre les 3 rôles :

```
+-------------------------------------------------------------+
| SHARED CARDS ARCHITECTURE                                    |
|                                                             |
| components/interventions/shared/cards/                       |
|   - intervention-details-card.tsx  (détails + localisation)  |
|   - summary-card.tsx               (statut + priorité + dates)|
|   - documents-card.tsx             (documents + signed URLs)  |
|   - reports-card.tsx               (rapports de clôture)     |
|   - comments-card.tsx              (commentaires)            |
|   - conversation-card.tsx          (conversations)           |
|   - quotes-card.tsx                (devis)                   |
|   - planning-card.tsx              (créneaux)                |
+-------------------------------------------------------------+
                           |
                           v (utilisés par les 3 rôles)
+-------------------------------------------------------------+
| DETAIL PAGES                                                 |
|   - gestionnaire/interventions/[id]/components/              |
|     intervention-detail-client.tsx                           |
|   - prestataire/interventions/[id]/components/               |
|     intervention-detail-client.tsx                           |
|   - locataire/interventions/[id]/components/                 |
|     intervention-detail-client.tsx                           |
+-------------------------------------------------------------+
```

**Pattern ReportsCard (NOUVEAU 2026-02-12):**

```typescript
// Composant shared qui affiche les 3 rapports de clôture
import { ReportsCard } from '@/components/interventions/shared/cards'

<ReportsCard
  interventionId={intervention.id}
  reports={intervention.intervention_reports}
  userRole={role}
/>

// Le composant gère automatiquement:
// 1. Affichage conditionnel selon le rôle (gestionnaire voit tout)
// 2. Labels adaptés par rôle (provider_report, tenant_report, manager_report)
// 3. Empty state si aucun rapport
```

**Regle critique:** Toujours utiliser les composants shared cards au lieu de dupliquer la logique d'affichage.

**Fichiers de reference:**
- `components/interventions/shared/cards/reports-card.tsx` (165 lignes)
- `components/interventions/shared/cards/documents-card.tsx` (signed URLs)
- `components/interventions/shared/cards/summary-card.tsx`
- `components/interventions/shared/cards/intervention-details-card.tsx`

---

## Anti-Patterns (NE JAMAIS FAIRE)

| Anti-Pattern | Alternative |
|--------------|-------------|
| Appels Supabase directs | Passer par Repository |
| Client Components par defaut | Server Components par defaut |
| Auth manuelle | `getServerAuthContext()` |
| Channels realtime multiples | RealtimeProvider unique |
| `npm run build` automatique | Demander a l'utilisateur |
| Singleton notification legacy | Server Actions |
| Utiliser statut demande_de_devis | requires_quote flag + intervention_quotes table |
| Quote status `approved` dans le code | `accepted` (DB enum: draft, pending, sent, accepted, rejected, expired, cancelled) |
| Quote actions dans un `case` status spécifique | Post-switch block basé sur `requires_quote` flag |
| Creer composant card intervention custom | Utiliser InterventionsNavigator |
| Coder sans invoquer skill brainstorming | Invoquer sp-brainstorming AVANT |
| Fixer bug sans diagnostic systematique | Invoquer sp-systematic-debugging |
| Commiter sans verification | Invoquer sp-verification-before-completion |
| Creer threads apres assignments | Creer threads AVANT assignments |
| Insert participant sans ON CONFLICT | Upsert avec ignoreDuplicates |
| Filtrer `.is('deleted_at', null)` sans vérifier la table | Vérifier `database.types.ts` — certaines tables n'ont PAS deleted_at |
| Relations PostgREST nested avec RLS | Requetes separees + helpers prives |
| Utiliser InterventionTabs (supprime) | EntityTabs + getInterventionTabsConfig() |
| Server Action avec `getAuthenticatedUser()` local | `getServerActionAuthContextOrNull()` |
| Hook client avec session check defensif | `useAuth()` + `createBrowserSupabaseClient()` |
| `.single()` sur profiles multi-equipes | `.limit(1)` + `data?.[0]` |
| Hook sans `authLoading` dans dépendances | Extraire `loading` de `useAuth()` + ajouter aux deps |
| Upsert sans check `data` null | Verifier `!data` pour RLS silent blocks |
| Utiliser `userId` du client dans upsert | Utiliser `userProfile.id` du contexte auth serveur |
| Push notification avec URL fixe gestionnaire | `sendRoleAwarePushNotifications()` avec URL par role |
| JSON.stringify avec File objects | Utiliser FormData pour upload fichiers |
| Dupliquer logique affichage rapports | Utiliser ReportsCard shared component |

## Conventions de Nommage

| Element | Convention | Exemple |
|---------|------------|---------|
| Components | kebab-case | `intervention-card.tsx` |
| Hooks | camelCase + use | `useAuth.ts` |
| Services | kebab-case + .service | `notification.service.ts` |
| Repositories | kebab-case + .repository | `user.repository.ts` |
| API Routes | kebab-case | `/api/intervention-quotes` |
| Server Actions | kebab-case + -actions | `notification-actions.ts` |

## Structure des Dossiers

```
app/[role]/          # Routes par role (admin, gestionnaire, prestataire, locataire)
  - 87 pages (5+ route groups)
  - 114 API routes (10 domaines)
components/          # 362 composants (22 directories)
hooks/               # 68 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase (4 types), base repository, error handler
  repositories/      # 19 repositories (acces donnees)
  domain/            # 33 services (logique metier)
app/actions/         # 17 server action files
contexts/            # 3 React contexts (auth, team, realtime)
tests/               # Infrastructure E2E
```

## Services Email (Nouveaux 2026-01)

**Services ajoutes pour Gmail OAuth et conversation threading :**
- `gmail-oauth.service.ts` - Authentification Gmail OAuth
- `email-notification.factory.ts` - Factory pour emails transactionnels
- `email-reply.service.ts` - Traitement des reponses email
- `email-to-conversation.service.ts` - Sync emails -> conversations
- `email-link.repository.ts` - Tracking liens emails

---
*Derniere mise a jour: 2026-02-12*
*Analyse approfondie: 362 composants, 68 hooks, 33 services, 19 repositories*
*Total patterns: 30 (+1: Shared Cards Pattern)*
*References: lib/services/README.md, lib/server-context.ts, .claude/CLAUDE.md*
