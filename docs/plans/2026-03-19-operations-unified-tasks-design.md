# Design : Operations — Taches Unifiees (Interventions + Rappels + Sinistres + Recurrences)

**Date** : 2026-03-19
**Status** : Validated + Reviewed
**Phasage** : 3 phases (Rappels → Recurrences Interventions → Sinistres)
**Review** : 23 issues identifiees et corrigees (2 critiques, 12 importants, 5 warnings, 2 suggestions)

---

## Decisions de conception validees

| Question | Choix | Justification |
|----------|-------|---------------|
| Routes | `/taches/` + redirect `/interventions/` | Namespace semantique, zero regression |
| Modele de donnees | Tables separees (`interventions`, `reminders`, `claims`) | Lifecycles distincts (9/5/8 statuts), zero migration |
| Recurrences | RRULE RFC 5545 + `rrule.js` + table `recurrence_occurrences` | Standard universel, export iCal, patterns arbitraires |
| Sinistres → prestataire | Interventions enfants + banner contextuel | Marc garde ses habitudes, zero nouvelle vue |
| Label navbar | "Operations" | Vocabulaire pro immobilier, couvre les 3 types |
| Dashboard | Compteurs (Phase 1) + "Ma journee" (Phase 2) | Vision macro + plan d'action progressif |
| Conversion intervention → sinistre | Manuelle avec conservation | Intervention devient enfant du sinistre, rien n'est perdu |
| Cron backend | Vercel Cron (`/api/cron/recurrence-scan`) | Simple, serverless, gratuit sur Vercel, suffisant pour scan quotidien |

---

## Architecture de navigation

### Navbar principale

```
Dashboard | Biens | Contacts | Operations | Email | ...
                                   ^
                              (anciennement "Interventions")
```

Fichier : `components/gestionnaire-sidebar.tsx` (ligne ~75)
- Changer `label: "Interventions"` → `label: "Operations"`
- Changer `href` → `/gestionnaire/taches`
- Changer `createHref` → `createOptions` (dropdown pattern deja utilise par Contrats)

Redirect: `/gestionnaire/interventions/*` → `/gestionnaire/taches/*` (301)

### Page Operations — Segment Control + Onglets

```
┌──────────────────────────────────────────────────────────────┐
│  [Wrench Interventions 42] [BellRing Rappels 7] [Shield Sinistres 3]  │ ← Segment pills
├──────────────────────────────────────────────────────────────┤
│  Toutes (42) | Demandes (8) | En cours (22) | Cloturees (12)          │ ← Onglets statut
│  [Filtre ▾] [Tri ▾] [Grid|List|Cal]                                   │
│  ────────────────────────────────────────────────────────────          │
│  [carte] [carte] [carte] ...                                           │
└──────────────────────────────────────────────────────────────┘
```

- **Niveau 1** (segment control) : type de tache — pill switcher horizontal
- **Niveau 2** (onglets) : statuts contextuels par type via `ContentNavigator` (deja supporte les tabs dynamiques)
- Onglets statut s'adaptent au type selectionne (rappels ont 4 statuts, sinistres 8)
- **Calendrier** : Phase 1 = interventions-only. Extension multi-type en Phase 2.

### Bouton "Nouveau" → DropdownMenu (via `createOptions` existant)

```
[+ Nouveau ▾]
  ├── Wrench  Intervention
  ├── BellRing Rappel
  └── ShieldAlert Sinistre
```

Click direct (sans dropdown) cree le type du segment actif.

### Mobile

- Segment control : pills scrollables horizontalement (icone + compteur, label masque)
- Creation : FAB (`components/ui/fab.tsx` + `gestionnaire-fab-wrapper.tsx`) + Sheet bottom avec les 3 types
- Touch targets : min 44px

---

## Modele de donnees

### Vue d'ensemble

```
interventions (existant, inchange sauf ajout claim_id)
  └── intervention_assignments
  └── intervention_quotes
  └── intervention_time_slots
  └── intervention_documents
  └── intervention_comments
  └── conversation_threads
  └── claim_id? → claims (lien vers sinistre parent)

reminders (nouveau)
  └── reminder_notes (nouveau)
  └── recurrence_rules (via recurrence system)
  └── recurrence_occurrences (via recurrence system)

claims (nouveau)
  └── claim_documents (ou reutilise intervention_documents pattern)
  └── claim_timeline_events (nouveau)
  └── interventions (enfants lies via claim_id)
  └── recurrence: NON (sinistres ne sont pas recurrents)
```

### Table `reminders`

