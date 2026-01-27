# SEIDO Active Context

## Focus Actuel
**Objectif:** Navigation Contact Preview + Fix Badge Messages Non-Lus
**Branch:** `preview`
**Sprint:** Multi-Team Support (Jan 2026)

---

## 🔴 BUG ACTIF: Badge Messages Non-Lus N'Apparaît Pas (2026-01-27)

### Root Cause Identifié ✅

**Problème:** Le badge de messages non-lus sur "Discussion générale" n'apparaît jamais.

**Analyse Systematic Debugging (Phase 1 complète):**

| Couche | Statut | Détail |
|--------|--------|--------|
| **UI Component** | ✅ OK | `GroupConversationButton` reçoit `unreadCount` prop et l'affiche correctement |
| **Client Component** | ✅ OK | `intervention-detail-client.tsx:616-624` calcule `unreadCounts` depuis `threads.unread_count` |
| **Backend Service** | ✅ OK | `conversation-service.ts:138-143` ajoute `unread_count` via `getThreadUnreadCount()` |
| **Page Server** | ❌ **BUG** | `page.tsx:119-180` récupère threads sans `unread_count` |

### Flux de Données Tracé

```
1. page.tsx (Server) → Supabase direct query
   ├── SELECT * FROM conversation_threads WHERE intervention_id = id
   ├── Enrichit avec last_message ✅
   └── N'ajoute PAS unread_count ❌ ← ROOT CAUSE

2. intervention-detail-client.tsx (Client)
   └── useMemo calcule unreadCounts depuis threads.unread_count
       └── threads.unread_count est TOUJOURS undefined → counts = {}

3. ParticipantsList → GroupConversationButton
   └── unreadCount = unreadCounts['group'] || 0 = 0 (toujours)
```

### Code Problématique

**Fichier:** `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx`
**Lignes:** 119-180

```typescript
// ACTUELLEMENT (BUG):
const { data: threads } = await supabase
  .from('conversation_threads')
  .select('*')  // ← Ne contient PAS unread_count
  .eq('intervention_id', id)

// Enrichit avec last_message mais PAS unread_count
return {
  data: threads.map(t => ({
    ...t,
    last_message: lastMessageByThread[t.id] ? [lastMessageByThread[t.id]] : []
    // ← manque: unread_count
  }))
}
```

### Solution Requise

**Ajouter calcul `unread_count` dans page.tsx (lignes ~155-179)**

Pour chaque thread, calculer le nombre de messages non lus via:
1. Récupérer `conversation_participants.last_read_message_id` pour l'utilisateur
2. Si null → tous les messages sont non lus
3. Sinon → compter messages avec `created_at > last_read.created_at`

### Fichiers à Modifier

| Fichier | Action |
|---------|--------|
| `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx` | Ajouter calcul `unread_count` lignes 171-179 |
| `app/locataire/(no-navbar)/interventions/[id]/page.tsx` | Vérifier si même problème |
| `app/prestataire/(no-navbar)/interventions/[id]/page.tsx` | Vérifier si même problème |

### Vérification Après Fix

1. Ouvrir une intervention avec messages dans "Discussion générale"
2. Vérifier que le badge rouge apparaît avec le bon compte
3. Ouvrir la conversation → badge doit disparaître (markAsRead automatique)
4. Nouveau message depuis autre utilisateur → badge réapparaît

**STATUS:** ✅ **CORRIGÉ** (2026-01-27)
- Fix appliqué dans les 3 pages (gestionnaire, locataire, prestataire)
- Calcul `unread_count` ajouté pour chaque thread dans les pages server components

---

## Flow des Interventions - Vue Complete (Mis a jour 2026-01-26)

### Statuts (9 actifs - mise a jour)

```
demande -> rejetee (terminal)
        -> approuvee -> planification -> planifiee
                                              |
                                    cloturee_par_prestataire
                                              |
                                    cloturee_par_locataire
                                              |
                                    cloturee_par_gestionnaire (terminal)
        -> annulee (terminal - possible a chaque etape)
```

