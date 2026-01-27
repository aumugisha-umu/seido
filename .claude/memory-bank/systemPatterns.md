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
|                    Domain Services (31)                      |
|  intervention, notification, email, gmail-oauth, etc.       |
+-------------------------------------------------------------+
|                    Repositories (21)                         |
|  intervention, notification, user, building, email-link...  |
+-------------------------------------------------------------+
|                    Supabase (PostgreSQL + RLS)               |
|  38 tables | 77 fonctions | 209 indexes | 47 triggers       |
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

> Source: lib/services/README.md - 21 repositories implementes (incl. email-link)

### 3. Notification Architecture

Flux obligatoire pour les notifications multi-canal :

```
Server Action -> Domain Service -> Repository -> Supabase
                    |                |
             Push Notifications   Email (Resend)
```

**16 Server Actions disponibles** (`app/actions/notification-actions.ts`) :
- `createInterventionNotification`, `notifyInterventionStatusChange`
- `createBuildingNotification`, `notifyBuildingUpdated`, `notifyBuildingDeleted`
- `createLotNotification`, `notifyLotUpdated`, `notifyLotDeleted`
- `createContactNotification`
- `markNotificationAsRead`, `markAllNotificationsAsRead`
- `createCustomNotification`, `notifyDocumentUploaded`
- `notifyContractExpiring`, `checkExpiringContracts`, `createContractNotification`

```typescript
// Exemple d'utilisation
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

> Source: app/actions/notification-actions.ts (1249 lignes)

### 4. Real-time (Single Channel)

Un seul canal WebSocket par utilisateur via RealtimeProvider :

```typescript
// CORRECT - Hooks v2 via RealtimeProvider
import { useRealtimeNotificationsV2 } from '@/hooks/use-realtime-notifications-v2'

// Tables ecoutees: notifications, conversation_messages,
// interventions, intervention_quotes, intervention_time_slots, emails
```

> Source: contexts/realtime-context.tsx

### 5. Intervention Status Flow (Mis a jour 2026-01-26)

```
demande -> approuvee/rejetee -> planification -> planifiee ->
cloturee_par_prestataire -> cloturee_par_locataire -> cloturee_par_gestionnaire
```

**IMPORTANT (2026-01-26):** Le statut `demande_de_devis` a ete SUPPRIME.
Les devis sont maintenant geres independamment via:
- `requires_quote: boolean` dans la table `interventions`
- `intervention_quotes` table avec statuts propres (pending, sent, accepted, rejected)
- `QuoteStatusBadge` composant pour affichage visuel

**Transitions autorisees:**
```typescript
const ALLOWED_TRANSITIONS = {
  'demande': ['approuvee', 'rejetee'],
  'rejetee': [],
  'approuvee': ['planification', 'annulee'],  // demande_de_devis SUPPRIME
  'planification': ['planifiee', 'annulee'],
  'planifiee': ['cloturee_par_prestataire', 'cloturee_par_gestionnaire', 'annulee'],
  'cloturee_par_prestataire': ['cloturee_par_locataire', 'cloturee_par_gestionnaire'],
  'cloturee_par_locataire': ['cloturee_par_gestionnaire'],
  'cloturee_par_gestionnaire': [],
  'annulee': [],
  'contestee': ['cloturee_par_gestionnaire', 'annulee']
}
```

### 6. Entity Creation Pattern

```typescript
// RECOMMENDED - Server Action avec redirect()
export async function createEntityAction(data, options) {
  const result = await service.create(data)
  revalidateTag('entities')
  if (options?.redirectTo) redirect(options.redirectTo)
  return result
}

// Alternative - API Route + toast + router.push (pour FormData/uploads)
```

### 7. Push Notifications (PWA)

Flux de notification push via Service Worker :

```
Server Action -> sendPushToNotificationRecipients()
                    |
lib/send-push-notification.ts (sendPushNotificationToUsers)
                    |
