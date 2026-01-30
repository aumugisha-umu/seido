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
|                    Repositories (22)                         |
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

### 14b. Intervention Preview Tab Structure (NOUVEAU 2026-01-29)

Structure des onglets dans la vue de detail/preview d'une intervention :

```
+-------------------------------------------------------------+
| InterventionTabs (intervention-tabs.tsx)                     |
| - Configuration par role via getTabsConfig(role)             |
| - Grid responsive (grid-cols-3 a grid-cols-6 selon tabs)     |
+-------------------------------------------------------------+
                           |
    +----------------------+----------------------+
    v                      v                      v
+----------+    +---------------+    +------------------+
| Gestionnaire |  | Prestataire |    | Locataire        |
| 6 onglets    |  | 4 onglets   |    | 4 onglets        |
+----------+    +---------------+    +------------------+
```

**Onglets par role:**

| Role | Onglets |
|------|---------|
| **Gestionnaire** | General \| Localisation \| Conversations \| Planning et Estimations \| Contacts \| Emails |
| **Prestataire** | General \| Localisation \| Conversations \| Planification |
| **Locataire** | General \| Localisation \| Conversations \| Rendez-vous |

**Composants partagés:**

| Composant | Chemin | Description |
|-----------|--------|-------------|
| `InterventionTabs` | `shared/layout/intervention-tabs.tsx` | Config tabs + navigation |
| `LocalisationTab` | `shared/tabs/localisation-tab.tsx` | Carte Google Maps 400px |
| `InterventionDetailsCard` | `shared/cards/intervention-details-card.tsx` | Description + localisation texte |
| `PlanningCard` | `shared/cards/planning-card.tsx` | Time slots |
| `QuotesCard` | `shared/cards/quotes-card.tsx` | Devis/estimations |

**Regle:** L'onglet "Localisation" contient la carte Google Maps en grand format. L'onglet "General" conserve uniquement le texte compact "Immeuble > Lot • Adresse".

### 14c. Entity Preview Layout Architecture (NOUVEAU 2026-01-30)

Architecture unifiee pour les pages de preview d'entites (Building, Lot, Contract, Contact) :

```
+-------------------------------------------------------------+
| COMPOSANTS PARTAGES (@/components/shared/entity-preview)     |
+-------------------------------------------------------------+
                           |
    +----------------------+----------------------+
    |                      |                      |
    v                      v                      v
+----------------+  +-------------+  +------------------+
| EntityPreview  |  | EntityTabs  |  | EntityActivityLog|
| Layout         |  | (MD3 style) |  | (timeline)       |
+----------------+  +-------------+  +------------------+
        |                  |
        |                  v
        |         +------------------+
        |         | TabContentWrapper|
        |         +------------------+
        v
+-------------------------------------------------------------+
| PAGES DE DETAIL UTILISANT L'ARCHITECTURE                     |
+-------------------------------------------------------------+
| Building  | building-details-client.tsx                      |
| Lot       | lot-details-client.tsx                           |
| Contract  | contract-details-client.tsx                      |
| Contact   | contact-details-client.tsx                       |
+-------------------------------------------------------------+
```

**Fichiers du module :**

| Fichier | Description |
|---------|-------------|
| `index.ts` | Barrel exports |
| `types.ts` | TabConfig, EntityType, ActivityLogEntry |
| `entity-tabs.tsx` | Tabs responsifs MD3 (dropdown mobile, horizontal desktop) |
| `entity-preview-layout.tsx` | Layout wrapper + TabPanelWrapper |
| `entity-activity-log.tsx` | Timeline des activity logs hierarchiques |

**Import standardise :**
```typescript
import {
  EntityPreviewLayout,
  EntityTabs,
  TabContentWrapper,
  EntityActivityLog
} from '@/components/shared/entity-preview'
import type { TabConfig } from '@/components/shared/entity-preview'
```

**Configuration des tabs :**
```typescript
const tabs: TabConfig[] = [
  { value: 'overview', label: 'Aperçu' },
  { value: 'contracts', label: 'Contrats', count: contractsCount },
  { value: 'interventions', label: 'Interventions', count: interventionsCount },
  { value: 'activity', label: 'Activité' }
]

<EntityTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs}>
  <TabContentWrapper value="overview">
    {/* Contenu aperçu */}
  </TabContentWrapper>
  <TabContentWrapper value="activity">
    <EntityActivityLog
      teamId={teamId}
      entityType="building"
      entityId={buildingId}
      includeRelated={true}
    />
  </TabContentWrapper>
</EntityTabs>
```

