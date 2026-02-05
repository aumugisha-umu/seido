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
| InterventionCard (intervention-card.tsx)                     |
| - Card intervention UNIFIEE pour tous les roles              |
| - Badges statut + urgence                                     |
| - Boutons d'action contextuels (via getRoleBasedActions)     |
| - Message "En attente de X reponse(s)"                       |
| - Hauteur auto (pas de h-full) - CSS Grid align par rangée   |
+-------------------------------------------------------------+
```

**Avantage principal:** La modification d'un composant (ex: `InterventionsList` ou `InterventionCard`) cascade automatiquement vers TOUTES les pages de details.

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

**UnifiedModal z-index Pattern (FIX 2026-01-30) :**

Les modales Radix avec CSS custom DOIVENT avoir des z-index explicites sur overlay ET content :
```css
/* globals.css - OBLIGATOIRE */
.unified-modal__overlay { @apply fixed inset-0 z-[9998] ... }
.unified-modal__content { @apply fixed z-[9999] ... }
```

**Pourquoi :** Sans z-index explicite, le content peut se rendre DERRIÈRE l'overlay (bug invisible car le DOM est correct mais l'affichage est caché).

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

### 24. RLS Silent Block Detection Pattern (NOUVEAU 2026-02-02)

Pattern critique pour detecter les inserts bloques silencieusement par RLS avec Supabase anon key :

```typescript
// ⚠️ PROBLEME: Supabase avec anon key + cookies peut bloquer
// silencieusement via RLS sans lever d'erreur

// ❌ INCORRECT - Ne verifie que error
const { data, error } = await supabase
  .from('push_subscriptions')
  .upsert({ user_id: userId, ... })
  .select()
  .single()

if (error) {
  return NextResponse.json({ error: 'Failed' }, { status: 500 })
}
// data peut etre null si RLS a bloque!

// ✅ CORRECT - Verifie error ET data null
const { data, error } = await supabase
  .from('push_subscriptions')
  .upsert({ user_id: userProfile.id, ... })  // ← Utiliser ID authentifie serveur
  .select()
  .single()

if (error) {
  logger.error({ error }, 'Database error')
  return NextResponse.json({ error: 'Failed' }, { status: 500 })
}

// ✅ Verifier RLS silent block
if (!data) {
  logger.error('Insert blocked by RLS or constraint')
  return NextResponse.json({ error: 'Permission denied' }, { status: 500 })
}
```

**Pourquoi ca arrive :**
1. Le client Supabase utilise anon key + cookies (pas service role)
2. Les RLS policies verifient `user_id IN (SELECT get_my_profile_ids())`
3. Si la condition echoue, l'insert est silencieusement ignore
4. `.single()` retourne `null` sans erreur

**Regle critique :** Toujours utiliser `userProfile.id` du contexte auth serveur, jamais `userId` fourni par le client (meme si valide).

> Fix 2026-02-02 - app/api/push/subscribe/route.ts

---

### 25. Push Notification Multi-Canal Pattern (NOUVEAU 2026-02-02)

Architecture des notifications push avec URLs adaptees par role :

```typescript
// Pattern pour envoyer push avec URLs role-aware
async function sendRoleAwarePushNotifications(
  interventionId: string,
  recipientIds: string[],
  notification: { title: string; body: string }
) {
  // 1. Recuperer les profiles avec leur role
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, metadata->>assigned_role')
    .in('id', recipientIds)

  // 2. Grouper par role
  const byRole = groupBy(profiles, p => p.metadata?.assigned_role || 'gestionnaire')

  // 3. Envoyer avec URL adaptee
  for (const [role, roleProfiles] of Object.entries(byRole)) {
    const url = getInterventionUrlForRole(interventionId, role)
    await sendPushToUsers(
      roleProfiles.map(p => p.id),
      { ...notification, data: { url } }
    )
  }
}

