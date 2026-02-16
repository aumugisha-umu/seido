# SEIDO Progress Log

## Milestones Completes

### Phase 1: Core Architecture ✅
- Users, Teams, Companies, Invitations
- Repository Pattern implementation
- 19 repositories crees

### Phase 2: Property Management ✅
- Buildings, Lots, Property Documents
- RLS policies multi-tenant

### Phase 3: Interventions ✅
- Workflow 9 statuts
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
- [x] **Voice Recorder + Documents + Reports Card** (2026-02-12) - Upload audio, signed URLs, composant reports partagé
- [ ] **Intervention Workflow Polish** (2026-02-16) - 7 themes, 40 files: demande_de_devis→requires_quote, approved→accepted, finalization API, quote form simplification, details card enrichi, dashboard simplification, quote modals

## Sprint Actuel (Jan-Feb 2026)

### 2026-02-12 - Voice Recorder + Documents Management + Reports Display

**Session: File Upload Improvements + Reports Card**

Améliorations complètes de l'upload de fichiers audio et de l'affichage des rapports de clôture :

| Feature | Description |
|---------|-------------|
| **Fix fileName audio** | Nomenclature "Rapport audio - [titre intervention]" |
| **Fix mediaFiles upload** | FormData pour File objects (JSON.stringify les supprimait) |
| **Fix documents preview** | Signed URLs via createBrowserSupabaseClient (prestataire, locataire) |
| **ReportsCard component** | Composant shared affichant les 3 rapports de clôture (provider, tenant, manager) |
| **Data fetching** | Fetch intervention_reports dans les 3 page.tsx |

**Fichiers créés (1):**
- `components/interventions/shared/cards/reports-card.tsx` (165 lignes)

**Fichiers modifiés (13):**
- Hooks: use-audio-recorder.ts
- Components: voice-recorder.tsx, simple-work-completion-modal.tsx, intervention-action-buttons.tsx
- Cards: reports-card.tsx (NEW), documents-card.tsx, index.ts
- Pages: 3 x page.tsx (gestionnaire, prestataire, locataire)
- Detail clients: 3 x intervention-detail-client.tsx
- Knowledge base: AGENTS.md (+3 learnings), progress.txt

**Learnings ajoutés:** AGENTS.md #030-#032
**Retrospective:** `docs/learnings/2026-02-12-voice-recorder-documents-reports-retrospective.md`

---

### 2026-02-11 - Security & RLS Policy Consolidation

**Session: Fix Supabase Linter Warnings — 4 Migrations**

Applied 4 migrations to fix security issues and consolidate overlapping RLS policies:

| Migration | Description |
|-----------|-------------|
| `20260211140000` | Performance advisor fixes (reverted) |
| `20260211150000` | Revert all (rollback) |
| `20260211160000` | Re-apply: search_path='public' on 52 functions, SECURITY INVOKER on 6 views, InitPlan caching on 18 policies |
| `20260211170000` | Fix ~53 `multiple_permissive_policies` warnings across 13 tables |

**Policy Consolidation (migration 170000):**

| Group | Action | Tables |
|-------|--------|--------|
| A | Updated 3 helper functions (proprietaire + contract-based locataire), dropped 7 redundant SELECT policies | buildings, lots, interventions |
| B | Replaced 4 FOR ALL with individual action policies | intervention_type_*, import_jobs |
| C | Merged 8 overlapping UPDATE into 4 (soft-delete pattern) | documents, quotes, reports, interventions |
| D | Merged/dropped overlapping SELECT/INSERT/UPDATE policies | quotes, emails, email_attachments, users |

**Net result:** 27 policies dropped, 17 created = 10 fewer policies. Zero remaining duplicates.

**Key learning:** `pg_policies.roles` is `name[]` not `text[]` — must cast `::text[]` when using `@>` operator.

---

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

## Dette Technique Connue
- 15 fichiers utilisent encore le singleton notification legacy
- Certains composants pourraient migrer vers Server Components
- ✅ PROJECT_INDEX.json - **Genere et synchronise**
- ✅ Version variants nettoyes - **1 fichier supprime**
- ✅ Ecosysteme .claude/ optimise - **62% reduction** (2026-01-23)

## Metriques Projet (2026-02-12)

| Metrique | Valeur |
|----------|--------|
| Repositories | **19** |
| Domain Services | **33** (+1: scheduling-service) |
| API Routes | **114** (10 domaines) |
| Hooks | **68** (+2: useDebounce, usePrefetch) |
| Components | **362** |
| Pages | **87** (5+ route groups) |
| DB Tables | **44** |
| DB Enums | 39 |
| DB Functions | **79** |
| Migrations | **165** (+5: security fixes, policy consolidation, voice note support) |
| Server Actions | **17** files |
| Notification Actions | **20** |
| Supabase Client Types | **4** (browser, server, serverAction, serviceRole) |
| **AGENTS.md Learnings** | **38** (+6: time slot status, flag-based quotes, accepted enum, separate queries, finalization fix) |
| **systemPatterns.md Patterns** | **29** |
| **Shared Cards** | **15** (documents, reports, comments, conversation, quotes, planning, summary, intervention-details) |
| **Quote Status Enum (DB)** | **7** (draft, pending, sent, accepted, rejected, expired, cancelled) |

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
| **2026-02-11** | **Security Consolidation RLS** | **53 linter warnings, overlapping policies** | **4 migrations, 27 policies dropped, helpers expanded (proprietaire+contracts)** |
| **2026-02-12** | **Voice Recorder + Documents + Reports** | **Upload audio, preview docs, affichage rapports** | **13 fichiers, composant ReportsCard shared, 3 learnings AGENTS.md** |
| **2026-02-16** | **Intervention Workflow Polish** | **7 themes: demande_de_devis removal, approved→accepted, finalization API, quote form, details card, dashboards, quote modals** | **40 fichiers, -500 lignes net, 4 learnings AGENTS.md (#035-#038)** |

---
*Derniere mise a jour: 2026-02-16*
*Session: Intervention Workflow Polish — 7 themes, 40 files, comprehensive knowledge base update*