```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Contenu
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normale'
    CHECK (priority IN ('basse', 'normale', 'haute')),
  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'en_cours', 'termine', 'annule')),

  -- Liaison entite (toutes optionnelles, max 1)
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  contact_id UUID REFERENCES users(id),
  contract_id UUID REFERENCES supplier_contracts(id),
  CONSTRAINT reminders_single_entity CHECK (
    num_nonnulls(building_id, lot_id, contact_id, contract_id) <= 1
  ),

  -- Echeance
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Assignation interne (gestionnaire uniquement)
  assigned_to UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),

  -- Recurrence (lien vers systeme RRULE)
  recurrence_rule_id UUID REFERENCES recurrence_rules(id),
  parent_occurrence_id UUID REFERENCES recurrence_occurrences(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_reminders_team_id ON reminders(team_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX idx_reminders_status ON reminders(status) WHERE deleted_at IS NULL;

-- updated_at trigger (reutilise la fonction existante)
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_select ON reminders FOR SELECT
  USING (deleted_at IS NULL AND is_team_manager(team_id));

CREATE POLICY reminders_insert ON reminders FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY reminders_update ON reminders FOR UPDATE
  USING (is_team_manager(team_id));

CREATE POLICY reminders_delete ON reminders FOR DELETE
  USING (is_team_manager(team_id));
```

### Table `claims` (sinistres)

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Contenu
  title TEXT NOT NULL,
  description TEXT,
  nature TEXT NOT NULL
    CHECK (nature IN ('degat_des_eaux', 'incendie', 'vol', 'bris_de_glace', 'catastrophe_naturelle', 'autre')),
  severity TEXT NOT NULL DEFAULT 'modere'
    CHECK (severity IN ('faible', 'modere', 'grave', 'critique')),
  status TEXT NOT NULL DEFAULT 'declare'
    CHECK (status IN (
      'declare', 'expertise_requise', 'expertise_planifiee',
      'travaux_autorises', 'en_reparation',
      'cloture_provisoire', 'cloture_definitive',
      'sans_suite', 'conteste'
    )),

  -- Localisation (required)
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),

  -- Dates
  incident_date DATE NOT NULL,
  declaration_date DATE,

  -- Assurance
  insurance_company TEXT,
  insurance_contract_number TEXT,
  claim_number TEXT, -- numero de sinistre assurance

  -- Expert
  expert_name TEXT,
  expert_company TEXT,
  expert_phone TEXT,
  expert_email TEXT,
  expert_mission_date DATE,
  expert_report_due_date DATE,

  -- Financier
  franchise_amount NUMERIC(10,2),
  indemnisation_amount NUMERIC(10,2),

  -- Locataire concerne
  tenant_id UUID REFERENCES users(id),

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_claims_team_id ON claims(team_id);
CREATE INDEX idx_claims_status ON claims(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_claims_building_id ON claims(building_id);
CREATE INDEX idx_claims_lot_id ON claims(lot_id);

-- updated_at trigger
CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lien intervention → sinistre (colonne ajoutee a interventions)
ALTER TABLE interventions ADD COLUMN claim_id UUID REFERENCES claims(id);
CREATE INDEX idx_interventions_claim_id ON interventions(claim_id);

-- RLS
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY claims_select ON claims FOR SELECT
  USING (deleted_at IS NULL AND is_team_manager(team_id));

CREATE POLICY claims_insert ON claims FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY claims_update ON claims FOR UPDATE
  USING (is_team_manager(team_id));

CREATE POLICY claims_delete ON claims FOR DELETE
  USING (is_team_manager(team_id));
```

### Table `claim_timeline_events`

```sql
CREATE TABLE claim_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id),
  team_id UUID NOT NULL REFERENCES teams(id), -- requis pour RLS
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'declaration', 'expert_missionne', 'expertise_planifiee',
      'rapport_expert_recu', 'indemnisation_proposee', 'indemnisation_acceptee',
      'travaux_autorises', 'travaux_commences', 'travaux_termines',
      'cloture_provisoire', 'cloture_definitive', 'note'
    )),
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_claim_timeline_claim_id ON claim_timeline_events(claim_id);
CREATE INDEX idx_claim_timeline_event_date ON claim_timeline_events(event_date);

-- RLS
ALTER TABLE claim_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY claim_timeline_select ON claim_timeline_events FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY claim_timeline_insert ON claim_timeline_events FOR INSERT
  WITH CHECK (is_team_manager(team_id));
