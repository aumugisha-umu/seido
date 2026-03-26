# Reminder Recurrence UX & Property Reclassification

**Date**: 2026-03-25
**Status**: Validated
**Scope**: All creation wizards (lease, supplier contract, building, lot)

## Context

Reminders have `recurrenceRule` (RFC 5545 RRULE) but no UI to modify it. The badge "Annuel"/"Mensuel" is read-only. Property templates lack `itemType` classification. Users can't choose between intervention vs reminder per item.

## Design Decisions

### 1. InterventionScheduleRow — Toggle type + Badge récurrence interactif

**Toggle Intervention/Rappel**: Segmented control compact (2 boutons icône) entre l'icône et le titre, visible quand `enabled`:
- Bouton gauche: icône `Wrench` (intervention, indigo)
- Bouton droite: icône `Bell` (rappel, amber)
- Actif = fond coloré, inactif = ghost
- Changer le type met à jour: `itemType`, couleur `border-l`, rôles assignables (rappel → gestionnaire only)
- Si intervention→rappel avec locataires/prestataires assignés: les retirer automatiquement

**Badge récurrence interactif**: Le badge "Annuel" devient `PopoverTrigger`. Au clic:
- Options prédéfinies: Mensuel, Trimestriel, Semestriel, Annuel (boutons radio)
- Option personnalisée: "Tous les `[number]` `[mois/ans]`" → génère RRULE
- Option "Pas de récurrence": supprime `recurrenceRule`, badge disparaît
- Si aucune récurrence: bouton `+ Récurrence` (icône RefreshCw, ghost discret)
- S'affiche pour les DEUX types (intervention ET rappel)

**Nouvelles props**:
- `onItemTypeChange?: (type: 'intervention' | 'reminder') => void`
- `onRecurrenceChange?: (rrule: string | null) => void`

### 2. Templates & Sections

**Lease** (`lease-interventions.ts`):
- 4 rappels: `itemType: 'reminder'` + `recurrenceRule: 'FREQ=YEARLY;INTERVAL=1'`
- 2 états des lieux: `itemType: 'intervention'`, pas de récurrence
- Tous les templates reçoivent `itemType` explicitement

**Property** (`property-interventions.ts`):
- 9 templates (building + lot + lot_in_building): `itemType: 'reminder'` par défaut
- Récurrence ajoutée:
  - Chaudière: `FREQ=YEARLY;INTERVAL=1`
  - Ascenseur: `FREQ=YEARLY;INTERVAL=1`
  - Sécurité incendie: `FREQ=YEARLY;INTERVAL=1`
  - PEB: `FREQ=YEARLY;INTERVAL=10`
  - Nettoyage/espaces verts: `FREQ=MONTHLY;INTERVAL=1`
- Missing docs: `itemType: 'reminder'`, pas de récurrence

**Supplier** (`supplier-interventions.ts`):
- `createSupplierReminderIntervention`: récurrence annuelle par défaut
- Custom: `itemType` défini à la création

**Sections**: Plus de séparation stricte intervention/rappel par section. Le toggle sur chaque row distingue visuellement. Sections séparées conservées pour: rent reminders (custom UI), missing docs.

### 3. PropertyInterventionsStep — Propagation complète

- `useEffect` propage `itemType` et `recurrenceRule` depuis templates
- Handlers `onItemTypeChange` et `onRecurrenceChange` via `onInterventionsChange`
- Popover "Ajouter un suivi": choix Intervention / Rappel
- Submit split par `itemType`: intervention → `createInterventionAction`, reminder → `createWizardRemindersAction`

### 4. RRULE Helper

Nouveau `lib/utils/rrule.ts` (~30 lignes):
```typescript
buildRRule(frequency: 'MONTHLY' | 'YEARLY', interval: number): string
parseRRule(rrule: string): { frequency: string; interval: number }
RECURRENCE_PRESETS = [
  { label: 'Mensuel', rrule: 'FREQ=MONTHLY;INTERVAL=1' },
  { label: 'Trimestriel', rrule: 'FREQ=MONTHLY;INTERVAL=3' },
  { label: 'Semestriel', rrule: 'FREQ=MONTHLY;INTERVAL=6' },
  { label: 'Annuel', rrule: 'FREQ=YEARLY;INTERVAL=1' },
]
```

### 5. Server-side Dispatch

- **Lease submit**: Already splits by `itemType`. Propagate user-modified `recurrenceRule`.
- **Supplier submit**: Same split pattern.
- **Property submit**: Add split — currently all go to `createInterventionAction`.
- **Cleanup**: Filter non-gestionnaire assignees from reminder items at submit time.
- **No DB changes**: Tables support everything already.

## Files Impacted

| File | Action | Size |
|------|--------|------|
| `components/contract/intervention-schedule-row.tsx` | Toggle type + badge récurrence popover | M |
| `lib/utils/rrule.ts` | **New** — build/parse/presets | XS |
| `lib/constants/lease-interventions.ts` | Explicit `itemType` on all templates | XS |
| `lib/constants/property-interventions.ts` | `itemType: 'reminder'` + `recurrenceRule` on 9 templates | S |
| `lib/constants/supplier-interventions.ts` | `recurrenceRule` on reminder factory | XS |
| `components/property-interventions-step.tsx` | Propagate itemType/recurrenceRule, handlers, split submit | S |
| `components/contract/intervention-planner-step.tsx` | Pass new handlers to rows, remove sectionType | S |
| `components/contract/lease-interventions-step.tsx` | Remove strict section separation, adapt grouping | S |
| `components/contract/contract-form-container.tsx` | Propagate handlers, cleanup assignation at submit | S |
