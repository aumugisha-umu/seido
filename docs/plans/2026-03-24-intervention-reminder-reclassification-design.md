# Reclassification Interventions → Rappels dans les Wizards de Création

**Date:** 2026-03-24
**Status:** Validated
**Scope:** Bail wizard, Contrat fournisseur wizard

## Contexte

Les wizards de création (bail, contrat fournisseur) créent tous les suivis comme des "interventions", même ceux qui sont des tâches administratives internes au gestionnaire. Le système de rappels (`reminders` table + récurrence RRULE) existe déjà et est plus adapté pour ces items.

**Critère de distinction :** Un item est une **intervention** s'il implique un acteur externe (prestataire/locataire) ou du travail terrain. C'est un **rappel** s'il s'agit d'une tâche administrative interne au gestionnaire.

## Reclassement

### Bail (6 items impactés)

| Item | Avant | Après | Récurrence auto |
|------|-------|-------|----------------|
| État des lieux d'entrée | Intervention | **Intervention** | — |
| État des lieux de sortie | Intervention | **Intervention** | — |
| Indexation du loyer | Intervention | **Rappel** | RRULE annuelle |
| Indexation forfait charges | Intervention | **Rappel** | RRULE annuelle |
| Régularisation des charges | Intervention | **Rappel** | RRULE annuelle |
| Rappel assurance | Intervention | **Rappel** | RRULE annuelle |
| Rappel loyer | Rappel (inchangé) | **Rappel** | Mensuel |
| Documents manquants | Intervention | **Rappel** | Unique |

### Contrat fournisseur (1 item impacté)

| Item | Avant | Après | Récurrence auto |
|------|-------|-------|----------------|
| Rappel échéance contrat | Intervention | **Rappel** | Unique |
| Interventions personnalisées | Intervention | **Intervention** | — |

### Immeuble / Lot — Aucun changement

Tous les items (chaudière, ascenseur, PEB, incendie, nettoyage, espaces verts) restent des interventions car ils nécessitent un prestataire.

## Architecture UI

### Structure des sections dans le wizard

Deux sections distinctes dans la même étape. Zone d'ajout custom unifiée en haut avec bouton unique + popover de choix :

```
┌─────────────────────────────────────────────┐
│  Planifier les suivis du bail               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │ Tâches personnalisées                 │  │
│  │  + Ajouter un suivi                   │  │
│  │    ┌──────────────────────────────┐   │  │
│  │    │ Ce suivi implique-t-il       │   │  │
│  │    │ quelqu'un d'autre ?          │   │  │
│  │    │                              │   │  │
│  │    │ [🔧 Oui → Intervention]      │   │  │
│  │    │ Prestataire, locataire...    │   │  │
│  │    │                              │   │  │
│  │    │ [🔔 Non → Rappel]            │   │  │
│  │    │ Tâche admin interne          │   │  │
│  │    └──────────────────────────────┘   │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                             │
│  ─────────── séparateur ───────────         │
│                                             │
│  🔧 INTERVENTIONS (indigo)                  │
│  Suivis standard du bail                    │
│  ☑ État des lieux d'entrée    [date] [👤]  │
│  ☑ État des lieux de sortie   [date] [👤]  │
│  ☑ [Custom intervention]      [date] [👤]  │
│                                             │
│  ─────────── séparateur ───────────         │
│                                             │
│  🔔 RAPPELS (amber) — réduit par défaut     │
│     sur mobile, expanded sur desktop        │
│  Rappels de paiement                        │
│  ☑ Rappel de paiement du loyer  [jour] [👤]│
│                                             │
│  Rappels administratifs (4 actifs) ▾        │
│  ☑ Indexation du loyer          [date] [👤]│
│  ☑ Indexation forfait charges   [date] [👤]│
│  ☑ Régularisation des charges   [date] [👤]│
│  ☑ Rappel assurance             [date] [👤]│
│                                             │
│  Documents à récupérer                      │
│  ☑ Récupérer attestation X      [date]     │
│  ☑ [Custom rappel]              [date] [👤]│
│                                             │
└─────────────────────────────────────────────┘
```

Contrat fournisseur — même pattern : bouton unique + popover, interventions custom en haut, rappels échéances en bas.