**IMPORTANT (2026-01-26):** Le statut `demande_de_devis` a ete SUPPRIME.
Les devis sont maintenant geres independamment via:
- `requires_quote: boolean` dans la table `interventions`
- `intervention_quotes` table avec statuts propres (pending, sent, accepted, rejected)
- `QuoteStatusBadge` composant pour affichage visuel

### Transitions Autorisees (Mise a jour 2026-01-26)

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

### Fichiers Cles par Phase

#### Phase 1: Creation & Approbation

| Fichier | Description |
|---------|-------------|
| `app/gestionnaire/(no-navbar)/interventions/nouvelle-intervention/` | Page creation gestionnaire |
| `app/locataire/(no-navbar)/interventions/nouvelle-demande/` | Page creation locataire |
| `app/actions/intervention-actions.ts` | Server Actions (~3000+ lignes) |
| `lib/services/domain/intervention-service.ts` | Service metier |
| `lib/services/repositories/intervention.repository.ts` | Repository + validations |
| `app/api/intervention-approve/route.ts` | API approbation |
| `app/api/intervention-reject/route.ts` | API rejet |

#### Phase 2: Devis & Planification

| Fichier | Description |
|---------|-------------|
| `app/api/intervention-quote-request/route.ts` | Demande de devis (310 lignes) |
| `app/api/intervention-quote-submit/route.ts` | Soumission devis prestataire |
| `app/api/intervention/[id]/quotes/[quoteId]/approve/route.ts` | Approbation devis |
| `app/api/intervention/[id]/quotes/[quoteId]/reject/route.ts` | Rejet devis |
| `app/api/intervention-schedule/route.ts` | Planification (481 lignes) |
| `app/api/intervention/[id]/select-slot/route.ts` | Confirmation creneau |

#### Phase 3: Execution & Cloture

| Fichier | Description |
|---------|-------------|
| `app/api/intervention/[id]/work-completion/route.ts` | Fin travaux prestataire |
| `app/api/intervention-validate-tenant/route.ts` | Validation locataire |
| `app/api/intervention/[id]/manager-finalization/route.ts` | Finalisation gestionnaire |

### Pages de Detail

| Role | Page |
|------|------|
| Gestionnaire | `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx` |
| Prestataire | `app/prestataire/(no-navbar)/interventions/[id]/page.tsx` |
| Locataire | `app/locataire/(no-navbar)/interventions/[id]/page.tsx` |

### Composants UI Principaux

```
components/interventions/
-- intervention-create-form.tsx       # Formulaire creation (gestionnaire)
-- intervention-request-form.tsx      # Formulaire demande (locataire)
-- intervention-overview-card.tsx     # Card resume
-- intervention-progress-card.tsx     # Progression
-- intervention-chat-tab.tsx          # Onglet chat
-- intervention-comments-card.tsx     # Commentaires
-- quote-status-badge.tsx             # Badge statut devis (NOUVEAU 2026-01-26)

components/intervention/
-- intervention-detail-header.tsx     # Header page detail
-- intervention-detail-tabs.tsx       # Navigation onglets
-- intervention-action-buttons.tsx    # Boutons d'action contextuels
-- intervention-action-panel-header.tsx
-- intervention-cancel-button.tsx
```

### Hooks Intervention

| Hook | Usage |
|------|-------|
| `use-intervention-workflow.ts` | Gestion workflow + optimistic updates (MODIFIE 2026-01-26) |
| `use-intervention-types.ts` | Types d'intervention dynamiques |
| `use-intervention-approval.ts` | Approbation/rejet |
| `use-intervention-quoting.ts` | Gestion devis |
| `use-intervention-planning.ts` | Planification creneaux |
| `use-intervention-execution.ts` | Execution travaux |
| `use-intervention-finalization.ts` | Finalisation |
| `use-realtime-interventions.ts` | Sync temps reel |

### Tables Supabase