Table push_subscriptions -> web-push library -> Service Worker
```

**Fichiers cles :**
- `lib/push-notification-manager.ts` - Client subscription management
- `lib/send-push-notification.ts` - Server push sending
- `app/api/push/subscribe/route.ts` - API subscription
- `app/api/push/unsubscribe/route.ts` - API unsubscription

**Regle de filtrage :** Push uniquement aux destinataires `is_personal: true` pour eviter notification fatigue.

> Source: app/actions/notification-actions.ts, lib/send-push-notification.ts

### 8. Email Reply Sync

Synchronisation des reponses email vers les conversations :

```
Webhook -> /api/webhooks/resend-inbound
                    |
email-reply.service.ts (parseReplyToAddress, validateHmac)
                    |
email-to-conversation.service.ts (syncEmailReplyToConversation)
                    |
Table conversation_messages (source: 'email')
```

**Format Reply-To :** `reply+int_{intervention_id}_{hmac_hash}@reply.seido-app.com`

> Source: app/api/webhooks/resend-inbound/route.ts, lib/services/domain/email-reply.service.ts

### 9. Magic Links (Auto-Login Email)

Authentification automatique via email CTA :

```
email-notification.service.ts
        |
magic-link.service.ts (generateMagicLinksBatch)
        |
/auth/email-callback?token_hash=xxx&next=/path
        |
supabase.auth.verifyOtp() + redirect(next)
```

**Securite :**
- Tokens cryptographiquement securises (Supabase Auth)
- Protection open-redirect via `validateNextParameter()`
- Fallback URL si generation echoue

> Source: lib/services/domain/magic-link.service.ts, app/auth/email-callback/route.ts

### 10. Intervention Confirmation Flow (Multi-Step Validation)

Pattern pour interventions necessitant confirmation des participants avant planification :

```
+-------------------------------------------------------------+
| CREATION (date fixe + confirmation requise)                 |
| -> intervention.status = 'planification' (NOT 'planifiee')   |
| -> time_slot.status = 'pending' (NOT 'selected')             |
| -> assignments.requires_confirmation = true                  |
| -> assignments.confirmation_status = 'pending'               |
+--------------------------+----------------------------------+
                           | /api/intervention-confirm-participation
                           v
+-------------------------------------------------------------+
| PARTICIPANT CONFIRME                                        |
| -> assignment.confirmation_status = 'confirmed'              |
|                                                             |
| SI TOUS LES PARTICIPANTS CONFIRMES:                         |
|   -> intervention.status = 'planifiee'                       |
|   -> time_slot.status = 'selected'                           |
|   -> time_slot.selected_by_manager = true                    |
+-------------------------------------------------------------+
```

**Fichiers cles :**
- `app/api/create-manager-intervention/route.ts` - Logique CAS 2 avec `!requiresParticipantConfirmation`
- `app/api/intervention-confirm-participation/route.ts` - Verification "tous confirmes"

**Regle critique :** Le statut `planifiee` n'est atteint QUE lorsque tous les participants requis ont confirme.

> Fix 2026-01-25 - Corrige le bug ou l'intervention passait a `planifiee` immediatement

### 11. Module Facade Pattern (Refactoring Large Files)

Pattern utilise pour decouper les gros fichiers (>500 lignes) en modules maintenables avec retrocompatibilite :

```
lib/services/domain/
-- email-notification.service.ts    <- Facade (re-export) - backward compat
-- email-notification.factory.ts    <- Factory (webpack-safe)
+-- email-notification/              <- Module principal
    -- index.ts                     <- Re-exports centralises
    -- types.ts                     <- Interfaces partagees
    -- constants.ts                 <- Configuration
    -- helpers.ts                   <- Utilitaires purs
    -- action-link-generators.ts    <- Generateurs magic links
    -- data-enricher.ts             <- Data fetching consolide
    -- email-sender.ts              <- Batch sending + retry
    -- email-notification.service.ts <- Orchestrateur slim
    +-- builders/                    <- Email builders par type
        -- index.ts
        -- intervention-created.builder.ts
        -- intervention-scheduled.builder.ts
        +-- ...