```

### Systeme de recurrence (RRULE)

```sql
CREATE TABLE recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- RRULE RFC 5545
  rrule TEXT NOT NULL, -- ex: "FREQ=MONTHLY;INTERVAL=1;BYDAY=MO"
  dtstart TIMESTAMPTZ NOT NULL, -- date de debut

  -- Source entity (polymorphe)
  source_type TEXT NOT NULL CHECK (source_type IN ('intervention', 'reminder')),
  source_template JSONB NOT NULL, -- snapshot des champs pour recreer l'instance

  -- Config
  is_active BOOLEAN NOT NULL DEFAULT true,
  notify_days_before INTEGER NOT NULL DEFAULT 14, -- J-14 par defaut
  auto_create BOOLEAN NOT NULL DEFAULT false, -- true pour rappels simples

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_recurrence_rules_active ON recurrence_rules(team_id, is_active)
  WHERE is_active = true;

-- updated_at trigger
CREATE TRIGGER update_recurrence_rules_updated_at
  BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurrence_rules_select ON recurrence_rules FOR SELECT
  USING (is_team_manager(team_id));
CREATE POLICY recurrence_rules_insert ON recurrence_rules FOR INSERT
  WITH CHECK (is_team_manager(team_id));
CREATE POLICY recurrence_rules_update ON recurrence_rules FOR UPDATE
  USING (is_team_manager(team_id));
CREATE POLICY recurrence_rules_delete ON recurrence_rules FOR DELETE
  USING (is_team_manager(team_id));

CREATE TABLE recurrence_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES recurrence_rules(id),
  team_id UUID NOT NULL REFERENCES teams(id), -- requis pour RLS

  -- Instance generee
  occurrence_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'notified', 'confirmed', 'skipped', 'overdue')),

  -- Lien vers l'entite creee (rempli apres confirmation)
  generated_entity_type TEXT CHECK (generated_entity_type IN ('intervention', 'reminder')),
  generated_entity_id UUID, -- FK dynamique vers interventions ou reminders

  -- Metadata
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_recurrence_occurrences_pending ON recurrence_occurrences(occurrence_date, status)
  WHERE status = 'pending';
CREATE INDEX idx_recurrence_occurrences_rule ON recurrence_occurrences(rule_id);

-- RLS
ALTER TABLE recurrence_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurrence_occurrences_select ON recurrence_occurrences FOR SELECT
  USING (is_team_manager(team_id));
CREATE POLICY recurrence_occurrences_insert ON recurrence_occurrences FOR INSERT
  WITH CHECK (is_team_manager(team_id));
CREATE POLICY recurrence_occurrences_update ON recurrence_occurrences FOR UPDATE
  USING (is_team_manager(team_id));