| Table | Colonnes cles |
|-------|---------------|
| `interventions` | id, lot_id, building_id, team_id, status, title, type, urgency, created_by, **requires_quote** |
| `intervention_assignments` | intervention_id, user_id, role, is_primary |
| `intervention_quotes` | intervention_id, provider_id, **status (pending/sent/accepted/rejected)**, amount |
| `intervention_time_slots` | intervention_id, slot_date, start_time, end_time, status |
| `intervention_comments` | intervention_id, user_id, content, comment_type |
| `intervention_documents` | intervention_id, filename, document_type, uploaded_by |

### Notifications Intervention

**Server Actions:** `app/actions/notification-actions.ts`
- `createInterventionNotification()`
- `notifyInterventionStatusChange()`
- `notifyInterventionAssignment()`

**Email Templates:**
- `intervention-created.tsx`
- `intervention-approved.tsx` / `intervention-rejected.tsx`
- `intervention-assigned-prestataire.tsx` / `intervention-assigned-locataire.tsx`
- `intervention-scheduled.tsx`
- `intervention-completed.tsx`
- `time-slots-proposed.tsx`

---

## Travail Complete Aujourd'hui (2026-01-27)

### Ajout Bouton Œil Navigation Contact Preview (NOUVEAU)

**Contexte:** Ajout d'un bouton "œil" à droite de la bulle de conversation dans la liste des participants pour permettre la navigation vers la fiche contact preview.

**Fichier modifié:** `components/interventions/shared/sidebar/participants-list.tsx`

**Modifications apportées:**

1. **Imports ajoutés:**
   - `Eye` depuis `lucide-react`
   - `useRouter` depuis `next/navigation`

2. **Structure card participant modifiée:**
   - La card (avatar + nom) est maintenant cliquable et navigue vers la conversation
   - Les boutons (bulle et œil) sont dans un conteneur séparé à droite

3. **Bouton œil ajouté:**
   - Placé à droite du bouton de conversation (MessageSquare)
   - Navigation vers `/gestionnaire/contacts/details/${participant.id}`
   - Utilise `router.push()` avec `e.stopPropagation()`

4. **Gestion des événements:**
   - `stopPropagation()` sur les boutons pour éviter de déclencher le clic sur la card
   - Le clic sur la card déclenche la navigation vers la conversation
   - Le clic sur la bulle déclenche la navigation vers la conversation
   - Le clic sur le bouton œil déclenche la navigation vers la fiche contact preview

5. **Masquage pour utilisateur connecté:**
   - Le bouton œil est masqué si `participant.id === currentUserId` (même condition que le bouton conversation)

6. **Discussion générale:**
   - Le composant `GroupConversationButton` n'a pas de bouton œil (correct, car ce n'est pas un contact individuel)

**Comportement final:**
- Clic sur card (avatar + nom) → navigation vers conversation (onglet conversations)
- Clic sur bulle de conversation → navigation vers conversation (onglet conversations)
- Clic sur bouton œil → navigation vers `/gestionnaire/contacts/details/[id]`

**Validation:** ESLint OK, aucune erreur détectée.

---

### Fix Badge Messages Non-Lus Conversation (NOUVEAU)

**Contexte:** Correction du bug où le badge de messages non-lus n'apparaissait jamais sur "Discussion générale".

**Fichiers modifiés (3 total):**
- `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx`
- `app/locataire/(no-navbar)/interventions/[id]/page.tsx`
- `app/prestataire/(no-navbar)/interventions/[id]/page.tsx`

**Solution implémentée:**
- Ajout du calcul de `unread_count` pour chaque thread dans les pages server components
- Logique identique à `conversation-service.ts:1151-1193` (`getThreadUnreadCount`)
- Pour chaque thread: récupère `last_read_message_id`, compte les messages non lus

**Validation:** ESLint OK, badge fonctionne correctement.

---

### Nettoyage Logs Auth Production-Ready