```

**Principes :**
1. **Facade de compatibilite** : L'ancien chemin d'import reste fonctionnel
2. **Single Responsibility** : Chaque fichier < 500 lignes, un seul concern
3. **Dependency Injection** : Repositories injectes via constructeur
4. **Builder Pattern** : Un builder par type d'email

**Exemple d'import (backward compat):**
```typescript
// Les deux imports fonctionnent identiquement
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailNotificationService } from '@/lib/services/domain/email-notification'
```

> Source: lib/services/domain/email-notification/ (15 fichiers, ~2,600 lignes total)

### 12. Quote Management Pattern (NOUVEAU 2026-01-26)

Les devis sont geres separement du workflow intervention principal :

```
+-------------------------------------------------------------+
| INTERVENTION avec devis                                      |
| -> intervention.requires_quote = true                        |
| -> intervention.status = 'planification' (workflow normal)   |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| TABLE intervention_quotes                                    |
| -> status: 'pending' | 'sent' | 'accepted' | 'rejected'     |
| -> Cycle de vie independant du statut intervention          |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| AFFICHAGE                                                    |
| -> QuoteStatusBadge (composant visuel separe)               |
| -> Ne bloque PAS le workflow intervention                    |
+-------------------------------------------------------------+
```

**Fichiers cles :**
- `lib/utils/quote-status.ts` - Utilitaires statut devis
- `components/interventions/quote-status-badge.tsx` - Badge visuel
- `hooks/use-intervention-workflow.ts` - Methode `requestQuote()` mise a jour

**Avantage :** Separation des concerns - le statut devis n'impacte pas le workflow intervention.

### 13. Client-Side Pagination Pattern (NOUVEAU 2026-01-26)

Pattern pour paginer des listes deja chargees en memoire :

```typescript
// hooks/use-pagination.ts
import { usePagination } from '@/hooks/use-pagination'

const {
  paginatedItems,    // Items de la page courante
  currentPage,       // Page actuelle (1-indexed)
  totalPages,        // Nombre total de pages
  goToPage,          // Navigation vers page specifique
  resetToFirstPage,  // Reset (memoize pour useEffect)
  hasNextPage,       // Boolean navigation
  hasPreviousPage,   // Boolean navigation
  startIndex,        // Index debut (pour "1-10 sur 89")
  endIndex           // Index fin
} = usePagination({
  items: filteredData,  // Donnees source (post-filtrage)
  pageSize: 10          // Elements par page
})

// IMPORTANT: Reset sur changement de filtres
useEffect(() => {
  resetToFirstPage()
}, [searchQuery, filters, sortBy, resetToFirstPage])
```

**Quand utiliser :**
- Donnees deja chargees (Server Component → props)
- Dataset < 1000 items
- Navigation instantanee attendue
- Filtrage/tri cote client

**Fichiers de reference :**
- `hooks/use-pagination.ts` - Hook reutilisable
- `components/interventions/intervention-pagination.tsx` - UI francais

### 14. Interventions Display Cascade Architecture (NOUVEAU 2026-01-27)

Architecture unifiee pour afficher les interventions de maniere coherente dans toute l'application :

```
+-------------------------------------------------------------+
| PAGES DE DETAILS (Immeubles, Lots, Contrats, Contacts)      |
|                                                             |
| import { InterventionsNavigator }                            |
| from '@/components/interventions/interventions-navigator'    |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| InterventionsNavigator (interventions-navigator.tsx)         |
| - Gere tabs (Toutes, En cours, Terminees, etc.)             |
| - Filtrage/tri/recherche                                     |
| - ViewModeSwitcher (cards, list, calendar)                   |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| InterventionsViewContainer (interventions-view-container.tsx)|
| - Orchestrateur de vues (cards, list, calendar)              |
| - Gere pagination pour vue list                              |
| - State management view mode                                  |
+-------------------------------------------------------------+
                           |
                           v (viewMode === 'cards')