```

### RPC pour scan batch des recurrences (cron)

```sql
-- SECURITY DEFINER pour scanner cross-teams sans RLS
CREATE OR REPLACE FUNCTION scan_pending_recurrences(look_ahead_days INTEGER DEFAULT 14)
RETURNS TABLE (
  rule_id UUID,
  team_id UUID,
  source_type TEXT,
  source_template JSONB,
  occurrence_date TIMESTAMPTZ,
  notify_days_before INTEGER,
  auto_create BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id AS rule_id,
    r.team_id,
    r.source_type,
    r.source_template,
    o.occurrence_date,
    r.notify_days_before,
    r.auto_create
  FROM recurrence_rules r
  JOIN recurrence_occurrences o ON o.rule_id = r.id
  WHERE r.is_active = true
    AND o.status = 'pending'
    AND o.occurrence_date <= now() + (look_ahead_days || ' days')::interval
  ORDER BY o.occurrence_date ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION scan_pending_recurrences TO authenticated;
```

---

## Lifecycles par type

### Intervention (inchange — 9 statuts)

```
demande → approuvee/rejetee → planification → planifiee
→ cloturee_par_prestataire → cloturee_par_locataire → cloturee_par_gestionnaire
→ annulee (any stage)
```

### Rappel (4 statuts — simplifie apres review)

```
en_attente → en_cours → termine
                      → annule
```

| Transition | Acteur | Condition |
|------------|--------|-----------|
| (creation) → en_attente | Systeme | DEFAULT a l'INSERT |
| en_attente → en_cours | Gestionnaire | Clic "Commencer" |
| en_cours → termine | Gestionnaire | Clic "Terminer" |
| * → annule | Gestionnaire | Clic "Annuler" |

> Note: Le statut `cree` a ete retire (redondant avec `en_attente` comme DEFAULT).

### Sinistre (8 statuts)

```
declare → expertise_requise → expertise_planifiee
→ travaux_autorises → en_reparation
→ cloture_provisoire → cloture_definitive
→ sans_suite | conteste
```

| Transition | Acteur | Condition |
|------------|--------|-----------|
| declare → expertise_requise | Gestionnaire | Expert missionne |
| expertise_requise → expertise_planifiee | Gestionnaire | Date expertise fixee |
| expertise_planifiee → travaux_autorises | Gestionnaire | Rapport expert recu + accord assurance |
| travaux_autorises → en_reparation | Gestionnaire | Interventions enfants creees |
| en_reparation → cloture_provisoire | Gestionnaire | Travaux termines |
| cloture_provisoire → cloture_definitive | Gestionnaire | Indemnisation recue |
| * → sans_suite | Gestionnaire | Sinistre non couvert |
| * → conteste | Gestionnaire | Contestation en cours |

---

## UI Components

### Hierarchie de composants

```
components/
  operations/                       [NOUVEAU — namespace dedie]
    task-type-segment.tsx            [segment control pills]
  reminders/                        [NOUVEAU]
    reminders-navigator.tsx
    reminders-view-container.tsx
    reminder-card.tsx
    reminder-detail-client.tsx
    shared/cards/
      reminder-details-card.tsx
      reminder-notes-card.tsx
  claims/                           [NOUVEAU]
    claims-navigator.tsx
    claims-view-container.tsx
    claim-card.tsx
    claim-detail-client.tsx
    shared/cards/
      claim-summary-card.tsx
      claim-insurance-card.tsx
      claim-timeline-card.tsx
  recurrence/                       [NOUVEAU]
    recurrence-config.tsx            [toggle + RRULE picker]
    recurrence-badge.tsx             [icone ↻ sur les cards]
    recurrence-history.tsx           [timeline des occurrences]

app/gestionnaire/
  (with-navbar)/taches/             [page liste unifiee]
    page.tsx
    tasks-client.tsx
  (no-navbar)/taches/
    nouvelle-intervention/          [wizard existant, deplace]
    nouveau-rappel/                 [wizard nouveau]
    nouveau-sinistre/               [wizard nouveau]
    interventions/[id]/             [detail existant, deplace]
    modifier/interventions/[id]/    [edit existant, deplace]
    rappels/[id]/                   [detail nouveau]
    sinistres/[id]/                 [detail nouveau]
```

### Segment Control (TaskTypeSegment)

```tsx
<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
  {TASK_TYPES.map(type => (
    <button
      key={type.id}
      data-active={activeType === type.id}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
        "text-muted-foreground hover:text-foreground",
        "data-[active=true]:bg-card data-[active=true]:text-foreground data-[active=true]:shadow-sm"
      )}
    >
      <type.icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{type.label}</span>
      <CountBadge count={type.count} active={activeType === type.id} />
    </button>
  ))}
</div>
```

### Card differenciateurs visuels

**Border-left accent (pattern Linear) :**
```tsx
<div className={cn(
  "rounded-lg border bg-card shadow-sm overflow-hidden border-l-4",
  type === 'intervention' && "border-l-primary",
  type === 'rappel'       && "border-l-amber-500",
  type === 'sinistre'     && "border-l-destructive",
)}>
```

**Badge type (rappels et sinistres uniquement) :**
```tsx
{type !== 'intervention' && (
  <Badge variant="outline" className={cn(
    "text-[10px] font-medium gap-1",
    type === 'rappel'  && "border-amber-300 text-amber-700 bg-amber-50",
    type === 'sinistre' && "border-red-300 text-red-700 bg-red-50",
  )}>
    <TypeIcon className="h-2.5 w-2.5" />
    {typeLabel}
  </Badge>
)}
```

**Indicateur recurrence :**
```tsx
{isRecurring && (
  <span className="flex items-center gap-1 text-xs text-muted-foreground">
    <RefreshCw className="h-3 w-3" />
    {recurrenceLabel}
  </span>
)}
```

---

## Wizards de creation

Step definitions dans `lib/step-configurations.ts` (pattern existant).

### Wizard Rappel (3 etapes)

```
[Bien?] → [Rappel] → [Confirmation]
   1          2            3
```

```typescript
export const reminderSteps: StepConfig[] = [
  { icon: Building2, label: "Bien" },
  { icon: BellRing, label: "Rappel" },
  { icon: Check, label: "Confirmation" },
]
```

- Etape 1 : PropertySelector optionnel (toggle "Lier a un bien")
- Etape 2 : Titre, description, due date, priorite (haute/normale/basse), recurrence toggle + config RRULE, assignation interne
- Etape 3 : Resume + confirmation

### Wizard Sinistre (5 etapes)

```
[Bien] → [Sinistre] → [Assurance] → [Contacts] → [Confirmation]
   1          2            3              4              5