**Contexte:** Les fichiers d'authentification contenaient ~80+ logs `logger.info` de debug verbeux qui polluaient la console en production. L'authentification fonctionnant correctement, ces logs n'etaient plus necessaires.

**Fichiers nettoyes (6 total):**

| Fichier | Logs supprimes | Logs conserves |
|---------|----------------|----------------|
| `lib/auth-service.ts` | ~40 | 13 (errors/warns) |
| `hooks/use-auth.tsx` | ~30 | 6 (errors) |
| `lib/auth-dal.ts` | ~15 | 6 (errors) |
| `app/auth/callback/page.tsx` | ~15 | 5 (errors/warns) |
| `components/auth-guard.tsx` | ~10 | 0 |
| `lib/auth-router.ts` | 3 | 1 (warn) |
| **Total** | **~113** | **31** |

**Patterns de logs supprimes:**
- `[AUTH-SERVICE-REFACTORED]` - logs de debug service
- `[AUTH-STATE-CHANGE-*]` - logs transitions auth
- `[AUTH-PROVIDER-REFACTORED]` - logs provider client
- `[AUTH-DAL]` / `[AUTH-DAL-DEBUG]` - logs DAL server
- `[AUTH-GUARD]` - logs grace period
- `[AUTH-CALLBACK]` - logs callback verbose
- `[RESET-PASSWORD-SERVICE]` - logs reset password
- `[AUTH-ROUTER]` - logs routing

**Logs conserves (critiques pour diagnostic):**
- `logger.error()` - erreurs critiques (auth failed, profile query failed, etc.)
- `logger.warn()` - avertissements importants (invitation failed, unknown role, etc.)

**Autres modifications:**
- Import `logError` retire des fichiers ou inutilise
- `logRoutingDecision()` transforme en stub (commentaire expliquant comment reactiver)
- Correction bug: `_email` -> `email` dans `resetPassword()` et `resendConfirmation()`

**Validation:** ESLint OK, aucune nouvelle erreur dans les fichiers modifies.

---

### Integration Skills sp-* dans Ecosysteme Claude Code (NOUVEAU)

**Contexte:** Integration complete des 13 skills `superpowers:sp-*` dans les fichiers de configuration Claude Code pour garantir du code sans erreur via une invocation automatique basee sur des "Red Flags" (pensees declencheuses).

**Philosophie:** "If a skill exists and there's 1% chance it applies, invoke it."

**Fichiers modifies (13 total):**

| Categorie | Fichier | Modification |
|-----------|---------|--------------|
| Principal | `.claude/CLAUDE.md` | + Section "Skills Auto-Invocation" avec matrice declenchement |
| Template | `.claude/agents/_base-template.md` | + Section "Skills Integration" avec Red Flags universels |
| Orchestrator | `.claude/agents/ultrathink-orchestrator.md` | + Section H "Skills Integration" avec workflow |
| Debugger | `.claude/agents/seido-debugger.md` | + Skills (sp-systematic-debugging = workflow principal) |
| Tester | `.claude/agents/tester.md` | + Skills (sp-test-driven-development = pattern principal) |
| Frontend | `.claude/agents/frontend-developer.md` | + Skills avec workflow frontend |
| Backend | `.claude/agents/backend-developer.md` | + Skills avec workflow backend |
| UI Designer | `.claude/agents/ui-designer.md` | + Skills avec workflow design |
| Refactoring | `.claude/agents/refactoring-agent.md` | + Skills avec workflow refactoring |
| DB Analyzer | `.claude/agents/database-analyzer.md` | + Skills section |
| API Designer | `.claude/agents/API-designer.md` | + Skills avec workflow API |
| Researcher | `.claude/agents/researcher.md` | + Skills section |
| Memory Sync | `.claude/agents/memory-synchronizer.md` | + Skills section |
| Rules | `.claude/rules/*.md` (3 fichiers) | + Skills specifiques par domaine |

**Patterns d'orchestration documentes:**