**Hierarchical Activity Logs (RPC Function) :**
```sql
-- Fonction get_entity_activity_logs dans Supabase
-- Retourne les logs de l'entite ET de ses entites liees :
-- Building: logs building + lots + contracts + interventions
-- Lot: logs lot + contracts + interventions
-- Contract: logs contract uniquement
-- Contact: logs contact + interventions assignees
```

**Classes CSS BEM :**
```css
.entity-preview          /* Container principal */
.entity-preview__tabs    /* Zone des onglets */
.entity-preview__content /* Zone du contenu */
.entity-preview__tab-panel /* Panel d'onglet individuel */
```

**UNIFICATION (2026-01-30) :**
`InterventionTabs` a ete supprime et unifie avec `EntityTabs`.

Pour les interventions, utiliser `getInterventionTabsConfig(role)` :
```typescript
import { EntityTabs, getInterventionTabsConfig } from '@/components/shared/entity-preview'

const interventionTabs = useMemo(() => getInterventionTabsConfig('manager'), [])
// ou 'provider', 'tenant'

<EntityTabs tabs={interventionTabs} activeTab={activeTab} onTabChange={setActiveTab}>
  {/* TabsContent */}
</EntityTabs>
```

**Regle :** Utiliser `EntityTabs` + `getInterventionTabsConfig()` pour TOUTES les entites (Building, Lot, Contract, Contact, Intervention).

### 15. Conversation Thread Creation Pattern (NOUVEAU 2026-01-29)

Pattern critique pour creer les threads de conversation lors de la creation d'intervention :

```
+-------------------------------------------------------------+
| ORDRE CRITIQUE DE CREATION                                   |
| (L'ordre est important car les triggers dependent des donnees)|
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| STEP 1: Create Intervention                                  |
| INSERT INTO interventions (...)                              |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| STEP 2: Create Conversation Threads (Service Role)           |
| ✅ AVANT les assignments!                                     |
|                                                             |
| → INSERT conversation_threads (thread_type = 'group')        |
|   → TRIGGER thread_add_managers FIRES                        |
|   → All team managers added to participants                  |
|                                                             |
| → INSERT conversation_threads (thread_type = 'tenant_to_...')|
|   → TRIGGER fires, managers added                            |
|                                                             |
| → INSERT conversation_threads (thread_type = 'provider_to...')|
|   → TRIGGER fires, managers added                            |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| STEP 3: Create Assignments                                   |
| INSERT INTO intervention_assignments (role = 'locataire')    |
|   → TRIGGER add_assignment_to_conversation_participants      |
|   → Tenant added to 'group' + 'tenant_to_managers' threads   |
|                                                             |
| INSERT INTO intervention_assignments (role = 'prestataire')  |
|   → TRIGGER fires, provider added to threads                 |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| STEP 4: Create Time Slots (Service Role)                     |
| INSERT INTO intervention_time_slots (...)                    |
+-------------------------------------------------------------+
```

**Fichiers cles :**
- `app/api/create-manager-intervention/route.ts` - Implementation de l'ordre
- `lib/services/repositories/conversation-repository.ts` - Upsert avec ignoreDuplicates
- `supabase/migrations/20260129200005_add_managers_to_conversation_participants.sql` - Triggers

**Regle critique :** Les threads DOIVENT etre crees AVANT les assignments, sinon le trigger `add_assignment_to_conversation_participants` ne trouve pas les threads et ne peut pas ajouter les participants.

**Pattern upsert pour eviter CONFLICT :**
```typescript
// Dans conversation-repository.ts
const { error } = await this.supabase
  .from('conversation_participants')
  .upsert({
    thread_id: thread.id,
    user_id: input.created_by
  }, {
    onConflict: 'thread_id,user_id',
    ignoreDuplicates: true
  })
```

> Fix 2026-01-29 - Corrige le bug ou les participants n'etaient pas ajoutes aux threads

---

### 16. Skills Auto-Invocation Pattern (NOUVEAU 2026-01-27)

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
| Creer threads apres assignments | Creer threads AVANT assignments |
| Insert participant sans ON CONFLICT | Upsert avec ignoreDuplicates |
| Relations PostgREST nested avec RLS | Requetes separees + helpers prives |
| Utiliser InterventionTabs (supprime) | EntityTabs + getInterventionTabsConfig() |

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
  - 113 API routes (10 domaines)