```

```typescript
export const claimSteps: StepConfig[] = [
  { icon: Building2, label: "Bien" },
  { icon: ShieldAlert, label: "Sinistre" },
  { icon: FileText, label: "Assurance" },
  { icon: Users, label: "Contacts" },
  { icon: Check, label: "Confirmation" },
]
```

- Etape 1 : PropertySelector (required)
- Etape 2 : Titre, description, date de survenance, nature (enum), gravite (4 niveaux), photos
- Etape 3 : Compagnie assurance, numero contrat, numero sinistre, date declaration, expert
- Etape 4 : Prestataires, gestionnaires informes, locataires concernes
- Etape 5 : Resume complet

---

## Detail pages par type

### Tabs par type

```
                INTERVENTION    RAPPEL          SINISTRE
Detail Header      same          simpler        + claim badge + N° sinistre
─────────────────────────────────────────────────────────
Tabs:
  Vue d'ensemble   ✅             ✅              ✅
  Planning         ✅             ✗               ✅ (expertise timeline)
  Documents        ✅             ✅ (optionnel)   ✅ (required)
  Devis            ✅             ✗               ✅
  Messages         ✅             ✗               ✅
  Emails           ✅             ✗               ✅
  Activite         ✅             ✅              ✅
  Assurance        ✗              ✗               ✅ (NOUVEAU)
```

### Rappel detail — Layout simplifie

Single column, pas de sidebar. Cards : ReminderDetailsCard + ReminderNotesCard + ActivityTab.

### Sinistre detail — Layout etendu

2 columns (2/3 + 1/3). Left: details + timeline + documents. Right sidebar: ClaimSummaryCard (assurance, expert, N° dossier) + ParticipantsRow.

### Tab "Assurance" (sinistre uniquement)

- Informations compagnie + contrat
- Expert missionne (contact + dates)
- Timeline indemnisation (etapes avec checkmarks)

---

## Conversion intervention → sinistre

### Mecanique

1. Bouton "Declarer en sinistre" sur la fiche intervention (gestionnaire)
2. Modal de confirmation avec message explicite
3. A la confirmation :
   - Creation dossier `claims` avec les infos de base copiees (titre, description, bien, locataire)
   - `interventions.claim_id` = id du nouveau sinistre
   - L'intervention reste active et devient "intervention enfant" du sinistre
   - Notification locataire via `after()` : "Votre signalement est traite comme un sinistre"
4. Lien bidirectionnel :
   - Fiche intervention : badge "Lie au sinistre #SIN-xxx" (cliquable)
   - Fiche sinistre : section "Interventions liees" avec la liste

### Regles

- Une intervention ne peut etre liee qu'a un seul sinistre
- Un sinistre peut avoir N interventions enfants
- La conversion ne change PAS le statut de l'intervention
- Le gestionnaire peut aussi creer des interventions enfants directement depuis la fiche sinistre

---

## Systeme de recurrence

### Backend : Vercel Cron

```
app/api/cron/recurrence-scan/route.ts
```

- Cron schedule : `0 6 * * *` (tous les jours a 6h)
- Appelle le RPC `scan_pending_recurrences(14)` (SECURITY DEFINER, batch query, zero N+1)
- Pour chaque occurrence pending :
  - Si `auto_create` = true → cree l'entite directement
  - Si `auto_create` = false → cree une notification in-app + push
- Utilise `createServiceRoleSupabaseClient()` (cross-teams)

### Configuration UI

```
[Toggle] Tache recurrente

Frequence: [Quotidien] [Hebdomadaire] [Mensuel] [Annuel] [Personnalise]

Si Hebdomadaire : jours multi-select (L M Me J V S D)
Si Mensuel : radio "Le 15 du mois" / "Le 3e lundi du mois"
Si Personnalise : "Tous les [N] [Semaines|Mois|Annees]"

Fin : [Jamais] [Apres X occurrences] [A la date ...]
```

### Generation d'instances

| Type | Mode | Justification |
|------|------|---------------|
| Rappel simple | Auto-create | Pas d'effet externe, todo interne |
| Rappel avec assignation | Notify J-14 + confirm | Assigne a quelqu'un = engagement |
| Intervention | Notify J-14 + confirm | Implique prestataire = engagement externe |

### Notification J-14

```
"Entretien chaudiere Immeuble A prevu dans 14 jours.
 [Confirmer et assigner] [Reporter] [Ignorer (snooze 7j)]"