1. **Chain: Creative Work**
   ```
   sp-brainstorming → sp-writing-plans → sp-test-driven-development → [impl] → sp-verification-before-completion → sp-requesting-code-review
   ```

2. **Chain: Bug Fix**
   ```
   sp-systematic-debugging → sp-test-driven-development (failing test) → [fix] → sp-verification-before-completion
   ```

3. **Chain: Multi-Domain**
   ```
   sp-brainstorming → sp-writing-plans → sp-dispatching-parallel-agents → [agents use sp-tdd] → sp-verification-before-completion
   ```

**Red Flags universels implementes:**

| Pensee | Skill a Invoquer |
|--------|------------------|
| "Je vais creer/ajouter/modifier..." | `sp-brainstorming` |
| "Ca ne marche pas / bug / erreur..." | `sp-systematic-debugging` |
| "Je vais implementer..." | `sp-test-driven-development` |
| "C'est fait / fini / pret..." | `sp-verification-before-completion` |

**Impact:** Tous les agents SEIDO heritent maintenant automatiquement des comportements skills via `_base-template.md`.

---

### Adaptation Messages UI Magic Link Multi-Equipe (NOUVEAU)

**Contexte:** Le composant `invite-recovery-flow.tsx` affichait des messages generiques inadaptes pour les utilisateurs existants rejoignant une nouvelle equipe via magic link.

**Fichier modifie:** `components/auth/invite-recovery-flow.tsx`

**Solution implementee:**
- Nouveau helper `getMessages(type: LinkType)` centralisant tous les messages UI
- 3 types differencies: `invite`, `magiclink`, `recovery`

| Type | Verifying | Success |
|------|-----------|---------|
| `invite` | "Confirmation de l'invitation" | "Invitation confirmee !" |
| `magiclink` | "Connexion a votre nouvelle equipe" | "Bienvenue dans votre nouvelle equipe !" |
| `recovery` | "Recuperation de mot de passe" | "Lien verifie !" |

**Pattern applique:** Messages centralises (Single Source of Truth) au lieu de ternaires inline disperses.

---

### Refactoring RLS Multi-Profil Complet (Phase 7 - NOUVEAU)

**Contexte:** Migration complete pour supporter les utilisateurs multi-equipe a tous les niveaux RLS.

**Fichier cree:** `supabase/migrations/20260128000000_fix_rls_multi_profile_complete.sql`

**Architecture "Single Source of Truth":**
```sql
-- Nouvelle fonction centrale
CREATE FUNCTION get_my_profile_ids() RETURNS TABLE(profile_id UUID)
-- Usage: user_id IN (SELECT get_my_profile_ids())
```

**Corrections apportees (23 etapes) - MIGRATION APPLIQUEE ✅:**

| Etape | Element | Correction |
|-------|---------|------------|
| 1 | `get_my_profile_ids()` | Nouvelle fonction centrale |
| 2-3 | `can_manager_update_user()`, `can_create_email_conversation()` | FOR LOOP au lieu de SELECT INTO |
| 4 | `push_subscriptions` | 4 policies recrees avec `IN (SELECT get_my_profile_ids())` |
| 5 | `contract_contacts_select` | Multi-profil |
| 7 | `is_tenant_of_lot()` | Multi-profil |
| 8-10 | `lots/buildings/interventions_select_locataire` | Multi-profil |
| 11 | `property_documents_update` | Multi-profil |
| 12-15 | `is_admin()`, `is_gestionnaire()`, `get_current_user_role()`, `user_belongs_to_team_v2()`, `get_user_teams_v2()` | Multi-profil |
| 16 | `notifications_insert_authenticated` | Corrige bug `users.id = auth.uid()` |
| 18-20 | `get_user_id_from_auth()`, `is_provider_of_intervention()`, `can_view_time_slot_for_provider()` | Multi-profil |
| **21** | `get_current_user_id()` | **ORDER BY + LIMIT 1** pour determinisme multi-profil |
| **22** | `is_assigned_to_intervention()` | **`get_my_profile_ids()`** - prestataire voit TOUTES ses interventions |
| **23** | `is_tenant_of_intervention()` | **`get_my_profile_ids()`** - locataire voit TOUTES ses interventions |