// Helper URL par role
function getInterventionUrlForRole(id: string, role: string): string {
  const routes = {
    locataire: `/locataire/interventions/${id}`,
    prestataire: `/prestataire/interventions/${id}`,
    gestionnaire: `/gestionnaire/interventions/${id}`
  }
  return routes[role] || routes.gestionnaire
}
```

**Actions notification devis (4 nouvelles) :**

| Action | Destinataire | Canaux |
|--------|--------------|--------|
| `notifyQuoteRequested` | Prestataire | In-app + Push |
| `notifyQuoteSubmitted` | Gestionnaires | In-app + Push |
| `notifyQuoteApproved` | Prestataire | In-app + Push |
| `notifyQuoteRejected` | Prestataire | In-app + Push |

> Source: app/actions/notification-actions.ts (20 actions total)

---

### 26. PWA Notification Prompt Pattern (NOUVEAU 2026-02-02)

Pattern pour maximiser l'activation des notifications PWA :

```
+-------------------------------------------------------------+
| NotificationPromptProvider (app/layout.tsx)                  |
| → Context global pour etat notification                      |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| useNotificationPrompt Hook                                   |
| → isPWA: detecte mode standalone                             |
| → permission: 'default' | 'granted' | 'denied'               |
| → hasDBSubscription: check push_subscriptions table          |
| → shouldShowPrompt: isPWA && permission !== 'granted'        |
+-------------------------------------------------------------+
                           |
           +---------------+---------------+
           |                               |
           v                               v
+------------------+           +---------------------------+
| Permission Modal |           | Settings Guide            |
| (permission=default)         | (permission=denied)       |
| → Bénéfices par role         | → Instructions par plateforme |
| → Bouton "Activer"           | → iOS, Chrome, Safari     |
+------------------+           +---------------------------+
```

**Fichiers cles :**

| Fichier | Description |
|---------|-------------|
| `hooks/use-notification-prompt.tsx` | Hook detection isPWA + permission |
| `components/pwa/notification-permission-modal.tsx` | Modal UI benefices |
| `components/pwa/notification-settings-guide.tsx` | Guide parametres systeme |
| `contexts/notification-prompt-context.tsx` | Provider global |

**Comportement :**
- Installation PWA → Auto-demande permission
- Ouverture PWA + notif desactivees → Modale rappel
- Permission "denied" → Guide vers parametres systeme
- Changement permission → Auto-detection au focus

> Source: docs/plans/2026-02-02-pwa-notification-prompt-design.md

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

### 19. Server Action Auth Pattern (NOUVEAU 2026-01-31)

Pattern centralisé pour l'authentification dans les Server Actions :

```
+-------------------------------------------------------------+
| ARCHITECTURE AUTH CENTRALISÉE                                |
+-------------------------------------------------------------+
|                                                             |
| MIDDLEWARE (1x)     LAYOUTS (1x/role)    CLIENT (1x)        |
| ┌─────────────┐     ┌─────────────┐      ┌─────────────┐    |
| │ Token       │     │getServer    │      │ AuthProvider│    |
| │ Refresh     │     │AuthContext()│      │ (useAuth)   │    |
| └──────┬──────┘     └──────┬──────┘      └──────┬──────┘    |
|        │                   │                    │           |
|        ▼                   ▼                    ▼           |
| ┌─────────────────────────────────────────────────────────┐ |
| │         DONNÉES AUTH PASSÉES EN PARAMÈTRES              │ |
| │  • Services reçoivent userId/teamId en paramètre        │ |
| │  • Server Actions: getServerActionAuthContextOrNull()   │ |
| │  • Hooks client: useAuth() depuis AuthProvider          │ |
| └─────────────────────────────────────────────────────────┘ |
+-------------------------------------------------------------+
```

**Helpers d'authentification par contexte :**

| Contexte | Helper | Comportement |
|----------|--------|--------------|
| Server Components | `getServerAuthContext(role)` | Redirect si non auth |
| Server Actions | `getServerActionAuthContextOrNull()` | Return null si non auth |
| Client Components | `useAuth()` hook | State depuis AuthProvider |
| API Routes | `getApiAuthContext()` | Return null/throw |

**Pattern Server Action (obligatoire) :**

```typescript
// ✅ CORRECT - Pattern centralisé
import { getServerActionAuthContextOrNull } from '@/lib/server-context'