```

### Affichage dans les listes

- Par defaut : seule la prochaine occurrence est affichee
- Icone ↻ + tooltip "Recurrence mensuelle — 3 occurrences precedentes"
- Menu ··· → "Voir toutes les occurrences" → timeline chronologique
- Edition : "Modifier cette occurrence" / "Modifier toutes les suivantes" (pattern Google Calendar)

---

## Data Invalidation Broadcast

Etendre `lib/data-invalidation.ts` :

```typescript
type DataEntity =
  | 'buildings' | 'lots' | 'contacts' | 'interventions'
  | 'contracts' | 'stats'
  | 'reminders'     // NOUVEAU
  | 'claims'        // NOUVEAU
```

Nouveaux hooks :
- `useReminders()` — subscribe to `onInvalidation(['reminders'])`
- `useClaims()` — subscribe to `onInvalidation(['claims'])`

Mutation sites : chaque server action de CRUD rappel/sinistre doit `broadcastInvalidation(['reminders'])` / `broadcastInvalidation(['claims'])`.

---

## Notifications et Emails

### Server actions nouvelles (via `after()` pour deferral)

```typescript
// Rappels
createReminderNotification(reminderId)
notifyReminderDueSoon(reminderId, daysUntilDue)

// Sinistres
notifyClaimCreated(claimId)
notifyClaimStatusChange({ claimId, oldStatus, newStatus })
notifyInterventionLinkedToClaim(interventionId, claimId)
```

### Email builders (Phase 1 : rappels)

```
lib/services/domain/email-notification/builders/
  reminder-due-soon.builder.ts       [NOUVEAU]
```

### Email builders (Phase 3 : sinistres)

```
lib/services/domain/email-notification/builders/
  claim-created.builder.ts           [NOUVEAU]
  claim-status-changed.builder.ts    [NOUVEAU]