+-------------------------------------------------------------+
| InterventionsList (interventions-list.tsx)                   |
| - Rendu grid/horizontal des cards                             |
| - Empty state handling                                        |
| - Loading skeletons                                           |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| PendingActionsCard (pending-actions-card.tsx)                |
| - Card intervention UNIFIEE pour tous les roles              |
| - Badges statut + urgence                                     |
| - Boutons d'action contextuels                               |
| - Message "En attente de X reponse(s)"                       |
+-------------------------------------------------------------+
```

**Avantage principal:** La modification d'un composant (ex: `InterventionsList` ou `PendingActionsCard`) cascade automatiquement vers TOUTES les pages de details.

**Pages utilisant cette architecture:**
| Page | Fichier |
|------|---------|
| Immeubles | `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx` |
| Lots | `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx` |
| Contrats | `app/gestionnaire/(no-navbar)/contrats/[id]/contract-details-client.tsx` |
| Contacts | `components/contact-details/contact-interventions-tab.tsx` |

**Regle:** Toujours utiliser `InterventionsNavigator` pour afficher des interventions - NE JAMAIS creer de composant custom par page.

> Verifie 2026-01-27: Toutes les pages de details utilisent correctement cette architecture.

### 15. Skills Auto-Invocation Pattern (NOUVEAU 2026-01-27)

Pattern d'orchestration des skills `superpowers:sp-*` base sur des "Red Flags" (pensees declencheuses) :

```
+-------------------------------------------------------------+
| RED FLAG DETECTION                                          |
| "Je vais creer...", "Bug...", "Je vais implementer..."     |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| SKILL AUTO-INVOCATION                                       |
| sp-brainstorming, sp-systematic-debugging, sp-tdd, etc.    |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| IMPLEMENTATION                                              |
| Code ecrit selon les recommandations du skill              |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| VERIFICATION OBLIGATOIRE                                    |
| sp-verification-before-completion AVANT commit             |
+-------------------------------------------------------------+
```

**Matrice de declenchement :**

| Red Flag | Skill a Invoquer | Priorite |
|----------|------------------|----------|
| "Je vais creer/ajouter/modifier..." | `sp-brainstorming` | CRITIQUE |
| "Bug/Erreur/Test echoue..." | `sp-systematic-debugging` | CRITIQUE |
| "Je vais implementer/coder..." | `sp-test-driven-development` | HAUTE |
| "C'est fait/Pret a commiter..." | `sp-verification-before-completion` | CRITIQUE |
| "Tache complexe/> 3 fichiers..." | `sp-writing-plans` | HAUTE |

**Chains d'orchestration :**

1. **Creative Work**: brainstorming → writing-plans → TDD → impl → verification → code-review
2. **Bug Fix**: systematic-debugging → TDD (failing test) → fix → verification
3. **Multi-Domain**: brainstorming → writing-plans → dispatching-parallel-agents → verification

**Fichiers de reference :**
- `.claude/CLAUDE.md` - Section "Skills Auto-Invocation"
- `.claude/agents/_base-template.md` - Red Flags universels (herite par tous)
- `.claude/agents/ultrathink-orchestrator.md` - Section H

**Regle critique :** Process Skills (brainstorming/debugging) AVANT Implementation Skills (TDD/coding).

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
| Utiliser statut demande_de_devis | requires_quote + intervention_quotes |
| Creer composant card intervention custom | Utiliser InterventionsNavigator |
| Coder sans invoquer skill brainstorming | Invoquer sp-brainstorming AVANT |
| Fixer bug sans diagnostic systematique | Invoquer sp-systematic-debugging |
| Commiter sans verification | Invoquer sp-verification-before-completion |

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
components/          # 369 composants
hooks/               # 58 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase, base repository, error handler
  repositories/      # 21 repositories (acces donnees)
  domain/            # 31 services (logique metier)
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
*Derniere mise a jour: 2026-01-27*
*References: lib/services/README.md, lib/server-context.ts, .claude/CLAUDE.md*