**Bugs corriges:**
1. `= (SELECT id FROM users WHERE auth_user_id = auth.uid())` → `IN (SELECT get_my_profile_ids())`
2. `SELECT INTO` (une seule ligne) → `FOR LOOP` (toutes les lignes)
3. `ia.user_id = auth.uid()` (comparaison incorrecte) → `ia.user_id IN (SELECT get_my_profile_ids())`
4. `users.id = auth.uid()` (BUG notifications) → `get_current_user_role()`

**Impact:**
- Utilisateurs mono-profil: comportement identique
- Utilisateurs multi-profil: voient donnees de TOUS leurs profils
- Push subscriptions: visibles depuis tous les profils
- Interventions locataire: accessibles via tous les contrats

---

### Fix Multi-Equipe Phase 6 - Browser Side PGRST116

**Contexte:** Apres la phase 5 (API routes), il restait 6 occurrences de `.single()` dans `lib/auth-service.ts` cote browser qui causaient l'erreur PGRST116 pour les utilisateurs multi-equipe.

**Fichier modifie:** `lib/auth-service.ts`

| Ligne | Methode | Correction |
|-------|---------|------------|
| 294-296 | `signIn()` | `.limit(1)` + `profiles?.[0]` |
| 391-395 | `getCurrentUser()` | `.limit(1)` + `profiles?.[0]` |
| 570-574 | `updateProfile()` | `.limit(1)` + `dbUsers?.[0]` |
| 671-677 | `onAuthStateChange()` | `.limit(1)` + `profileResult.data?.[0]` |
| 693-700 | `onAuthStateChange()` fallback email | `.limit(1)` + `emailResult.data?.[0]` |
| 754-759 | `onAuthStateChange()` direct query | `.limit(1)` + `directResult.data?.[0]` |

**Pattern applique:**
```typescript
// AVANT (ERREUR PGRST116 si 2+ profils)
const { data: userProfile } = await supabase.from('users').eq('auth_user_id', id).single()

// APRES (MULTI-PROFIL)
const { data: profiles } = await supabase.from('users')
  .eq('auth_user_id', id)
  .is('deleted_at', null)
  .order('updated_at', { ascending: false })
  .limit(1)
const userProfile = profiles?.[0] || null
```

**Impact:** Les utilisateurs multi-equipe peuvent maintenant se connecter et naviguer sans erreur 406 cote browser.

---

### Fix Multi-Equipe Phase 5 - Corrections Critiques

**Contexte:** Utilisateurs multi-equipe (ex: prestataire equipe A + gestionnaire equipe B) ne pouvaient pas utiliser l'application correctement car:
1. API routes retournaient erreur PGRST116 (`.single()` echoue si 2+ profils)
2. Fonctions RLS utilisaient `SELECT INTO` qui ne prend qu'UNE ligne

**Fichiers modifies:**

| Fichier | Modification |
|---------|--------------|
| `lib/api-auth-helper.ts` | Remplace `.single()` par multi-profil + cookie selection |
| `supabase/migrations/20260127000000_fix_rls_helpers_multi_profile.sql` | Refactorise 3 fonctions RLS avec boucle FOR LOOP |

**Detail technique - api-auth-helper.ts:**
```typescript
// AVANT (ERREUR PGRST116)
.from('users').select('*').eq('auth_user_id', id).single()

// APRES (MULTI-PROFIL)
.from('users').select('*').eq('auth_user_id', id).is('deleted_at', null)
// Puis selection selon cookie seido_current_team
```

