# SEIDO Active Context

## Focus Actuel
**Objectif:** Correction des bugs dans le flow de création et gestion des interventions
**Branch:** `preview`
**Sprint:** UX Improvements (Jan 2026)

---

## Flow des Interventions - Vue Complète

### Statuts (10 actifs)

```
demande → rejetee (terminal)
        → approuvee → demande_de_devis → planification → planifiee
                   → planification    ↗               ↓
                                              cloturee_par_prestataire
                                                      ↓
                                              cloturee_par_locataire
                                                      ↓
                                              cloturee_par_gestionnaire (terminal)
        → annulee (terminal - possible à chaque étape)
```

### Fichiers Clés par Phase

#### Phase 1: Création & Approbation

| Fichier | Description |
|---------|-------------|
| `app/gestionnaire/(no-navbar)/interventions/nouvelle-intervention/` | Page création gestionnaire |
| `app/locataire/(no-navbar)/interventions/nouvelle-demande/` | Page création locataire |
| `app/actions/intervention-actions.ts` | Server Actions (~3000+ lignes) |
| `lib/services/domain/intervention-service.ts` | Service métier |
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
| `app/api/intervention/[id]/select-slot/route.ts` | Confirmation créneau |

#### Phase 3: Exécution & Clôture

| Fichier | Description |
|---------|-------------|
| `app/api/intervention/[id]/work-completion/route.ts` | Fin travaux prestataire |
| `app/api/intervention-validate-tenant/route.ts` | Validation locataire |
| `app/api/intervention/[id]/manager-finalization/route.ts` | Finalisation gestionnaire |

### Pages de Détail

| Rôle | Page |
|------|------|
| Gestionnaire | `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx` |
| Prestataire | `app/prestataire/(no-navbar)/interventions/[id]/page.tsx` |
| Locataire | `app/locataire/(no-navbar)/interventions/[id]/page.tsx` |

### Composants UI Principaux

```
components/interventions/
├── intervention-create-form.tsx       # Formulaire création (gestionnaire)
├── intervention-request-form.tsx      # Formulaire demande (locataire)
├── intervention-overview-card.tsx     # Card résumé
├── intervention-progress-card.tsx     # Progression
├── intervention-chat-tab.tsx          # Onglet chat
└── intervention-comments-card.tsx     # Commentaires

components/intervention/
├── intervention-detail-header.tsx     # Header page détail
├── intervention-detail-tabs.tsx       # Navigation onglets
├── intervention-action-buttons.tsx    # Boutons d'action contextuels
├── intervention-action-panel-header.tsx
└── intervention-cancel-button.tsx
```

### Hooks Intervention

| Hook | Usage |
|------|-------|
| `use-intervention-workflow.ts` | Gestion workflow + optimistic updates |
| `use-intervention-types.ts` | Types d'intervention dynamiques |
| `use-intervention-approval.ts` | Approbation/rejet |
| `use-intervention-quoting.ts` | Gestion devis |
| `use-intervention-planning.ts` | Planification créneaux |
| `use-intervention-execution.ts` | Exécution travaux |
| `use-intervention-finalization.ts` | Finalisation |
| `use-realtime-interventions.ts` | Sync temps réel |

### Tables Supabase

| Table | Colonnes clés |
|-------|---------------|
| `interventions` | id, lot_id, building_id, team_id, status, title, type, urgency, created_by |
| `intervention_assignments` | intervention_id, user_id, role, is_primary |
| `intervention_quotes` | intervention_id, provider_id, status, amount |
| `intervention_time_slots` | intervention_id, slot_date, start_time, end_time, is_selected |
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

## Travail Complété Aujourd'hui (2026-01-25)

### Code Cleanup + Migration `is_selected` → `status` ✅

**Nettoyage post-debug "Fixed Slot Not Selected":**

| Fichier | Action | Lignes supprimées |
|---------|--------|-------------------|
| `create-manager-intervention/route.ts` | Log DEBUG supprimé | 8 |
| `availability-response/route.ts` | 18 logs DEBUG supprimés | ~50 |
| `assignment-section-v2.tsx` | 4 console.log supprimés | 4 |
| `intervention-create-form.tsx` | Code commenté supprimé | 22 |

**Migration `is_selected` → `status`:**

| Fichier | Modification |
|---------|--------------|
| `create-manager-intervention/route.ts` | `is_selected: false` → `status: 'pending'`, `is_selected: true` supprimé |
| `select-slot/route.ts` | `.eq('is_selected', false)` → `.neq('status', 'selected')` |
| `intervention-schedule/route.ts` | 6 occurrences migrées vers `status` |
| `data-enricher.ts` | `.eq('is_selected', true)` → `.eq('status', 'selected')` |

**Pattern moderne:**
```typescript
// AVANT (legacy)
is_selected: true/false

// APRÈS (moderne)
status: 'pending' | 'selected' | 'rejected' | 'cancelled'
```

---

### Correction Bugs Critiques Flow Interventions ✅

#### Bug #1: Services de notification non initialisés (CRITIQUE)
**Fichiers corrigés:**
- `app/api/intervention-quote-request/route.ts` - Supprimé appel `notificationService.notifyQuoteRequest()` (non existant)
- `app/api/intervention/[id]/work-completion/route.ts` - Remplacé par `notifyInterventionStatusChange()`
- `app/api/intervention/[id]/manager-finalization/route.ts` - Remplacé par `notifyInterventionStatusChange()`