Immeuble / Lot — inchangé (que des interventions, pas de section rappels).

### Distinction visuelle

| Élément | Interventions | Rappels |
|---------|--------------|---------|
| Icône section | Wrench (bleu/indigo) | Bell (amber/orange) |
| Bordure gauche rows | `border-l-indigo-500` | `border-l-amber-500` |
| Fond rows | `bg-indigo-50/40` (light) / `bg-indigo-950/20` (dark) | `bg-amber-50/40` (light) / `bg-amber-950/20` (dark) |
| Badge récurrence | — | "Annuel" ou "Mensuel" + tooltip "Rappel créé automatiquement chaque année" |
| Checkbox | Identique | Identique |
| Date picker | Identique | Identique |
| Assignment | Tous rôles (gestionnaire, prestataire, locataire) | Gestionnaire uniquement — header popover "Assigner à un gestionnaire" |

### UX Adjustments (validated by UX Researcher)

1. **Section rappels réduite par défaut sur mobile** — en-tête cliquable "Rappels administratifs (N actifs) ▾", expanded par défaut sur desktop (progressive disclosure)
2. **Fond coloré léger** en plus de la bordure gauche — différenciation visible en scroll rapide mobile
3. **Bouton unique "+ Ajouter un suivi"** → popover binaire "Ce suivi implique-t-il quelqu'un d'autre ?" → Oui = intervention, Non = rappel (élimine la friction de classification)
4. **Tooltip sur badge récurrence** — "Rappel créé automatiquement chaque année/mois" au hover/tap
5. **Assignation rappels adaptée** — header "Assigner à un gestionnaire", auto-assign si un seul gestionnaire dans l'équipe (1 tap)

## Données et création serveur

### Type étendu dans le wizard

```typescript
interface ScheduledItemData extends ScheduledInterventionData {
  itemType: 'intervention' | 'reminder'
  recurrenceRule?: string           // RRULE string (RFC 5545), null = unique
  linkedEntityType?: 'contract' | 'building' | 'lot'
  linkedEntityId?: string
}
```

### Création à la soumission

**Interventions** → `interventions` table (inchangé)

**Rappels** → `reminders` table :
```typescript
{
  title, description,
  due_date: scheduledDate,
  priority: "normale",
  status: "en_attente",
  assigned_to: assignedUsers[0]?.userId,
  contract_id / building_id / lot_id,  // lien XOR
}
```

**Rappels avec récurrence** → `reminders` + `recurrence_rules` :
```typescript
{
  rrule: "FREQ=YEARLY;INTERVAL=1",
  dtstart: scheduledDate,
  source_type: "reminder",
  source_template: { wizard_key, contract_id },
  is_active: true,
  auto_create: true,
}
```

### Lien entité XOR

| Contexte | contract_id | building_id | lot_id |
|----------|-------------|-------------|--------|
| Bail | bail créé | — | — |
| Contrat fournisseur | contrat créé | — | — |

## Fichiers impactés (~10 modifications, 0 nouveau, 0 migration)

### Constants
- `lib/constants/lease-interventions.ts` — split templates: `LEASE_INTERVENTION_TEMPLATES` (2 EDL) + `LEASE_REMINDER_TEMPLATES` (4 admin) + champ `recurrenceRule`
- `lib/constants/supplier-interventions.ts` — `createSupplierReminderIntervention()` retourne `itemType: 'reminder'`

### Types
- `components/contract/intervention-schedule-row.tsx` — étendre `ScheduledInterventionData` avec `itemType`, `recurrenceRule`, `linkedEntityType`

### Composant planner (UI)
- `components/contract/intervention-planner-step.tsx` — sections interventions + rappels avec styles distincts
- `components/contract/intervention-schedule-row.tsx` — bordure conditionnelle, badge récurrence, restriction rôles

### Wrappers wizard
- `components/contract/lease-interventions-step.tsx` — restructurer sections, zone custom unifiée
- `components/contract/contract-form-container.tsx` — section rappels échéances fournisseur

### Server actions
- `app/actions/contract-actions.ts` — dispatcher intervention vs reminder à la création
- `app/actions/supplier-contract-actions.ts` — idem