**Detail technique - Fonctions RLS:**
```sql
-- AVANT: SELECT INTO ne prend QU'UNE ligne
SELECT u.id, u.role INTO current_user_id, current_user_role FROM users u WHERE...

-- APRES: Boucle sur TOUS les profils
FOR user_record IN SELECT u.id, u.role, u.team_id FROM users u WHERE... LOOP
  RETURN QUERY SELECT ... WHERE ia.user_id = user_record.id;
END LOOP;
```

**Impact:** Les prestataires multi-equipe voient maintenant leurs interventions de TOUTES leurs equipes.

---

### Verification Architecture Cards Intervention

**Contexte:** Suite a l'unification des composants cards (remplacement `ManagerInterventionCard` par `PendingActionsCard`), verification que TOUTES les pages de details utilisent la bonne architecture.

**Resultat:** ✅ AUCUNE MODIFICATION NECESSAIRE - Architecture cascade deja en place.

**Architecture verifiee:**
```
Pages Details (Patrimoine, Contrats, Contacts)
└── InterventionsNavigator
    └── InterventionsViewContainer
        └── InterventionsList
            └── PendingActionsCard ✅
```

**Pages verifiees:**
| Page | Fichier | Import confirme |
|------|---------|-----------------|
| Immeubles | `building-details-client.tsx` | ligne 13, 543 |
| Lots | `lot-details-client.tsx` | ligne 13, 686 |
| Contrats | `contract-details-client.tsx` | ligne 57, 603 |
| Contacts | `contact-interventions-tab.tsx` | ligne 5, 87 |

**Pourquoi ca fonctionne:** Le pattern "Single Source of Truth" fait que la modification de `InterventionsList` cascade automatiquement vers toutes les pages.

---

## Travail Complete (2026-01-26)

### Pagination Vue Liste Interventions

**Feature:** Ajout d'un systeme de pagination pour la vue liste des interventions.

| Composant | Description |
|-----------|-------------|
| `hooks/use-pagination.ts` | Hook reutilisable avec items paginates, navigation, reset |
| `components/interventions/intervention-pagination.tsx` | UI pagination avec labels francais, ellipses, responsive |
| `dashboard-interventions-section.tsx` | Integration avec reset automatique sur changement de filtres |

**Comportement:**
- 10 elements par page
- Reset automatique a page 1 lors du changement de filtres/tri
- Composant masque si ≤1 page
- Labels francais ("1-10 sur 89 interventions", "Precedent/Suivant")
- Mobile-friendly (numeros masques, affiche "3 / 9")

### Migration demande_de_devis -> requires_quote + intervention_quotes

**Changement architectural majeur:** Le statut `demande_de_devis` etait REDONDANT car le statut des devis peut etre derive de la table `intervention_quotes`. Cette migration simplifie le workflow de 10 a 9 statuts.

#### Fichiers Backend Modifies

| Fichier | Modification |
|---------|--------------|
| `app/api/create-manager-intervention/route.ts` | Ligne 331-336: `demande_de_devis` -> `planification` |
| `app/api/intervention/[id]/status/route.ts` | Lignes 50-95: Supprime des validStatuses et allowedTransitions |
| `hooks/use-intervention-workflow.ts` | Lignes 79-91, 245-264: Supprime ALLOWED_TRANSITIONS + Updated requestQuote() |

#### Fichiers Client Modifies

| Fichier | Modification |
|---------|--------------|
| `intervention-detail-client.tsx` (3 roles) | Ligne 270: Utilise `requires_quote` au lieu du statut |
| `intervention-create-form.tsx` | Lignes 72-77, 331-337: Nettoye Zod schema + UI Select |
| `dashboard-interventions-section.tsx` | Lignes 47-56: Nettoye STATUS_OPTIONS |
| `pending-actions-section.tsx` | Lignes 83-92: Nettoye getActionPriority() |
| `manager-dashboard-v2.tsx` | Lignes 62-68: Nettoye activeInterventionsCount |