components/          # 230+ composants (22 directories)
hooks/               # 64 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase (4 types), base repository, error handler
  repositories/      # 22 repositories (acces donnees)
  domain/            # 32 services (logique metier)
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

### 17. Centralized Address Pattern (NOUVEAU 2026-01-29)

Pattern pour la gestion centralisee des adresses avec support Google Maps :

```
+-------------------------------------------------------------+
| TABLE addresses (centralisee)                                |
| - street, postal_code, city, country                         |
| - latitude, longitude, place_id, formatted_address (Google)  |
| - team_id (multi-tenant)                                     |
+-------------------------------------------------------------+
              ^                ^                ^
              |                |                |
+-------------+    +-----------+    +-----------+
| buildings   |    | lots      |    | companies |
| address_id ─┘    | address_id┘    | address_id┘
+-------------+    +-----------+    +-----------+
```

**Migration des donnees :**
1. `20260129200000_create_addresses_table.sql` - Creation table + RLS
2. `20260129200001_migrate_addresses_to_centralized_table.sql` - Migration donnees existantes
3. `20260129200002_drop_legacy_address_columns.sql` - Suppression anciennes colonnes

**Services :**
- `lib/services/domain/address.service.ts` - Service domain
- `lib/services/repositories/address.repository.ts` - Repository CRUD

**Avantages :**
- Single source of truth pour les adresses
- Support Google Maps natif (geocoding, place_id)
- Evite duplication des champs adresse dans chaque table
- RLS par team_id

### 18. Separate Queries Pattern for RLS Compatibility (NOUVEAU 2026-01-29)

Pattern pour eviter les echecs silencieux des relations PostgREST avec RLS :

```
+-------------------------------------------------------------+
| PROBLEME: Relations PostgREST + RLS                          |
|                                                             |
| .select(`*, company:company_id(id, name, address:address_id(*))`)|
|                                                             |
| → Si RLS sur 'companies' ou 'addresses' bloque l'acces,      |
| → La requete echoue SILENCIEUSEMENT (pas d'erreur visible)   |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| SOLUTION: Requetes Separees avec Helpers                     |
|                                                             |
| // Helpers prives dans le repository                         |
| private async fetchCompanyWithAddress(companyId: string) {   |
|   const company = await supabase.from('companies')...        |
|   if (company.address_id) {                                  |
|     const address = await supabase.from('addresses')...      |
|     return { ...company, address_record: address }           |
|   }                                                         |
|   return { ...company, address_record: null }               |
| }                                                           |
|                                                             |
| private async fetchTeam(teamId: string) {                    |
|   return await supabase.from('teams')...                     |
| }                                                           |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| UTILISATION: Promise.all pour parallelisme                   |
|                                                             |
| const [company, team] = await Promise.all([                  |
|   data.company_id ? this.fetchCompanyWithAddress(...) : null,|
|   data.team_id ? this.fetchTeam(...) : null                  |
| ])                                                          |
| return { ...data, company, team }                            |
+-------------------------------------------------------------+
```

**Optimisation pour les listes (Batch Queries) :**
```typescript
// Au lieu de N requetes (1 par user), faire 3 requetes max:
// 1. Fetch all users
const users = await supabase.from('users').select('*').in('team_id', teamId)

// 2. Batch fetch companies
const companyIds = [...new Set(users.filter(u => u.company_id).map(u => u.company_id))]
const companies = await supabase.from('companies').select('*').in('id', companyIds)

// 3. Batch fetch addresses
const addressIds = [...new Set(companies.filter(c => c.address_id).map(c => c.address_id))]
const addresses = await supabase.from('addresses').select('*').in('id', addressIds)

// 4. Map results
const companiesMap = Object.fromEntries(companies.map(c => [c.id, { ...c, address_record: ... }]))
const enrichedUsers = users.map(u => ({ ...u, company: companiesMap[u.company_id] }))
```

**Fichier de reference :** `lib/services/repositories/contact.repository.ts`

**Quand utiliser :**
- Queries avec relations nested (ex: `company:company_id(address:address_id(*))`)
- Tables avec RLS strictes
- Erreurs Supabase silencieuses/vides

**Avantages :**
- Erreurs explicites pour chaque requete
- Compatible avec toute configuration RLS
- Performance optimisee avec batch pour les listes

---
*Derniere mise a jour: 2026-01-29 18:00*
*Analyse approfondie: Architecture verifiee, metriques synchronisees*
*References: lib/services/README.md, lib/server-context.ts, .claude/CLAUDE.md*