```

Pattern : suivre `intervention-created.builder.ts` existant. Etendre l'enum notification dans la DB.

---

## Activity Logging

Le `ActivityLogger` (`lib/activity-logger.ts`) est deja generique. Utiliser directement :

```typescript
await logger.log({
  teamId, userId,
  actionType: 'create',
  entityType: 'reminder', // ou 'claim'
  entityId: reminder.id,
  description: `Rappel cree : ${reminder.title}`,
  displayTitle: reminder.title,
})
```

Pas de modification du logger necessaire.

---

## Dashboard

### Phase 1 — Widgets compteurs

```
[Interventions: 12 en cours, 2 en retard]
[Rappels: 5 aujourd'hui, 3 en retard]
[Sinistres: 2 ouverts, 1 expertise en attente]
```

Chaque widget cliquable → page Operations pre-filtree.

### Phase 2 — Section "Ma journee"

```
Ma journee (8 taches)
  Sinistre — Degat des eaux Immeuble B (expertise demain)
  Rappel — Appeler assurance contrat 4521 (echeance aujourd'hui)
  Intervention — Fuite robinet Lot 3B (planifiee 14h)
```

Trie par urgence/priorite tous types confondus.
Implementation : `Promise.all` de 3 queries paralleles (interventions urgentes + rappels du jour + sinistres ouverts) + merge client-side. Pattern existant de parallelisation.

---

## Roles et visibilite

| Fonctionnalite | Gestionnaire | Prestataire | Locataire | Proprietaire |
|----------------|-------------|-------------|-----------|-------------|
| Voir interventions | ✅ | ✅ (assignees) | ✅ (demandees) | ✅ (read-only) |
| Voir rappels | ✅ | ✗ | ✗ | ✗ |
| Voir sinistres | ✅ | ✗ (voit interventions enfants) | ✗ (notifie en lecture) | ✗ |
| Creer interventions | ✅ | ✗ | ✅ (demande) | ✗ |
| Creer rappels | ✅ | ✗ | ✗ | ✗ |
| Creer sinistres | ✅ | ✗ | ✗ | ✗ |
| Segment control visible | ✅ | ✗ | ✗ | ✗ |
| Recurrences | ✅ | ✗ | ✗ | ✗ |

Prestataire, locataire et proprietaire : zero changement dans leurs vues existantes.
Proprietaire : route `/proprietaire/interventions` reste inchangee (pas de rename).

---

## Routes

```
# Route groups (with-navbar vs no-navbar)
app/gestionnaire/(with-navbar)/taches/page.tsx              ← liste unifiee
app/gestionnaire/(no-navbar)/taches/nouvelle-intervention/   ← wizard existant (deplace)
app/gestionnaire/(no-navbar)/taches/nouveau-rappel/          ← wizard nouveau
app/gestionnaire/(no-navbar)/taches/nouveau-sinistre/        ← wizard nouveau
app/gestionnaire/(no-navbar)/taches/interventions/[id]/      ← detail existant (deplace)
app/gestionnaire/(no-navbar)/taches/modifier/interventions/[id]/ ← edit existant (deplace)
app/gestionnaire/(no-navbar)/taches/rappels/[id]/            ← detail nouveau
app/gestionnaire/(no-navbar)/taches/sinistres/[id]/          ← detail nouveau

# Redirects retro-compatibilite (middleware ou next.config.js)
/gestionnaire/interventions/* → /gestionnaire/taches/* (301)

# Prestataire, locataire, proprietaire : inchanges
/prestataire/interventions/[id]               ← inchange
/locataire/interventions/[id]                 ← inchange
/locataire/interventions/nouvelle-demande     ← inchange
/proprietaire/interventions                   ← inchange

# Cron API
app/api/cron/recurrence-scan/route.ts         ← nouveau
```

---

## Phasage d'implementation

### Phase 1 — Rappels + Recurrences Rappels (complexite faible-moyenne)

1. Migration DB : `reminders`, `recurrence_rules`, `recurrence_occurrences` + RLS + indexes + triggers
2. Repository + Service : `reminder.repository.ts`, `reminder.service.ts`
3. Server actions : CRUD rappels + notifications via `after()`
4. Data invalidation : ajouter `'reminders'` a `DataEntity` + hook `useReminders`
5. UI : `RemindersNavigator`, `ReminderCard`, wizard rappel (3 etapes dans `step-configurations.ts`)
6. Detail page : `ReminderDetailClient` (layout simplifie, `(no-navbar)` route group)
7. Segment control : `TaskTypeSegment` sur la page Operations (`(with-navbar)` route group)
8. Recurrence config UI + `rrule.js` integration
9. Vercel Cron : `app/api/cron/recurrence-scan/route.ts` + RPC `scan_pending_recurrences`
10. Email builder : `reminder-due-soon.builder.ts`
11. Dashboard : widget compteur rappels
12. Rename navbar "Interventions" → "Operations" (sidebar + FAB)
13. Redirects `/interventions/` → `/taches/`

### Phase 2 — Recurrences Interventions (complexite moyenne)

1. Etendre le systeme recurrence aux interventions (`source_type: 'intervention'`)
2. Notification J-14 pour interventions recurrentes (Notify-then-confirm)
3. UI recurrence dans wizard intervention (toggle supplementaire)
4. Vue "Maintenance recurrente" sur fiche bien/immeuble
5. Historique occurrences sur detail intervention
6. Calendrier : extension multi-type (rappels due dates + interventions scheduled dates)

### Phase 3 — Sinistres (complexite elevee)

1. Migration DB : `claims`, `claim_timeline_events` + `interventions.claim_id` + RLS + indexes + triggers
2. Repository + Service : `claim.repository.ts`, `claim.service.ts`
3. Server actions : CRUD sinistres + conversion intervention → sinistre + notifications via `after()`
4. Data invalidation : ajouter `'claims'` a `DataEntity` + hook `useClaims`
5. UI : `ClaimsNavigator`, `ClaimCard`, wizard sinistre (5 etapes dans `step-configurations.ts`)
6. Detail page : `ClaimDetailClient` (2 columns + sidebar assurance, `(no-navbar)` route group)
7. Tab "Assurance" + timeline indemnisation
8. Banner contextuel prestataire (intervention enfant d'un sinistre)
9. Email builders : `claim-created.builder.ts`, `claim-status-changed.builder.ts`
10. Dashboard : widget compteur sinistres
11. Documents obligatoires pour sinistres (PV, rapport expert)
12. Section "Ma journee" sur dashboard
13. Note : evaluer integration AI phone (appels signalant des sinistres) comme amelioration future

---

## Risques identifies et mitigations

| Risque | Severite | Mitigation |
|--------|----------|-----------|
| Surcharge cognitive gestionnaire | Critique | Phaser (rappels first), segment non intrusif, compteurs a 0 par defaut |
| Confusion locataire intervention/sinistre | Eleve | Wizard locataire inchange, classification = gestionnaire seul |
| Proliferation recurrences | Eleve | Limite creation aux gestionnaires, vue "Mes recurrences", alerte si non-confirmee 7j |
| Migration interventions existantes | Moyen | Zero migration — tables separees, interventions existantes intactes |
| Marc ignore les sinistres | Moyen | Il ne voit QUE des interventions + banner contextuel (3 taps) |
| Pas de cron system existant | Moyen | Vercel Cron simple + RPC batch (zero N+1) |
| Proprietaire routes cassees | Faible | Routes proprietaire inchangees, pas de rename |

---

## Tests de validation

| Test | Resultat attendu |
|------|-----------------|
| Thomas voit ses rappels du jour en < 10s | Vue Operations filtre "Rappels" + "Aujourd'hui" |
| Thomas prouve 3 ans de maintenance chaudiere en < 30s | Historique occurrences sur recurrence parente |
| Thomas convertit intervention → sinistre en < 3 taps | Bouton action → modal → dossier cree |
| Emma n'est pas exposee a la distinction intervention/sinistre | Wizard locataire inchange |
| Marc voit les infos sinistre en < 3 taps | Banner contextuel sur intervention standard |
| Gestionnaire n'utilisant que les interventions voit zero complexite supplementaire | Segment control present mais non intrusif |
| RLS bloque l'acces cross-team sur reminders/claims | Test integration avec 2 teams differentes |
| Recurrence cron genere les notifications J-14 | Test E2E avec recurrence active + scan |
| Data invalidation broadcast fonctionne pour reminders/claims | Hook recoil sur mutation CRUD |
| Proprietaire voit toujours ses interventions | Route /proprietaire/interventions inchangee |

---

## Issues corrigees dans cette revision

| # | Severite | Description | Fix applique |
|---|----------|-------------|-------------|
| C1 | Critique | `intervention-rules.md` statuts stales | Fichier mis a jour separement |
| C2 | Critique | Duplicate FK `fk_team` | Supprime (inline FK suffit) |
| I3 | Important | Default `status` reminders mismatch | Simplifie a 4 statuts, DEFAULT = `en_attente` |
| I4 | Important | Triggers `updated_at` manquants | Ajoutes pour reminders, claims, recurrence_rules |
| I5 | Important | `claim_timeline_events` sans `team_id` | `team_id` ajoute + RLS |
| I6 | Important | `recurrence_occurrences` sans `team_id` | `team_id` ajoute + RLS |
| I7 | Important | Pas de CHECK XOR sur entites rappel | `num_nonnulls() <= 1` ajoute |
| I8 | Important | Pas de RLS policies | Policies completes pour toutes les tables |
| I9 | Important | Routes (with/no-navbar) non documentees | Route groups explicites |
| I10 | Important | Proprietaire absent | Ajoute au tableau roles |
| I11 | Important | Data invalidation non etendu | Section dediee ajoutee |
| I12 | Important | Calendar incompatible multi-type | Scope interventions-only Phase 1, multi Phase 2 |
| I13 | Important | Email templates non planifies | Section notifications/emails ajoutee |
| I14 | Important | Pas de backend recurrence | Vercel Cron + RPC SECURITY DEFINER |
| W15 | Warning | Indexes manquants | Indexes complets ajoutes |
| W16 | Warning | Pas de `after()` | Mentionne dans server actions et conversion |
| W17 | Warning | Notification actions non listees | 5 nouvelles actions listees |
| W18 | Warning | Recurrence scan N+1 | RPC batch avec JOIN |
| W19 | Warning | `creation_source` non mentionne | Note ajoutee en Phase 3 |
| S20 | Suggestion | Components namespace | `components/reminders/`, `components/claims/` |
| S21 | Suggestion | Dashboard query strategy | `Promise.all` de 3 queries documente |

---

## References

- UX Research : Agent UX/UI Researcher (2026-03-19)
- UI Design : Agent UI Designer (2026-03-19)
- Code Exploration : Agent Explore (2026-03-19)
- Code Review : Agent Code Reviewer (2026-03-19)
- Technical Verification : Agent Explore (2026-03-19)
- Product Context : `.claude/memory-bank/productContext.md`
- System Patterns : `.claude/memory-bank/systemPatterns.md`
- UX Guide : `docs/design/ux-ui-decision-guide.md`
- Intervention Rules : `.claude/rules/intervention-rules.md`
- Sidebar : `components/gestionnaire-sidebar.tsx`
- Step Config : `lib/step-configurations.ts`
- Data Invalidation : `lib/data-invalidation.ts`
- Activity Logger : `lib/activity-logger.ts`
- FAB : `components/ui/fab.tsx`
