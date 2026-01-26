# SEIDO Active Context

## Focus Actuel
**Objectif:** Migration workflow devis - Suppression statut `demande_de_devis`
**Branch:** `preview`
**Sprint:** UX Improvements (Jan 2026)

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

## Travail Complete Aujourd'hui (2026-01-26)

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

### Bugs Corriges (toutes phases)
- [x] Services notification non initialises (#1 CRITIQUE)
- [x] Suppression aggressive time_slots (#2 CRITIQUE)
- [x] Validations incoherentes forms/APIs (#3 CRITIQUE)
- [x] team_id orphelin possible (#7 HAUTE)
- [x] Types d'intervention hardcodes vs dynamiques (#4)
- [x] Persistance des commentaires manquante (#5)
- [x] Protection contre boucles infinies de contestation (#6)
- [x] Migration demande_de_devis (2026-01-26)

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
*Derniere mise a jour: 2026-01-26*
*Focus: Migration workflow devis - Suppression demande_de_devis*

## Files Recently Modified
### 2026-01-26 16:54:33 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/activeContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/progress.md`
