# SEIDO Progress Log

## Milestones Completes

### Phase 1: Core Architecture ✅
- Users, Teams, Companies, Invitations
- Repository Pattern implementation
- 21 repositories crees

### Phase 2: Property Management ✅
- Buildings, Lots, Property Documents
- RLS policies multi-tenant

### Phase 3: Interventions ✅
- Workflow 11 statuts
- Chat/Conversation system
- Notifications infrastructure
- Email system (IMAP/SMTP)

### Phase 4: Contracts ✅
- Contract management
- Document handling
- Import jobs

### Phase 5: UX Improvements 🚧 (En cours)
- [x] Google OAuth integration
- [x] Onboarding modal (5 slides)
- [x] Avatar system
- [x] Email quote stripping
- [x] Gmail OAuth integration
- [x] Email conversation threading
- [x] Memory Bank implementation
- [x] **Optimisation ecosysteme .claude/** (2026-01-23)
- [x] **PWA Push Notifications** (2026-01-25)
- [x] Chat message bubble enhancements (2026-01-25)
- [x] **Participant confirmation flow** (2026-01-25)
- [x] **Intervention types dynamiques** (2026-01-25)
- [x] **Migration workflow devis** (2026-01-26) - Suppression demande_de_devis
- [x] **Fix affichage reponses en attente** (2026-01-26)
- [x] **Pagination vue liste interventions** (2026-01-26)
- [x] **Verification architecture cards unifiee** (2026-01-27)
- [x] **Centralisation Adresses + Google Maps prep** (2026-01-28)
- [x] **Fix Conversation Threads Multi-Profil** (2026-01-29)
- [x] **Performance Optimization + UX Tabs** (2026-01-30)
- [x] **Accessibility WCAG AA ApprovalModal** (2026-01-30)
- [x] **Card Refactoring: PendingActionsCard → InterventionCard** (2026-01-30)
- [x] **Fix Finalization Modal z-index** (2026-01-30) - Modale invisible corrigée
- [x] **Auth Refactoring Complet** (2026-01-31) - Centralisation auth, suppression appels redondants
- [x] **SWR Server Component Fix** (2026-01-31) - Séparation client/serveur pour hooks SWR
- [x] **Tenant Dashboard UX** (2026-01-31) - Affichage étage/porte/description avec alignement corrigé
- [x] **Extension Types Locataire** (2026-01-31) - Dropdown locataire: 20 → 27 types (ajout catégorie "Locataire")
- [x] **Fix Confirmation Gestionnaire** (2026-01-31) - Header "Intervention créée" affiché après création, pas avant
- [x] **Auth API Optimization** (2026-01-31) - Réduction de 250+ appels à 1 par navigation
- [x] **Filtrage auth_id Conversations/Notifications** (2026-02-01) - Seuls les contacts invités (avec compte) reçoivent conversations et notifications
- [x] **PWA Notification Prompt Modal** (2026-02-02) - Modale rappel notifications à chaque ouverture PWA
- [x] **Web/PWA Notification Unification** (2026-02-02) - PushNotificationToggle unifié pour web et PWA
- [x] **Quote Notifications Multi-Canal** (2026-02-02) - 4 nouvelles actions: quote request/submit/approve/reject
- [x] **Push Subscription Security Fix** (2026-02-02) - userProfile.id + null data check pour RLS silent blocks

## Sprint Actuel (Jan-Feb 2026)

### 2026-02-09 - Planning Button + Conversation Thread Fix + Participant Indicator

**Session 1: Planning Button Consolidation**

Replaced 2 header buttons ("Gérer créneaux" + "Gérer estimations") on gestionnaire intervention detail page (status `planification`) with a single "Gérer planification" button that opens the ProgrammingModal with pre-filled state.

| Fichier | Changement |
|---------|------------|
| `lib/intervention-action-utils.ts` | `manage_planning` ActionType + single button |
| `gestionnaire intervention-detail-client.tsx` | Handler + URL auto-open + pre-fill useEffect |

**Pre-fill logic:** Maps `scheduling_type` DB enum → modal option (`fixed`→`direct`, `slots`→`propose`, `flexible`→`organize`). Existing time slots pre-filled.

---

**Session 2: Conversation Thread Fix (4 stories via Ralph)**

Fix 3 bugs: (1) DB trigger adds contacts without accounts to conversations, (2) trigger uses LIMIT 1 without participant_id for individual threads, (3) no visual distinction between users with/without accounts in participant badges.

| Story | Description | Files |
|-------|-------------|-------|
| US-001 | DB trigger: auth_user_id guard + participant_id filter | Migration SQL |
| US-002 | hasAccount flag in participant types | 4 files (3 roles + shared type) |
| US-003 | Visual indicator (dashed border, muted, no chat icon) | participants-row.tsx |
| US-004 | Already done (create-intervention handles threads) | No change |

**Key decisions:**
- Migration repair workflow (revert + re-push) instead of DB reset
- `hasAccount !== false` for backwards compat (treats undefined as true)
- Retroactive cleanup in migration (DELETE bad data + INSERT missing participants)

**Learnings ajoutés:** AGENTS.md #024-#026
**Retrospective:** `docs/learnings/2026-02-09-conversation-thread-fix-retrospective.md`

---

### 2026-02-08 - Performance Navigation Optimization V2 COMPLETE

**Session: Performance Optimization V2 — 17 User Stories**

Feature complete avec tous les 17 stories implementes et valides.

**Commit:** `3bb1f4e` feat(performance): complete Performance Navigation Optimization V2 (17 stories)

**Stories par Phase:**

| Phase | Stories | Description |
|-------|---------|-------------|
| Error Handling | US-101, US-102, US-103 | error.tsx, not-found.tsx, PageSkeleton |
| List Performance | US-201, US-202, US-203, US-204 | useDebounce, pagination, virtual scroll, prefetch |
| Detail Pages | US-301, US-302, US-303, US-304 | Batch queries, parallel loading, lazy tabs |
| Next.js 15 | US-401, US-402, US-403 | Suspense, generateMetadata, PPR |
| Supabase | US-501, US-502, US-503 | Singleton, indexes, backoff |

**Fichiers crees (33):**
- 10 error.tsx / not-found.tsx (5 roles)
- 2 async content components (dashboard, interventions)
- 7 loading.tsx (dashboard, mail, profile pour 3 roles)
- 1 PageSkeleton component (5 variants)
- 2 hooks (useDebounce, usePrefetch)
- 1 retrospective document
- 1 SSR migration pattern doc

**Fichiers modifies (57):**
- Services: intervention-service, conversation-service, contract.service
- Repositories: intervention, contract, conversation
- Components: intervention-card, building cards, lot-card, interventions-list-view-v1
- Pages: dashboard, interventions, mail, notifications, building detail, lot detail

**Learnings ajoutes a AGENTS.md:**
- #018: react-window v2 API migration
- #019: Virtualization threshold (50+ items)
- #020: Suspense streaming with async Server Components
- #021: Supabase relation alias syntax for joins

**Patterns ajoutes a systemPatterns.md:**
- #28: Suspense Streaming Pattern
- #29: Virtual Scrolling avec Seuil

**Bug fixes:**
- use-debounce.ts: Duplicate useEffect import
- react-window v2: API changes (FixedSizeList → List)
- mail/page.tsx: Wrong table/column names
- intervention-detail-client.tsx: Duplicate dynamic import

**Retrospective:** `docs/learnings/2026-02-08-performance-navigation-v2-retrospective.md`

---

### 2026-02-04 - Fix Critique ensureInterventionConversationThreads

**Session: Code Review Bugfix — Conversation Threads**

Fix de 3 problèmes identifiés par code review dans `ensureInterventionConversationThreads`:

| Fix | Sévérité | Description |
|-----|----------|-------------|
| **Fix 1** | CRITIQUE | `.is('deleted_at', null)` sur `intervention_assignments` → colonne inexistante, fonction entièrement cassée (zéro threads créés) |
| **Fix 2** | Efficacité | Capture directe du `groupThreadId` créé au lieu de re-query DB (élimine 1 query redondante) |
| **Fix 3** | Fonctionnel | Ajout `else` branches pour `tenants_group` / `providers_group` existants → nouveaux users ajoutés aux group threads existants |

**Fichier modifié:** `app/actions/conversation-actions.ts`

**Leçons documentées:**
- Supabase PostgREST échoue silencieusement si on filtre sur colonne inexistante
- `addParticipant` est idempotent (ON CONFLICT DO NOTHING) → safe pour "ensure exists"
- Toujours vérifier `database.types.ts` avant de filtrer sur une colonne

**Lint:** ✅ Aucun nouveau warning

---

### 2026-02-03 - Simplification Statut "Approuvée" + ProgrammingModal Réutilisable

**Session: Workflow Simplification + UI Unification**

Simplification de l'UX pour les interventions avec statut "approuvée" et intégration de vrais composants ContactSelector dans la ProgrammingModal.

**Modifications:**

| Fichier | Changement |
|---------|------------|
| `lib/intervention-action-utils.ts` | Un seul bouton "Planifier" (suppression "Demander estimation") |
| `lib/intervention-utils.ts` | Message "En attente de planification" |
| `programming-modal-FINAL.tsx` | ContactSelector réels au lieu de mockups inline |
| `intervention-detail-client.tsx` | Réactivation ProgrammingModal + props managers/tenants |
| `interventions-page-client.tsx` | Props minimales pour ProgrammingModal |
| `intervention-card.tsx` | Callback `onOpenProgrammingModal` |
| `pending-actions-section.tsx` | Propagation callback vers InterventionCard |

**Pattern documenté:** ContactSelector avec `hideUI={true}` + `ref.openContactModal()` pour intégration dans modales.

**Build:** ✅ Réussi sans erreurs

---

### 2026-02-03 (earlier) - Fix Infinite Refresh Loop

**Problème:** Boucle infinie de refresh sur la page de détail d'intervention.

**Root Cause:** ChatInterface appelait `markThreadAsReadAction()` à chaque render, ce qui déclenchait `revalidatePath()` → re-render → nouvel appel → boucle.

**Fix:**
- `useRef<Set<string>>` pour tracker les threads déjà marqués lus (déduplication)
- `useInterventionApproval`: Un seul refresh au lieu de callback + setTimeout

---

### 2026-02-02 - Push Subscription Security Fix + PWA Notifications

**Session 1: Quote Notifications Multi-Canal**

Audit complet du système de notifications pour les devis. Identification et correction de gaps critiques.

| Route | Avant | Après |
|-------|-------|-------|
| `intervention-quote-request` | ❌❌❌ | ✅✅✅ (Email + In-App + Push) |
| `intervention-quote-submit` | ✅✅❌ | ✅✅✅ (Push ajouté) |
| `quotes/[id]/approve` | ✅❌❌ | ✅✅✅ (In-App + Push ajoutés) |
| `quotes/[id]/reject` | ✅❌❌ | ✅✅✅ (In-App + Push ajoutés) |

**Nouvelles actions créées:**
- `notifyQuoteRequested` - In-app + Push pour prestataire
- `notifyQuoteApproved` - In-app + Push pour prestataire
- `notifyQuoteRejected` - In-app + Push pour prestataire
- `notifyQuoteSubmittedWithPush` - In-app + Push pour gestionnaires

**Bug fix URLs Push:** Nouvelle fonction `sendRoleAwarePushNotifications()` qui groupe par rôle et envoie l'URL appropriée.

---

**Session 2: PWA Notification Prompt**

Maximisation du taux d'activation des notifications PWA via modale de rappel.

| Fichier Créé | Description |
|--------------|-------------|
| `hooks/use-notification-prompt.tsx` | Hook de détection (isPWA, permission, user) |
| `components/pwa/notification-permission-modal.tsx` | Modal UI avec bénéfices par rôle |
| `components/pwa/notification-settings-guide.tsx` | Instructions paramètres par plateforme |
| `contexts/notification-prompt-context.tsx` | Provider global |

**Comportement:** Modale affichée à chaque ouverture PWA si notifications non activées.

---

**Session 3: Web/PWA Notification Unification**

Refactoring pour unifier l'expérience notifications entre web et PWA.

| Composant | Changement |
|-----------|------------|
| `push-notification-toggle.tsx` | Unifié web + PWA |
| `notification-permission-modal.tsx` | Guide contextuel selon permission state |
| `notification-settings-guide.tsx` | Instructions iOS, Chrome, Safari |

---

**Session 4: Push Subscription Security Fix**

**Problème:** Les push subscriptions n'étaient pas sauvegardées malgré API 200.

**Root causes:**
1. **RLS Silent Block** - Supabase anon key peut bloquer sans erreur
2. **No Null Check** - `.single()` retourne null si RLS bloque
3. **Client userId** - Utilisait userId du client au lieu de userProfile.id

**Fix appliqué:** `app/api/push/subscribe/route.ts`
- `user_id: userProfile.id` (au lieu de userId)
- Ajout check `if (!data)` pour détecter RLS silent blocks
- Logs cohérents avec `userProfileId`

**Commit:** `4d8a8e8` fix(push-subscribe): enhance security by using userProfile.id

---

**Session 5: Debug Page Paramètres (EN COURS)**

**Symptôme:** Page `/gestionnaire/parametres` bloquée sur "Chargement..."

**Analyse:** Le composant `settings-page.tsx` attend `user` de `useAuth()`. Logs montrent initialisation partielle (`NotificationPrompt Initialized`).

**À vérifier:**
- Déploiement Vercel réussi
- Refresh forcé (Ctrl+Shift+R)
- Logs serveur Vercel

**Note:** Le fix push-subscribe ne devrait PAS affecter le chargement car c'est une API POST non appelée au mount.

---

### 2026-02-01 - Filtrage auth_id Conversations/Notifications pour Contacts Invités

**Problème résolu:** Les utilisateurs ajoutés à une intervention mais non invités (sans compte `auth_id`) recevaient des conversations individuelles et des notifications alors qu'ils ne peuvent pas se connecter à l'application.

**Règle métier implémentée:**
- Utilisateurs avec `auth_id` (invités) → Conversations créées + Notifications envoyées
- Contacts sans `auth_id` (informatifs) → Visibles dans listes mais exclus des conversations/notifications

**Solution - Filtrage à tous les points d'entrée:**

| Point d'Entrée | Fichier | Correction |
|----------------|---------|------------|
| API création intervention | `create-manager-intervention/route.ts` | `.not('auth_id', 'is', null)` sur tenants/providers |
| Service assignUser() | `intervention-service.ts` | Check `hasAuthAccount` avant création thread |
| Service assignMultipleProviders() | `intervention-service.ts` | Check `hasAuthAccount` |
| Service createConversationThreads() | `intervention-service.ts` | Filtre managers avec `auth_id` |
| Service addInitialParticipants() | `conversation-service.ts` | **FIX REVIEW** - Filtre tous les users |
| Service getInterventionTenants() | `conversation-service.ts` | **FIX REVIEW** - JOIN avec filtre `auth_id` |
| Actions lazy creation | `conversation-actions.ts` | Check `auth_id` avant création |
| Actions notifications | `conversation-notification-actions.ts` | Filtre managers avec `auth_id` |

**Data flow `has_account` pour UI:**
- `contract.repository.ts` → Ajout `auth_id` aux selects
- `contract.service.ts` → Conversion en `has_account: boolean`
- `contract-actions.ts` → Propagation aux types
- `assignment-section-v2.tsx` → Badge "Non invité" affiché

**Fichiers modifiés (13):**
- Backend: 4 fichiers (intervention-service, conversation-service, 2 routes)
- Actions: 3 fichiers (conversation, notification, contract)
- Repository/Service: 2 fichiers (contract)
- UI: 3 fichiers (assignment-section, nouvelle-intervention, intervention-edit)
- Docs: 1 fichier (design document)

**Code review effectuée:** 4 issues IMPORTANT corrigées pendant la review

**Design document:** `docs/plans/2026-02-01-invited-users-only-conversations-design.md`

---

### 2026-01-31 - Auth API Optimization (Session 5) - CRITIQUE PERFORMANCE

**Problème résolu:** 250+ appels API `/auth/v1/user` en 10 minutes pour un seul utilisateur connecté.

**Root Causes Identifiées:**

| Cause | Impact |
|-------|--------|
| `getUser()` avec retry loop | Jusqu'à 4 appels réseau par invocation |
| `getSession()` avec double validation | Appelait `getSession()` + `getUser()` |
| `createServerSupabaseClient()` non cached | Nouveau client créé à chaque appel |
| Middleware + Pages = double validation | 2 appels `getUser()` par navigation |

**Solution:**

**Principe clé:** Le middleware fait l'unique appel réseau `getUser()`. Les pages utilisent `getSession()` qui lit le JWT localement (ZERO network call).

**Fichiers modifiés:**

| Fichier | Changement |
|---------|------------|
| `lib/auth-dal.ts` | `getUser()` utilise `getSession()` au lieu de `supabase.auth.getUser()` |
| `lib/auth-dal.ts` | Suppression du retry loop dans `getUser()` |
| `lib/auth-dal.ts` | `getSession()` n'appelle plus `getUser()` en double |
| `lib/services/core/supabase-client.ts` | Ajout `cache()` wrapper sur `createServerSupabaseClient` |
| `hooks/use-auth.tsx` | Flag `initialSessionHandled` pour éviter appels dupliqués |

**Résultat:**
- **Avant**: 250+ appels en 10 minutes
- **Après**: 1 appel par navigation (comportement attendu)

**Commit:** `2431cc3` perf(auth): reduce auth API calls from 250+ to 1 per navigation

---

### 2026-01-31 - Formulaire Intervention Locataire + Confirmation Gestionnaire (Session 4)

**Ce qui a été fait:**

**1. Extension Types d'Intervention Locataire**
- Le dropdown locataire n'affichait que 20 types (catégorie "Bien")
- 7 types pertinents étaient masqués (catégorie "Locataire" : Réclamation, Nuisances, Demande d'info...)
- Solution: Composant accepte maintenant un tableau de catégories

**Fichiers modifiés:**
- `components/intervention/intervention-type-combobox.tsx` (type `categoryFilter` étendu)
- `app/locataire/.../nouvelle-demande-client.tsx` (filtre `["bien", "locataire"]`)

**2. Fix Confirmation Gestionnaire (Header Prématuré)**
- L'étape 4 du gestionnaire affichait "Intervention créée !" AVANT la création réelle
- Root cause: `showSuccessHeader={true}` alors qu'on est encore à l'étape de confirmation

**Fichier modifié:**
- `app/gestionnaire/.../nouvelle-intervention-client.tsx` (`showSuccessHeader={false}`)

**Pattern documenté:** Cohérence locataire/gestionnaire pour `InterventionConfirmationSummary`

---

### 2026-01-31 - SWR Server Component Fix + Tenant Dashboard UX (Session 3)

**Ce qui a été fait:**

**1. Fix `ReferenceError: window is not defined`**
- Root cause: SWR accède à `window` au moment de l'import du module
- Le hook `use-intervention-types.ts` était importé dans Server Component
- Solution: Créé `lib/services/domain/intervention-types.server.ts` séparé

**Fichiers modifiés:**
- `lib/services/domain/intervention-types.server.ts` (CRÉÉ)
- `app/gestionnaire/.../nouvelle-intervention/page.tsx` (import mis à jour)
- `hooks/use-intervention-types.ts` (fonction supprimée)

**2. Fix Affichage Étage/Porte Dashboard Locataire**
- Problème: Bullet `•` affiché en premier, mauvais alignement, champs inexistants
- Solution: Pattern séparateurs conditionnels + `pl-7` alignement + description ajoutée

**Fichiers modifiés:**
- `lib/services/domain/tenant.service.ts` (ajout `description` dans requête)
- `lib/utils/tenant-transform.ts` (ajout `description` au type)
- `hooks/use-tenant-data.ts` (ajout `description` à l'interface)
- `components/dashboards/locataire-dashboard-hybrid.tsx` (nouveau affichage)

**Pattern documenté:** Séparation client/serveur pour hooks SWR dans activeContext.md

---

### 2026-01-31 - Authentication Refactoring (MAJEUR)

**Problème résolu:** L'authentification dans SEIDO faisait des appels redondants à plusieurs endroits au lieu de passer l'information depuis les points d'entrée.

**3 phases complétées:**

| Phase | Description | Fichiers modifiés |
|-------|-------------|-------------------|
| **Phase 1: Hooks** | Suppression vérifications défensives session | 4 hooks |
| **Phase 2: Server Actions** | Remplacement `getAuthenticatedUser()` par helper centralisé | 7 fichiers |
| **Phase 3: Services** | Paramètres explicites + deprecation helpers legacy | 3 fichiers |

#### Phase 1: Hooks Client (4 fichiers)

| Fichier | Modification | Bug fix post-review |
|---------|--------------|---------------------|
| `hooks/use-tenant-data.ts` | Supprimé defensive session check | ✅ Ajouté `const supabase = createBrowserSupabaseClient()` ligne 212 |
| `hooks/use-contacts-data.ts` | Supprimé defensive session check | ✅ Ajouté `const supabase = createBrowserSupabaseClient()` ligne 112 |
| `hooks/use-interventions.ts` | Supprimé defensive session check | - |
| `hooks/use-prestataire-data.ts` | Supprimé defensive session check | ✅ Ajouté `const supabase = createBrowserSupabaseClient()` ligne 203 |

**Bug critique corrigé (post-review):** Les 3 hooks `use-contacts-data.ts`, `use-prestataire-data.ts`, `use-tenant-data.ts` utilisaient `supabase` sans l'avoir déclaré après la suppression des vérifications défensives.

#### Phase 2: Server Actions (7 fichiers)

**Nouveau helper créé:** `getServerActionAuthContextOrNull()` dans `lib/server-context.ts`

| Fichier | Ancienne méthode | Nouvelle méthode | Bugs fixés |
|---------|------------------|------------------|------------|
| `app/actions/intervention-actions.ts` | `getAuthenticatedUser()` local | `getServerActionAuthContextOrNull()` | - |
| `app/actions/intervention-comment-actions.ts` | `getAuthenticatedUser()` local | `getServerActionAuthContextOrNull()` | - |
| `app/actions/email-conversation-actions.ts` | `getAuthenticatedUser()` local | `getServerActionAuthContextOrNull()` | - |
| `app/actions/conversation-actions.ts` | `getAuthenticatedUser()` local | `getServerActionAuthContextOrNull()` | - |
| `app/actions/contract-actions.ts` | `getSession()` + `.single()` | `getServerActionAuthContextOrNull()` | `.single()` → `.limit(1)` |
| `app/actions/building-actions.ts` | `getSession()` + `.single()` | `getServerActionAuthContextOrNull()` | `.single()` → `.limit(1)` |
| `app/actions/lot-actions.ts` | `getSession()` + `.single()` | `getServerActionAuthContextOrNull()` | `.single()` → `.limit(1)` |

**Bug `.single()` fixé:** Pour les utilisateurs multi-profil (plusieurs équipes), `.single()` causait une erreur PGRST116 car plusieurs rows étaient retournées.

#### Phase 3: Services/Repositories (3 fichiers)

| Fichier | Modification |
|---------|--------------|
| `lib/services/domain/intervention-service.ts` | `getAll()` accepte maintenant `teamId` en paramètre optionnel |
| `lib/services/repositories/team.repository.ts` | Supprimé debug auth call inutile |
| `lib/services/core/supabase-client.ts` | Ajouté `@deprecated` sur `getCurrentUserId()`, `isAuthenticated()`, `getServerSession()` |

#### Nouveau pattern Server Action

```typescript
// lib/server-context.ts - NOUVEAU HELPER
import { getServerActionAuthContextOrNull } from '@/lib/server-context'

export async function myAction(input: unknown): Promise<ActionResult<Data>> {
  const authContext = await getServerActionAuthContextOrNull()
  if (!authContext) {
    return { success: false, error: 'Authentication required' }
  }
  const { profile, team, supabase } = authContext
  // ...
}
```

#### Points de vigilance pour debugging

Si un bug d'authentification est trouvé, vérifier:

1. **Hooks client** - Les 4 hooks modifiés (`use-tenant-data.ts`, `use-contacts-data.ts`, `use-prestataire-data.ts`, `use-interventions.ts`)
2. **Server Actions** - Les 7 fichiers utilisant `getServerActionAuthContextOrNull()`
3. **Bug `.single()`** - Tester avec un utilisateur multi-profil (plusieurs équipes)
4. **Variable `supabase`** - Vérifier que `createBrowserSupabaseClient()` est appelé avant toute utilisation de `supabase`

**Design document:** `docs/plans/2026-01-31-auth-refactoring-design.md`

---

### 2026-01-30 - Finalization Modal z-index Fix

**Problème:** La modale de finalisation était invisible malgré un state React correct.

**Root cause:** CSS z-index manquant sur `.unified-modal__content` - la modale se rendait derrière l'overlay.

**Solution:**
```css
.unified-modal__overlay { z-index: 9998; }
.unified-modal__content { z-index: 9999; }
```

**Fichiers modifiés:**
- `app/globals.css` - z-index overlay/content
- `intervention-detail-client.tsx` - useEffect stabilisé avec ref
- `finalization-modal-live.tsx` - Imports Lucide fusionnés
- `unified-modal.tsx` - Cleanup

---

### 2026-01-30 - Accessibility WCAG AA + Card Refactoring

**Ce qui a été fait:**

**1. ApprovalModal Accessibility (WCAG 2.1 AA)**

| Amélioration | Avant | Après |
|--------------|-------|-------|
| Touch targets | `p-1.5` (24px) | `p-2.5` (40px) |
| Icônes décoratives | Lisibles par screen readers | `aria-hidden="true"` |
| Contraste | `text-slate-400` (~2.5:1) | `text-slate-500/600` (>4.5:1) |
| Focus states | Absents | `focus-visible:ring-2` |
| Loading state | Non annoncé | `role="status" aria-live="polite"` |

**2. InterventionCard Refactoring**

- **Renommage:** `PendingActionsCard` → `InterventionCard`
- **Fix sizing:** Retrait `h-full` (cards stretched) → hauteur auto CSS Grid
- **Suppression legacy:** `intervention-overview-card.tsx` (wrapper inutile)
- **Inline content:** overview-tab.tsx utilise directement les sous-composants

**Fichiers créés:**
- `components/dashboards/shared/intervention-card.tsx`

**Fichiers modifiés:**
- `components/intervention/modals/approval-modal.tsx` - A11y fixes
- `components/dashboards/shared/index.ts` - Export InterventionCard
- `components/interventions/interventions-list.tsx` - Fix h-full + rename import
- `app/gestionnaire/.../overview-tab.tsx` - Inline content
- `app/prestataire/.../overview-tab.tsx` - Inline content
- `lib/intervention-action-utils.ts` - "Modifier décision" → variant secondary

**Fichiers supprimés:**
- `components/dashboards/shared/pending-actions-card.tsx`
- `components/interventions/intervention-overview-card.tsx`

---

### 2026-01-30 - Performance Optimization + UX Intervention Tabs

**Ce qui a été fait:**

**1. Analyse Performance (4 agents parallèles)**

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Re-renders infinis | `useEffect` sans `[]` dans content-navigator.tsx | Ajout dependency array + garde NODE_ENV |
| CSP violations | Domaines manquants connect-src | Ajout vercel-scripts, lh3.googleusercontent, frill-prod |
| SW timeouts | Timeout 10s trop agressif | Augmenté à 30s + désactivé en dev |
| Double query | activity-logs faisait 2 requêtes COUNT | Query unique avec `count: 'exact'` |

**2. UX Intervention Tabs (Material Design)**

- Tabs: Icônes retirées (texte seul pour clarté)
- Responsive: Dropdown < 768px, Tabs horizontaux ≥ 768px
- Nouveau composant `ParticipantsRow` (chips horizontaux)
- Nouveau composant `ConversationSelector` (intégré dans Chat tab)

**Fichiers modifiés:**
- `components/content-navigator.tsx` - useEffect fix
- `next.config.js` - SW disabled en dev + CSP étendu
- `app/sw.ts` - Timeout 10s → 30s
- `app/api/activity-logs/route.ts` - Query unique avec count
- `components/interventions/shared/layout/intervention-tabs.tsx` - Responsive dropdown

**Fichiers créés:**
- `components/interventions/shared/layout/participants-row.tsx`
- `components/interventions/shared/layout/conversation-selector.tsx`

**Pattern documenté:** Service Worker en dev = source de problèmes CSP/cache → désactiver

---

### 2026-01-29 - Analyse Approfondie + Localisation Tab + Fix Dashboard Locataire

**Ce qui a ete fait:**

**1. Analyse Approfondie Application (6 agents parallèles)**

Verification complète de l'application avec agents spécialisés:

| Agent | Findings |
|-------|----------|
| Database | 44 tables, 6 views, 39 enums, 79 fonctions RLS |
| API | 113 routes, 10 domaines |
| Services | 32 services domain, 22 repositories |
| Pages | 87 pages, 5+ route groups |
| Components | 230+ composants, 22 directories |
| Hooks | 64 hooks, 17 server actions |

**2. Nouvel Onglet Localisation (Intervention Preview)**

- Créé `components/interventions/shared/tabs/localisation-tab.tsx`
- Carte Google Maps 400px en grand format
- Intégré pour les 3 rôles (gestionnaire, prestataire, locataire)
- Supprimé duplication carte dans autres onglets

**3. Fix Dashboard Locataire (Vue interventions vide)**

- Root cause: Migration `20260126120000` avait DROP la vue `interventions_active` sans la recréer
- Fix: Nouvelle migration `20260129210000_fix_recreate_interventions_active_view.sql`
- Pattern documenté: Modification enum PostgreSQL → DROP views → modify → RECREATE views

**Fichiers crees:**
- `components/interventions/shared/tabs/localisation-tab.tsx`
- `supabase/migrations/20260129210000_fix_recreate_interventions_active_view.sql`

**Memory Bank synchronisé** avec métriques correctes (44 tables, 64 hooks, 87 pages, etc.)

---

### 2026-01-29 (earlier) - Fix PostgREST Relations + Conversation Threads + Centralisation Adresses

**Ce qui a ete fait:**

**1. Fix PostgREST Relations RLS (Session 2)**

Probleme: La page contact edit retournait 404 car les relations PostgREST echouaient silencieusement.

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Page 404 silencieux | Relations PostgREST + RLS incompatibles | Requetes separees |
| Erreur non visible | Objet error Supabase vide dans logs | Logging ameliore |
| Code duplique | Meme pattern fetch dans 5 methodes | Helpers prives DRY |
| Performance listes | N+1 queries potentiel | Batch queries |

**Fichier refactore:** `lib/services/repositories/contact.repository.ts`
- Nouveaux helpers: `fetchCompanyWithAddress()`, `fetchTeam()`
- 5 methodes mises a jour avec `Promise.all` pour parallelisme
- `findByTeam()` optimise avec batch queries (3 requetes max au lieu de N)

**Pattern documente:** #18 "Separate Queries Pattern" dans systemPatterns.md

---

**2. Fix Conversation Threads Multi-Profil (Session 1 - MAJEUR)**

Probleme: Les threads de conversation etaient crees mais les participants n'etaient pas ajoutes correctement.

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Threads non crees | `createInitialConversationThreads` jamais appele | Ajoute dans `create-manager-intervention/route.ts` |
| CONFLICT error | Trigger + code ajoutent meme utilisateur | `upsert` avec `ignoreDuplicates` dans repository |
| Participants manquants | Threads crees APRES assignments | Deplace creation AVANT assignments |
| Migrations mal ordonnees | Timestamps avant migrations existantes | Renomme: 20260128 → 20260129200003+ |

**2. Migrations Conversations Appliquees (4 fichiers)**

- `20260129200003_fix_multi_profile_conversation_access.sql` - `can_view_conversation()` multi-profil
- `20260129200004_fix_missing_conversation_participants.sql` - Fix participants manquants
- `20260129200005_add_managers_to_conversation_participants.sql` - Trigger `thread_add_managers`
- `20260129200006_conversation_email_notifications.sql` - Notifications email

**3. Centralisation Adresses (3 migrations)**

Nouvelle architecture adresses avec support Google Maps:

- `20260129200000_create_addresses_table.sql` - Table centralisee + RLS
- `20260129200001_migrate_addresses_to_centralized_table.sql` - Migration donnees
- `20260129200002_drop_legacy_address_columns.sql` - Suppression colonnes legacy

**4. Nouveaux Services Adresses**

- `lib/services/domain/address.service.ts` - Service domain
- `lib/services/repositories/address.repository.ts` - Repository CRUD

**Fichiers modifies:**
- `app/api/create-manager-intervention/route.ts` - Thread creation AVANT assignments
- `lib/services/repositories/conversation-repository.ts` - Upsert participants
- 7 migrations SQL

**Pattern Documente:** Ordre creation intervention:
```
1. Create intervention
2. Create threads (AVANT assignments!)
3. Create assignments (trigger ajoute participants)
4. Create time slots
```

---

### 2026-01-28 - Nettoyage Logs Auth + Navigation Contact Preview + Fix Badge Messages

**Ce qui a ete fait:**

**1. Nettoyage Logs Auth Production-Ready**
- Suppression de ~113 logs `logger.info` de debug dans 6 fichiers auth
- Conservation de 31 logs `error/warn` critiques pour diagnostic
- Fichiers nettoyes: `auth-service.ts`, `use-auth.tsx`, `auth-dal.ts`, `auth-guard.tsx`, `callback/page.tsx`, `auth-router.ts`
- Imports inutilises (`logError`) retires

**2. Bouton Oeil Navigation Contact Preview**
- Ajout bouton Eye dans `participants-list.tsx` pour navigation vers fiche contact
- Clic sur card → conversation, Clic sur oeil → `/gestionnaire/contacts/details/[id]`
- Masque pour l'utilisateur connecte (meme comportement que bouton conversation)

**3. Fix Badge Messages Non-Lus Conversation**
- Correction du bug ou le badge n'apparaissait jamais sur "Discussion generale"
- Root cause: `page.tsx` ne calculait pas `unread_count` pour les threads
- Fix applique dans 3 pages: gestionnaire, locataire, prestataire

**Fichiers modifies:**
- `lib/auth-service.ts` - Nettoyage logs
- `hooks/use-auth.tsx` - Nettoyage logs
- `lib/auth-dal.ts` - Nettoyage logs
- `components/auth-guard.tsx` - Nettoyage logs
- `app/auth/callback/page.tsx` - Nettoyage logs
- `lib/auth-router.ts` - Nettoyage logs
- `components/interventions/shared/sidebar/participants-list.tsx` - Bouton oeil
- `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx` - Fix badge
- `app/locataire/(no-navbar)/interventions/[id]/page.tsx` - Fix badge
- `app/prestataire/(no-navbar)/interventions/[id]/page.tsx` - Fix badge

---

### 2026-01-27 - Integration Skills sp-* dans Ecosysteme Claude Code
**Ce qui a ete fait:**
- **Integration complete des 13 skills `superpowers:sp-*`** dans les fichiers de configuration Claude Code
- **Philosophie implementee:** "If a skill exists and 1% chance applies, invoke it."
- **Red Flags universels** definis pour declenchement automatique des skills
- **3 patterns d'orchestration** documentes (Creative Work, Bug Fix, Multi-Domain)

**Fichiers modifies (16 total):**
- `.claude/CLAUDE.md` - Section "Skills Auto-Invocation" avec matrice declenchement
- `.claude/agents/_base-template.md` - Section "Skills Integration" (herite par tous)
- `.claude/agents/ultrathink-orchestrator.md` - Section H "Skills Integration"
- `.claude/agents/seido-debugger.md` - Skills mapping
- `.claude/agents/tester.md` - TDD pattern principal
- `.claude/agents/frontend-developer.md` - Workflow frontend
- `.claude/agents/backend-developer.md` - Workflow backend
- `.claude/agents/ui-designer.md` - Workflow design
- `.claude/agents/refactoring-agent.md` - Workflow refactoring
- `.claude/agents/database-analyzer.md` - Skills section
- `.claude/agents/API-designer.md` - Workflow API
- `.claude/agents/researcher.md` - Skills section
- `.claude/agents/memory-synchronizer.md` - Skills section
- `.claude/rules/intervention-rules.md` - Skills interventions
- `.claude/rules/database-rules.md` - Skills database
- `.claude/rules/ui-rules.md` - Skills UI

**Impact:**
- Tous les agents heritent automatiquement des comportements skills via `_base-template.md`
- Process Skills (brainstorming/debugging) AVANT Implementation Skills
- Verification obligatoire avant tout commit

---

### 2026-01-27 - Verification Architecture Cards Intervention
**Ce qui a ete fait:**
- **Verification architecture cascade** pour les pages de details
  - Confirmation que TOUTES les pages utilisent `InterventionsNavigator`
  - Chaîne: `InterventionsNavigator` → `InterventionsViewContainer` → `InterventionsList` → `PendingActionsCard`
  - Pages verifiees: Immeubles, Lots, Contrats, Contacts
- **Aucune modification code** - architecture deja correcte
- **Documentation pattern** "Component Cascade Architecture" ajoute a `systemPatterns.md`

**Resultat:**
- ✅ L'unification des cards (`PendingActionsCard` au lieu de `ManagerInterventionCard`) cascade automatiquement vers TOUTES les pages de details

**Pattern documente:**
- Nouveau pattern #14 dans `systemPatterns.md`: "Interventions Display Cascade Architecture"

### 2026-01-26 - Migration Devis + Pagination + Bugfixes
**Ce qui a ete fait:**
- **Pagination vue liste interventions** (Session 2)
  - Nouveau hook reutilisable `hooks/use-pagination.ts`
  - Nouveau composant `intervention-pagination.tsx` avec labels francais
  - Integration dans `dashboard-interventions-section.tsx`
  - Reset automatique page 1 sur changement filtres
  - 10 elements par page, responsive (mobile: "3 / 9")
- **Migration workflow devis** (Session 1)
  - Le statut des devis est maintenant derive de `intervention_quotes` (independant du workflow)
  - `requires_quote: boolean` sur interventions determine si devis requis
  - Nouveau composant `QuoteStatusBadge` pour affichage visuel
  - Migration SQL `20260126120000_remove_demande_de_devis_status.sql`
- **Bugfix UX: Affichage nombre reponses en attente**
  - `pending-actions-card.tsx` - Utilise `getPendingResponderNames()` pour compter les reponses pending
  - Affiche "En attente de X reponse(s)" au lieu du message generique
  - Pluralisation correcte en francais

**Fichiers crees (Session 2):**
- `hooks/use-pagination.ts` (~140 lignes)
- `components/interventions/intervention-pagination.tsx` (~175 lignes)

**Fichiers modifies (Session 2):**
- `components/dashboards/shared/dashboard-interventions-section.tsx` (imports + hook + render)

**Fichiers crees (Session 1):**
- `components/interventions/quote-status-badge.tsx`
- `lib/utils/quote-status.ts`
- `lib/intervention-action-utils.ts`
- `supabase/migrations/20260126120000_remove_demande_de_devis_status.sql`

**Fichiers modifies (Session 1):**
- `components/dashboards/shared/pending-actions-card.tsx` (import + logique lignes 117-124)
- `app/api/create-manager-intervention/route.ts`
- `app/api/intervention/[id]/status/route.ts`
- `hooks/use-intervention-workflow.ts`
- `components/interventions/intervention-create-form.tsx`
- `components/dashboards/manager/manager-dashboard-v2.tsx`

### 2026-01-25 - Intervention Types Dynamiques + Confirmation Participant
**Ce qui a été fait:**
- **Types d'intervention dynamiques complets**
  - Migration `20260125000000_add_revision_charges_type.sql` - Ajout type manquant
  - Interface admin `/admin/intervention-types` - CRUD complet avec accordéon par catégorie
  - Navigation admin mise à jour avec lien "Types intervention"
  - TYPE_CONFIG enrichi avec `revision_charges`
  - 37 types dans 3 catégories (bien, bail, locataire)
- **Fix statut intervention avec confirmation requise**
  - `create-manager-intervention/route.ts` - CAS 2 avec `!requiresParticipantConfirmation`
  - `create-manager-intervention/route.ts` - Time slot `status`/`selected_by_manager` conditionnels
  - `intervention-confirm-participation/route.ts` - Vérification tous confirmés + auto-update
  - Flow: `planification` + slot `pending` → tous confirment → `planifiee` + slot `selected`
- **Suppression Logs DEBUG** (84+ lignes)
  - `create-manager-intervention/route.ts` - 1 log DEBUG verbeux
  - `availability-response/route.ts` - 18 logs DEBUG supprimés
  - `assignment-section-v2.tsx` - 4 console.log supprimés
  - `intervention-create-form.tsx` - Code commenté (22 lignes)
- **Migration `is_selected` → `status`** (pattern moderne)
  - 4 fichiers API routes migrés
  - 1 fichier service migré
  - Pattern: `is_selected: true` → `status: 'selected'`
  - Pattern: `.eq('is_selected', false)` → `.neq('status', 'selected')`

**Fichiers modifiés:**
- `app/api/create-manager-intervention/route.ts`
- `app/api/intervention/[id]/availability-response/route.ts`
- `app/api/intervention/[id]/select-slot/route.ts`
- `app/api/intervention-schedule/route.ts`
- `lib/services/domain/email-notification/data-enricher.ts`
- `components/intervention/assignment-section-v2.tsx`
- `components/interventions/intervention-create-form.tsx`

### 2026-01-25 - Dashboard Redesign + Intervention Flow Audit
**Ce qui a été fait:**
- **Redesign Progress Tracker Dashboard**
  - Intégration progression dans KPI card "En cours" (au lieu de section séparée)
  - Nouveau composant `progress-mini.tsx` (~80 lignes)
  - Suppression `progress-tracker.tsx` (261 lignes → 0)
  - Gain d'espace: ~70px verticalement sur le dashboard
- **PWA Push Notifications** complètement implémentées
  - Table `push_subscriptions` pour stocker les subscriptions
  - Service `lib/send-push-notification.ts` utilisant web-push
- **Email Reply Sync** amélioré
  - Quote stripping plus robuste
  - Threading automatique des réponses email → conversations

**Commits:**
- `9b11d08` feat(notification): Implement push notifications
- `1d83ff3` refactor(chat): Simplify message bubble layout
- `8669422` refactor(email): Improve email quote stripping
- `cdc216e` feat(email): Sync email replies to threads
- `3febddf` feat(email): Enhanced email content display

### 2026-01-23 - Optimisation Ecosysteme .claude/
**Ce qui a ete fait:**
- **Refactoring complet** de l'ecosysteme .claude/ pour reduire la duplication
- **CLAUDE.md** reduit de 1,163 → 269 lignes (**-77%**)
- **Nouveau template partage** `_base-template.md` cree (106 lignes)
- **10 agents optimises** de 3,395 → 1,386 lignes (**-56%**)
- **Reduction totale** de ~8,843 → ~3,363 lignes (**-62%**)

**Principes appliques:**
- Single Source of Truth: Memory Bank = documentation, CLAUDE.md = regles
- Template inheritance: Agents heritent de `_base-template.md`
- References > Duplication: Pointe vers Memory Bank au lieu de copier

**Fichiers crees:**
- `.claude/agents/_base-template.md` (NOUVEAU)

**Fichiers modifies:**
- `.claude/CLAUDE.md`
- Tous les 10 agents dans `.claude/agents/`

**Impact:**
- ~6,000 tokens economises par session
- Maintenance simplifiee (1 template au lieu de 10)
- Duplication eliminee (<5% vs ~30% avant)

### 2026-01-23 - Audit Email Notifications + Preview Page (plus tot)
**Ce qui a ete fait:**
- **Audit complet** du systeme de notifications email
- **Correction page Email Preview** (`/emails/preview`)
  - 6 templates corriges (props incorrects)
  - 5 nouveaux scenarios ajoutes (interactif, avec devis)
- **Verification service email-notification.service.ts**
  - Tous les batch functions utilisent les bons props
  - Coherence confirmee avec `emails/utils/types.ts`

### 2026-01-22 - Audit Complet + Synchronisation Memory Bank
**Ce qui a ete fait:**
- **Audit complet** de l'infrastructure SEIDO par agents specialises
- **Synchronisation Memory Bank** avec etat reel (100% a jour)
- **Nettoyage dette technique** : suppression composant v2 obsolete

**Ecarts corriges:**
- Tables: 37 → **38** (+ email_links)
- Enums: 36 → **39**
- Repositories: 20 → **21** (+ email-link)
- Services: 27 → **31** (+ 4 services email)
- API Routes: 97 → **113**
- Composants: 270+ → **369**
- Vues: 4 → **6**

### 2026-01-22 - Memory Bank Implementation
**Ce qui a ete fait:**
- Phase 1: Infrastructure Auto-Update (hooks, scripts)
- Phase 2: Memory Bank Core (6 fichiers)
- Scripts: track-changes.js, update-active-context.js, check-memory-drift.js
- Configuration hooks dans settings.local.json

## Dette Technique Connue
- 15 fichiers utilisent encore le singleton notification legacy
- Certains composants pourraient migrer vers Server Components
- ✅ PROJECT_INDEX.json - **Genere et synchronise**
- ✅ Version variants nettoyes - **1 fichier supprime**
- ✅ Ecosysteme .claude/ optimise - **62% reduction** (2026-01-23)

## Metriques Projet (2026-02-09)

| Metrique | Valeur |
|----------|--------|
| Repositories | **22** |
| Domain Services | **32** |
| API Routes | **113** (10 domaines) |
| Hooks | **66** (+2: useDebounce, usePrefetch) |
| Components | **361** |
| Pages | **87** (5+ route groups) |
| DB Tables | **44** |
| DB Enums | 39 |
| DB Functions | **79** |
| Migrations | **156** (+1: fix_trigger_individual_threads) |
| Server Actions | **17** files |
| Notification Actions | **20** |
| Supabase Client Types | **4** (browser, server, serverAction, serviceRole) |
| **AGENTS.md Learnings** | **26** (+5 since V2) |
| **systemPatterns.md Patterns** | **29** |

### Metriques Ecosysteme .claude/ (2026-01-23)

| Categorie | Lignes |
|-----------|--------|
| CLAUDE.md | 269 |
| Agents (11 fichiers) | 1,492 |
| Memory Bank (6 fichiers) | 798 |
| Rules (3 fichiers) | 347 |
| **Total** | ~3,363 |

## Historique des Decisions Techniques

| Date | Decision | Raison | Impact |
|------|----------|--------|--------|
| 2025-10 | getServerAuthContext() | Centralisation auth | 21 pages migrees |
| 2025-11 | Server Actions notifications | Next.js 15 compliance | 12 fichiers migres |
| 2025-11 | RealtimeProvider | Single channel pattern | Performance +10x |
| 2025-12 | Magic links emails | Auto-login CTA | Meilleure UX |
| 2026-01 | Memory Bank | Optimisation contexte | Documentation vivante |
| 2026-01 | Gmail OAuth | Email conversation threading | Sync bidirectionnelle |
| 2026-01 | Audit + Sync Memory Bank | 100% documentation a jour | Metriques precises |
| 2026-01 | Props Email Standardises | Coherence templates ↔ service | Preview fiable |
| 2026-01-23 | Optimisation .claude/ | Reduction duplication | -62% lignes, -6000 tokens/session |
| 2026-01-25 | PWA Push Notifications | Notifications temps reel mobile | 4 canaux complets |
| 2026-01-26 | Migration workflow devis | Suppression statut redondant | 10 → 9 statuts, meilleure separation concerns |
| 2026-01-26 | Pagination client-side | Donnees deja chargees + UX instantanee | Hook reutilisable + pattern documente |
| 2026-01-27 | Integration Skills sp-* | Garantir code sans erreur via invocation automatique | 16 fichiers .claude/ modifies, Red Flags universels |
| 2026-01-28 | Nettoyage Logs Auth | Production-ready, moins de bruit console | ~113 logs supprimes, 31 conserves (errors/warns) |
| **2026-01-28** | **Centralisation Adresses** | **Table unique + Google Maps ready** | **Table addresses + migration donnees existantes** |
| **2026-01-29** | **Thread creation order** | **Participants non ajoutes si threads apres assignments** | **Ordre: intervention → threads → assignments → slots** |
| **2026-01-29** | **Trigger thread_add_managers** | **Managers pas explicitement participants** | **Auto-ajout managers a tous les threads intervention** |
| **2026-01-30** | **SW disabled in dev** | **Timeouts CSP bloquaient l'app** | **Dev fluide, SW actif en prod uniquement** |
| **2026-01-30** | **CSP connect-src exhaustif** | **SW intercepte tous fetch** | **Tous domaines dans connect-src, pas juste img-src/font-src** |
| **2026-01-31** | **Auth Refactoring Complet** | **Appels auth redondants, bug multi-profil** | **14 fichiers refactorisés, ~250 lignes supprimées, nouveau helper centralisé** |
| **2026-01-31** | **Auth API Optimization** | **250+ appels API en 10 min** | **getSession() local au lieu de getUser() réseau, cache() sur supabase client** |
| **2026-02-01** | **Filtrage auth_id Invités** | **Contacts sans compte recevaient conversations/notifs** | **Filtre .not('auth_id', 'is', null) à tous les points d'entrée** |
| **2026-02-02** | **PWA Notification Prompt** | **Maximiser activation notifications PWA** | **Modale rappel + guide paramètres par plateforme** |
| **2026-02-02** | **Quote Notifications Multi-Canal** | **Gaps notifications devis** | **4 nouvelles actions, sendRoleAwarePushNotifications()** |
| **2026-02-02** | **Push Subscription Security** | **RLS silent block + client userId** | **userProfile.id + null data check** |
| **2026-02-03** | **Simplification "Approuvée"** | **UX plus claire, moins de boutons** | **Un seul bouton "Planifier", message simplifié** |
| **2026-02-03** | **ContactSelector dans Modal** | **Mockups → vrais composants** | **Pattern `hideUI={true}` + `ref.openContactModal()`** |
| **2026-02-04** | **Fix ensureInterventionConversationThreads** | **Bug deleted_at fantôme + gap participants group** | **Fonction débloquée, participants ajoutés aux group threads existants** |
| **2026-02-08** | **Performance Navigation Optimization V2** | **Perfs listes + pages detail + Next.js 15 patterns** | **17 stories, 90 fichiers, 4 learnings AGENTS.md, 2 patterns systemPatterns.md** |
| **2026-02-09** | **Planning Button Consolidation** | **2 boutons → 1, ProgrammingModal pre-fill** | **2 fichiers, manage_planning ActionType** |
| **2026-02-09** | **Conversation Thread Fix** | **Trigger auth_user_id guard + participant indicator** | **4 stories, 3 learnings AGENTS.md, migration repair workflow** |

---
*Derniere mise a jour: 2026-02-09*
*Session: Conversation Thread Fix + Planning Button COMPLETE + COMPOUNDED*