#### Migration SQL

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/20260126120000_remove_demande_de_devis_status.sql` | Migration complete enum intervention_status |

#### Nouveaux Fichiers

| Fichier | Description |
|---------|-------------|
| `components/interventions/quote-status-badge.tsx` | Badge affichage statut devis |
| `lib/utils/quote-status.ts` | Utilitaires statut devis |
| `lib/intervention-action-utils.ts` | Utilitaires actions intervention |

#### Bug Fixes

| Fichier | Description |
|---------|-------------|
| `nouvelle-intervention-client.tsx` | Lignes 110-115: Deplace useRouter/useToast/useAuth en haut du composant (fix "Cannot access before initialization") |
| `pending-actions-card.tsx` | Lignes 117-124: Affiche "En attente de X reponse(s)" dynamique au lieu du message generique |

### Nouveau Workflow Devis (Pattern)

```
AVANT: statut demande_de_devis dans le workflow principal

APRES:
  - Statut intervention: planification (workflow standard)
  - requires_quote: true (champ boolean sur interventions)
  - intervention_quotes: table avec statuts (pending, sent, accepted, rejected)
  - QuoteStatusBadge: affichage visuel separe du statut intervention
```

---

## Prochaines Etapes

### Multi-Equipe - A Valider
- [x] Appliquer migration: `npx supabase db push` ✅ (2026-01-27)
- [ ] Tester login utilisateur mono-profil (comportement identique)
- [ ] Tester login utilisateur multi-profil (pas d'erreur PGRST116)
- [ ] Tester changement d'equipe (selecteur + cookie)
- [ ] Tester vue consolidee "Toutes les equipes"
- [ ] Verifier interventions prestataire multi-equipe
- [ ] Verifier interventions locataire multi-logement

### Bugs Corriges (toutes phases)
- [x] Services notification non initialises (#1 CRITIQUE)
- [x] Suppression aggressive time_slots (#2 CRITIQUE)
- [x] Validations incoherentes forms/APIs (#3 CRITIQUE)
- [x] team_id orphelin possible (#7 HAUTE)
- [x] Types d'intervention hardcodes vs dynamiques (#4)
- [x] Persistance des commentaires manquante (#5)
- [x] Protection contre boucles infinies de contestation (#6)
- [x] Migration demande_de_devis (2026-01-26)
- [x] Fix PGRST116 API routes (Phase 5)
- [x] Fix PGRST116 browser side (Phase 6)
- [x] Refactoring RLS multi-profil complet (Phase 7 - 20 STEPs)
- [x] Fix `get_current_user_id()` determinisme (STEP 21)
- [x] Fix `is_assigned_to_intervention()` multi-profil (STEP 22)
- [x] Fix `is_tenant_of_intervention()` multi-profil (STEP 23)

### Bugs Restants (Phase 3 - Moyenne Priorite)
- [ ] Gestion des fichiers silencieuse (#8)
- [ ] Etats fragmentes dans les composants client (#9)
- [ ] 5 modales de cloture differentes (#10)
- [ ] Statuts hardcodes en strings (#11)

### Patterns a Verifier
- `getServerAuthContext()` utilise partout
- RLS policies coherentes
- Notifications declenchees aux bons moments
- Optimistic updates dans les hooks

---

## Authentification Intervention

```typescript
// Server Component
import { getServerAuthContext } from '@/lib/server-context'
const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

// API Route
import { requireApiRole } from '@/lib/api-auth-helper'
const authResult = await requireApiRole('gestionnaire')
```

---

## Metriques Systeme (Mise a jour 2026-01-26)

| Composant | Valeur |
|-----------|--------|
| Statuts intervention | **9** (etait 10 - demande_de_devis supprime) |
| API Routes intervention | ~15 |
| Hooks intervention | 8 |
| Email templates intervention | 8 |
| Tables intervention | 6 |

---
*Derniere mise a jour: 2026-01-27 22:00*
*Focus: Navigation Contact Preview (bouton œil) + Fix Badge Messages Non-Lus*

## Files Recently Modified
### 2026-01-27 21:13:21 (Auto-updated)
- `components/interventions/shared/sidebar/participants-list.tsx`