#### Bug #2: Suppression agressive time_slots (CRITIQUE)
**Fichiers corrigés:**
- `app/api/intervention-schedule/route.ts` - Ajout vérification `is_selected=true` avant suppression
- `app/api/intervention/[id]/select-slot/route.ts` - Marquage du slot confirmé + suppression sélective

#### Bug #3: Validations incohérentes
**Fichier corrigé:** `lib/validation/schemas.ts`
- `createInterventionSchema`: `description.min(1)` → `description.min(10)`
- `createManagerInterventionSchema`: `description.optional()` → `description.min(10).optional()`
- `submitQuoteSchema`: `description.min(1)` → `description.min(10)`

#### Bug #7: team_id orphelin possible (HAUTE)
**Fichier corrigé:** `app/api/create-manager-intervention/route.ts`
- Ajout validation `interventionTeamId` obligatoire avant création intervention

### Correction Statut Intervention avec Confirmation Requise ✅

#### Fix: Statut incorrect en mode "date fixe + confirmation"
**Problème:** Intervention passait à `planifiee` immédiatement même avec confirmation requise

**Fichiers corrigés:**
- `app/api/create-manager-intervention/route.ts`
  - CAS 2: Ajout condition `!requiresParticipantConfirmation`
  - Time slot: `status` et `selected_by_manager` conditionnels
- `app/api/intervention-confirm-participation/route.ts`
  - Vérification si TOUS les participants ont confirmé
  - Mise à jour automatique intervention → `planifiee` + slot → `selected`

**Flow corrigé:**
```
date fixe + confirmation → status='planification', slot='pending'
→ tous confirment → status='planifiee', slot='selected' ✅
```

### Correction Bugs Phase 2 (Haute Priorité) ✅

#### Bug #4: Types d'intervention hardcodés
**Fichiers corrigés:**
- `components/interventions/intervention-request-form.tsx` - Utilise `InterventionTypeCombobox`
- `components/interventions/intervention-create-form.tsx` - Utilise `InterventionTypeCombobox`
- Schémas Zod: `type: z.enum([...])` → `type: z.string().min(1).max(100)`

#### Bug #5: Persistance des commentaires manquante
**Fichiers corrigés:**
- `app/api/intervention-reject/route.ts` - Sauvegarde raison de rejet via `createComment()`
- `app/api/intervention-schedule/route.ts` - Sauvegarde commentaires de planification
- `app/api/intervention/[id]/select-slot/route.ts` - Sauvegarde commentaires de sélection

#### Bug #6: Boucle infinie de contestation
**Fichier corrigé:** `app/api/intervention-validate-tenant/route.ts`
- Ajout `MAX_CONTEST_COUNT = 3` limite
- Tracking `contest_count` dans `intervention.metadata`
- Message d'erreur clair si limite atteinte

### Redesign Progress Tracker ✅
- Intégration progression dans KPI card "En cours"
- Nouveau composant `progress-mini.tsx` (80 lignes)
- Suppression section dédiée (~70px gain d'espace)
- Célébration 100% préservée (toast + sparkles)

### Fichiers Modifiés
- `components/dashboards/shared/progress-mini.tsx` (CRÉÉ)
- `components/dashboards/shared/dashboard-stats-cards.tsx`
- `components/dashboards/manager/manager-dashboard-v2.tsx`
- `components/dashboards/shared/kpi-carousel.tsx`
- `components/dashboards/manager/progress-tracker.tsx` (SUPPRIMÉ)
- `app/api/intervention-quote-request/route.ts`
- `app/api/intervention/[id]/work-completion/route.ts`
- `app/api/intervention/[id]/manager-finalization/route.ts`
- `app/api/intervention-schedule/route.ts`
- `app/api/intervention/[id]/select-slot/route.ts`
- `lib/validation/schemas.ts`
- `app/api/create-manager-intervention/route.ts`

---

## Prochaines Étapes - Bugs Interventions

### Bugs Corrigés ✅
**Phase 1 - Critiques:**
- [x] Services notification non initialisés (#1 CRITIQUE)
- [x] Suppression agressive time_slots (#2 CRITIQUE)
- [x] Validations incohérentes forms/APIs (#3 CRITIQUE)
- [x] team_id orphelin possible (#7 HAUTE)

**Phase 2 - Haute Priorité:**
- [x] Types d'intervention hardcodés vs dynamiques (#4)
- [x] Persistance des commentaires manquante (#5)
- [x] Protection contre boucles infinies de contestation (#6)

### Bugs Restants (Phase 3 - Moyenne Priorité)
- [ ] Gestion des fichiers silencieuse (#8)
- [ ] États fragmentés dans les composants client (#9)
- [ ] 5 modales de clôture différentes (#10)
- [ ] Statuts hardcodés en strings (#11)

### Feature Confirmation Participant ✅
- [x] Statut intervention correct avec confirmation requise
- [x] Time slot en `pending` jusqu'à toutes confirmations
- [x] Transition automatique `planification` → `planifiee` après confirmations

### Patterns à Vérifier
- `getServerAuthContext()` utilisé partout ✅
- RLS policies cohérentes
- Notifications déclenchées aux bons moments ✅ (corrigé)
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

## Métriques Système

| Composant | Valeur |
|-----------|--------|
| Statuts intervention | 10 |
| API Routes intervention | ~15 |
| Hooks intervention | 8 |
| Email templates intervention | 8 |
| Tables intervention | 6 |

---
*Dernière mise à jour: 2026-01-25*
*Focus: Correction bugs flow interventions*

## Files Recently Modified
### 2026-01-25 22:41:14 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/activeContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/progress.md`