export async function myAction(input: unknown): Promise<ActionResult<Data>> {
  const authContext = await getServerActionAuthContextOrNull()
  if (!authContext) {
    return { success: false, error: 'Authentication required' }
  }
  const { profile, team, supabase } = authContext
  // ... logique métier
}

// ❌ INTERDIT - Pattern local dupliqué
async function getAuthenticatedUser() {
  const supabase = await createServerActionSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ... 20 lignes de code dupliqué
}
```

**Pattern Client Hook (obligatoire) :**

```typescript
// ✅ CORRECT - Session gérée par AuthProvider
const { user, profile, team } = useAuth()

// Si besoin de Supabase client dans le hook:
const supabase = createBrowserSupabaseClient()
const { data } = await supabase.from('table')...

// ❌ INTERDIT - Vérification défensive redondante
const { data: { session } } = await supabase.auth.getSession()
if (!session) return // AuthProvider gère déjà ça!
```

**Bug `.single()` avec multi-profil :**

```typescript
// ❌ CASSE pour utilisateurs multi-équipes (erreur PGRST116)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .single()

// ✅ CORRECT - Supporte multi-profil
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', userId)
  .limit(1)
  .then(res => res.data?.[0])
```

**Fichiers de référence :**
- `lib/server-context.ts` - Helpers centralisés
- `lib/api-auth-helper.ts` - Helper pour API Routes
- `docs/plans/2026-01-31-auth-refactoring-design.md` - Design complet

**Fichiers refactorés (2026-01-31) - Phase 1:**
- 4 hooks: `use-tenant-data.ts`, `use-contacts-data.ts`, `use-interventions.ts`, `use-prestataire-data.ts`
- 7 Server Actions: `intervention-actions.ts`, `intervention-comment-actions.ts`, `email-conversation-actions.ts`, `conversation-actions.ts`, `contract-actions.ts`, `building-actions.ts`, `lot-actions.ts`
- 3 Services: `intervention-service.ts`, `team.repository.ts`, `supabase-client.ts`

**Fichiers refactorés (2026-01-31) - Phase 2 (Migration complète):**
- 3 hooks race condition: `use-notifications.ts`, `use-notification-popover.ts`, `use-activity-logs.ts` → Pattern #20
- 1 hook realtime: `use-realtime-chat-v2.ts` → `useAuth()` au lieu de `supabase.auth.getSession()`
- 2 documents tabs: `documents-tab.tsx` (gestionnaire + prestataire) → `useAuth()`
- 5 API routes: `companies/[id]`, `emails/[id]`, `emails/send`, `emails/connections/[id]`, `emails/oauth/callback` → `getApiAuthContext()`

**Fichiers NON migrés (infrastructure auth - volontairement):**
- `hooks/use-auth.tsx` - AuthProvider centralisé
- `lib/auth-dal.ts` - DAL centralisé
- `lib/api-auth-helper.ts` - Helper API centralisé
- `middleware.ts`, `utils/supabase/middleware.ts` - Middleware auth
- `app/auth/*` - Pages flux d'authentification
- `lib/session-cleanup.ts`, `hooks/use-session-*.ts` - Gestion session bas niveau
- `lib/services/domain/intervention-service.ts` - Contient fallback DEPRECATED (documenté dans le code)

---

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

### 20. Client Hook Auth Loading Pattern (NOUVEAU 2026-01-31)

Pattern pour éviter les race conditions dans les hooks client qui dépendent de `useAuth()` :

```
+-------------------------------------------------------------+
| PROBLÈME: Race Condition Auth Loading                        |
|                                                             |
| 1. Component monte → useEffect déclenché immédiatement      |
| 2. useAuth() retourne { user: null, loading: true }         |
| 3. Hook fait early return + setLoading(false) ← ERREUR!     |
| 4. Auth finit → user disponible MAIS hook a déjà terminé    |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| SOLUTION: Vérifier authLoading + ajouter aux dépendances    |
|                                                             |
| const { user, loading: authLoading } = useAuth()            |
|                                                             |
| const fetchData = async () => {                             |
|   if (authLoading) return  // ← Sans setLoading(false)!     |
|   if (!user?.id) { setLoading(false); return }              |
|   // ... fetch data                                         |
| }                                                           |
|                                                             |
| useEffect(() => {                                           |
|   fetchData()                                               |
| }, [user?.id, authLoading, ...otherDeps])  // ← authLoading!|
+-------------------------------------------------------------+
```

**Pattern correct (obligatoire pour hooks avec data fetch) :**

```typescript
// ✅ CORRECT - Attend que l'auth soit prête
export const useMyData = (options) => {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    // Ne pas faire d'early return avec setLoading(false) si auth charge encore
    if (authLoading) return

    if (!user?.id) {
      setLoading(false)
      return
    }

    // ... fetch data
    setLoading(false)
  }

  // authLoading dans les dépendances = re-fetch quand auth termine
  useEffect(() => {
    fetchData()
  }, [user?.id, authLoading])

  return { data, loading }
}

// ❌ INTERDIT - Race condition
const { user } = useAuth()  // Manque loading!

const fetchData = async () => {
  if (!user?.id) {
    setLoading(false)  // Termine prématurément!
    return
  }
}

useEffect(() => {
  fetchData()
}, [user?.id])  // Pas authLoading = pas de re-fetch!
```

**Hooks corrigés (2026-01-31) :**
- `hooks/use-notifications.ts`
- `hooks/use-notification-popover.ts`
- `hooks/use-activity-logs.ts`

**Alternative: Props du serveur (bypass auth client)**

Pour éviter le délai d'auth côté client, passer userId/teamId depuis le serveur :

```typescript
// Layout serveur (pré-fetch auth)
const { user, team } = await getServerAuthContext('gestionnaire')
return <MyClientComponent userId={user.id} teamId={team.id} />

// Hook client (utilise props en priorité)
const effectiveUserId = propUserId || user?.id
const effectiveTeamId = propTeamId || team?.id
```

> Voir `use-global-notifications.ts` pour exemple de ce pattern.

### 21. Auth API Optimization Pattern (NOUVEAU 2026-01-31)

Pattern critique pour éviter les appels API d'authentification excessifs :

```
+-------------------------------------------------------------+
| ARCHITECTURE AUTH OPTIMISÉE                                  |
+-------------------------------------------------------------+
|                                                             |
| MIDDLEWARE (1 appel réseau)    PAGES/LAYOUTS (0 appel)      |
| ┌─────────────────────────┐    ┌────────────────────────┐   |
| │ supabase.auth.getUser() │    │ supabase.auth.         │   |
| │ → Valide token serveur  │    │ getSession()           │   |
| │ → 1 appel réseau        │    │ → Lit JWT cookie       │   |
| └─────────────────────────┘    │ → 0 appel réseau       │   |
|                                └────────────────────────┘   |
+-------------------------------------------------------------+
```

**Règle critique :**
- `getUser()` = appel réseau vers Supabase Auth API (à éviter dans les pages)
- `getSession()` = lecture locale du JWT depuis les cookies (recommandé)

**Pattern correct (lib/auth-dal.ts) :**

```typescript
// ✅ CORRECT - Pages/Layouts utilisent getSession() (local)
export const getUser = cache(async () => {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null  // Pas d'appel réseau!
})

// ❌ INTERDIT dans les pages - Uniquement dans middleware
const { data: { user } } = await supabase.auth.getUser()
```

**Pattern cache() sur client Supabase :**

```typescript
// ✅ CORRECT - Cache le client par requête
export const createServerSupabaseClient = cache(async () => {
  // ... création client
})

// ❌ INTERDIT - Crée un nouveau client à chaque appel
export async function createServerSupabaseClient() {
  // Chaque appel = nouvelle instance = potentiel double auth
}
```

**Fichiers clés :**
- `lib/auth-dal.ts` - DAL centralisé (getUser, getSession cachés)
- `lib/services/core/supabase-client.ts` - Client avec cache()
- `middleware.ts:230` - Seul endroit avec getUser() réseau
- `hooks/use-auth.tsx` - AuthProvider client avec flag anti-duplicate

**Résultat mesuré :**
- **Avant**: 250+ appels `/auth/v1/user` en 10 minutes
- **Après**: 1 appel par navigation

### 22. Invited Users Only Pattern (NOUVEAU 2026-02-01)

Pattern pour filtrer les conversations et notifications aux seuls utilisateurs invités (avec compte).

**⚠️ ATTENTION: La colonne s'appelle `auth_user_id` dans la DB, PAS `auth_id` !**

```
+-------------------------------------------------------------+
| PROBLEME: Contacts Informatifs vs Utilisateurs Invités       |
|                                                             |
| Un contact peut être ajouté à une intervention SANS compte   |
| (auth_user_id = null). Ces contacts sont informatifs.        |
| Ils NE DOIVENT PAS:                                         |
| - Avoir de conversation individuelle créée                   |
| - Être ajoutés aux participants                              |
| - Recevoir de notifications (in-app, push, email)           |
+-------------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------------+
| SOLUTION: Filtre auth_user_id à CHAQUE point d'entrée        |
|                                                             |
| // Pattern 1: Requête Supabase avec filtre                   |
| const { data: users } = await supabase                       |
|   .from('users')                                             |
|   .select('id')                                              |
|   .not('auth_user_id', 'is', null)  // ⚠️ auth_USER_id !    |
|                                                             |
| // Pattern 2: Vérification avant création thread             |
| const hasAuthAccount = !!userData?.auth_user_id              |
| if (!hasAuthAccount) {                                       |
|   logger.info('Skipping for non-invited user')              |
|   return                                                     |
| }                                                            |
|                                                             |
| // Pattern 3: Propagation has_account pour UI               |
| Repository: .select('id, name, auth_user_id')                |
| Service: has_account: !!user.auth_user_id                    |
| UI: {!has_account && <Badge>Non invité</Badge>}             |
+-------------------------------------------------------------+
```

**Points d'entrée à filtrer (Defense in Depth) :**

| Couche | Fichier | Filtre |
|--------|---------|--------|
| API Routes | `create-manager-intervention/route.ts` | `.not('auth_user_id', 'is', null)` |
| Services | `intervention-service.ts` (assignUser) | `hasAuthAccount` check |
| Services | `conversation-service.ts` (addInitialParticipants) | `.not('auth_user_id', 'is', null)` |
| Services | `conversation-service.ts` (getInterventionTenants) | JOIN avec users + filtre |
| Actions | `conversation-actions.ts` | Check `auth_user_id` avant lazy creation |
| Actions | `conversation-notification-actions.ts` | Filtre managers |

**Data flow `has_account` :**

```
DB (auth_user_id) → Repository (auth_user_id) → Service (has_account) → Action (has_account) → UI (badge)
```

**Fichiers clés :**
- `lib/services/domain/conversation-service.ts` - Filtrage participants
- `lib/services/domain/intervention-service.ts` - Filtrage création threads
- `lib/services/repositories/contract.repository.ts` - Ajout auth_user_id aux selects
- `components/intervention/assignment-section-v2.tsx` - Badge "Non invité"
- `components/interventions/shared/layout/conversation-selector.tsx` - Badge "Gestionnaires" pour locataire

**Design document:** `docs/plans/2026-02-01-invited-users-only-conversations-design.md`

### 23. PWA Notification Prompt Pattern (NOUVEAU 2026-02-02)

Pattern pour maximiser le taux d'activation des notifications PWA :

```
+-------------------------------------------------------------+
| COMPORTEMENT                                                 |
|                                                             |
| 1. Installation PWA → Auto-demande permission                |
| 2. Si refusé/fermé → Modale de rappel à CHAQUE ouverture    |
| 3. Si permission='denied' → Guide vers paramètres système   |
| 4. Détection automatique du changement de permission        |
+-------------------------------------------------------------+
```

**Fichiers clés :**

| Fichier | Responsabilité |
|---------|----------------|
| `hooks/use-notification-prompt.tsx` | Logique de détection (isPWA, permission, user) |
| `components/pwa/notification-permission-modal.tsx` | Modal UI avec bénéfices par rôle |
| `components/pwa/notification-settings-guide.tsx` | Instructions paramètres système |
| `contexts/notification-prompt-context.tsx` | Provider global |
| `app/layout.tsx` | Intégration du provider |

**Détection mode PWA :**
```typescript
const isPWAMode = window.matchMedia('(display-mode: standalone)').matches
  || (window.navigator as any).standalone === true // iOS
```

**Conditions d'affichage modale :**
```typescript
const shouldShowModal =
  isPWAMode &&                          // Mode standalone
  isSupported &&                        // Navigateur supporte push
  !authLoading && !!user &&             // User authentifié
  permission !== 'granted' &&           // Pas encore accordé
  !isSubscribed                         // Pas d'abonnement actif
```

**Auto-détection changement permission (focus event) :**
```typescript
// Quand user revient des paramètres système
window.addEventListener('focus', async () => {
  const newPermission = pushManager.getPermissionStatus()
  if (newPermission === 'granted') {
    await pushManager.subscribe(user.id) // Auto-subscribe
  }
})
```

**Design document:** `docs/plans/2026-02-02-pwa-notification-prompt-design.md`

### 27. ContactSelector in Modal Pattern (NOUVEAU 2026-02-03)

Pattern pour intégrer le composant `ContactSelector` dans une modale sans afficher son UI par défaut :

```typescript
// Importer le type ref
import type { ContactSelectorRef } from '@/components/contacts/contact-selector'

// Créer une ref
const contactSelectorRef = useRef<ContactSelectorRef>(null)

// Dans le JSX - ContactSelector avec hideUI
<ContactSelector
  ref={contactSelectorRef}
  mode="multiple"
  contactType="provider"        // ou "tenant", "manager"
  teamId={teamId}
  selectedIds={selectedProviderIds}
  onSelectionChange={handleProviderChange}
  interventionId={intervention?.id}
  hideUI={true}                 // ← Ne rend rien visuellement
/>

// Bouton pour ouvrir le sélecteur
<Button
  variant="outline"
  size="sm"
  onClick={() => contactSelectorRef.current?.openContactModal()}
>
  + Ajouter
</Button>
```

**Props clés de ContactSelector :**

| Prop | Description |
|------|-------------|
| `hideUI={true}` | N'affiche rien, utilise ref pour ouvrir |
| `mode="multiple"` | Sélection multiple |
| `contactType` | "provider", "tenant", "manager" |
| `selectedIds` | IDs présélectionnés |
| `onSelectionChange` | Callback avec nouveaux IDs |

**Pattern Locataires par Lot (Intervention Bâtiment) :**

Pour les interventions sur un bâtiment entier (`lot_id = null`), afficher les locataires groupés par lot avec switches individuels :

```typescript
// Type pour locataires groupés par lot
interface BuildingTenantsResult {
  lots: Array<{
    lot_id: string
    lot_number: string
    floor: string | null
    tenants: Array<{
      id: string
      name: string
      has_account: boolean  // Pour badge "Non invité"
    }>
  }>
  totalTenants: number
}

// Affichage dans la modale
{buildingTenants?.lots.map((lot) => (
  <div key={lot.lot_id}>
    <Switch
      checked={!excludedLotIds.includes(lot.lot_id)}
      onCheckedChange={() => onLotToggle(lot.lot_id)}
    />
    <span>Lot {lot.lot_number}</span>
    {lot.tenants.map(tenant => (
      <div key={tenant.id}>
        {tenant.name}
        {!tenant.has_account && <Badge variant="outline">Non invité</Badge>}
      </div>
    ))}
  </div>
))}
```

**Fichiers de référence :**
- `components/intervention/modals/programming-modal-FINAL.tsx` - Implémentation complète
- `components/contacts/contact-selector.tsx` - Composant source
- `components/intervention/assignment-section-v2.tsx` - Pattern locataires par lot

**Fichiers utilisant ce pattern :**
- `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`
- `app/gestionnaire/(with-navbar)/interventions/interventions-page-client.tsx`

---
*Derniere mise a jour: 2026-02-04 18:10*
*Analyse approfondie: Migration Auth COMPLETE + Optimization API calls + Invited Users Only + PWA Notification Prompt + ContactSelector Modal Pattern + Fix ensureInterventionConversationThreads*
*References: lib/services/README.md, lib/server-context.ts, lib/api-auth-helper.ts, .claude/CLAUDE.md*
