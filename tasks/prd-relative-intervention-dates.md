# PRD: Dates relatives pour interventions du bail

## Problème

Dans le wizard de création de bail (étape Interventions), les dates sont affichées comme des dates brutes via un DatePicker (ex: "01/12/2026"). L'utilisateur ne comprend pas intuitivement la logique derrière : est-ce 11 mois après le début ? 1 mois avant la fin ? La date seule ne porte pas de sens métier.

## Solution

Remplacer le DatePicker par un **Select dropdown** avec des options relatives propres à chaque type d'intervention :
- "Le jour du début du bail"
- "12 mois après le début"
- "1 mois avant l'échéance"
- "Lendemain expiration assurance (02/12/2030)" ← option dynamique si date d'expiration renseignée
- "Date personnalisée" ← ouvre un DatePicker

La date calculée s'affiche à côté du dropdown en lecture seule pour que l'utilisateur voie le résultat concret.

## Scope

### Fichiers à modifier

1. **`lib/constants/lease-interventions.ts`** — Ajouter les `schedulingOptions` par template (options relatives)
2. **`components/contract/intervention-schedule-row.tsx`** — Remplacer DatePicker par Select + DatePicker conditionnel + date affichée
3. **`components/contract/intervention-schedule-row.tsx`** — Enrichir `ScheduledInterventionData` avec `selectedSchedulingOption`
4. **`components/contract/lease-interventions-step.tsx`** — Propager le nouveau handler `onSchedulingOptionChange`
5. **`components/contract/contract-form-container.tsx`** — Initialiser `selectedSchedulingOption` avec la valeur par défaut du template + gérer l'option dynamique assurance

### Options relatives par intervention

| Intervention | Options dropdown | Défaut |
|---|---|---|
| État des lieux d'entrée | Jour du début, 1 sem avant début, Date perso | Jour du début |
| Indexation loyer | 12 mois après début, 11 mois après début, Date perso | 12 mois après début |
| Indexation charges | 12 mois après début, 11 mois après début, Date perso | 12 mois après début |
| Régularisation charges | 12 mois après début, 11 mois après début, Date perso | 12 mois après début |
| Rappel assurance | 11 mois après début, 1 mois avant échéance, [Lendemain expiration assurance], Date perso | 11 mois après début (ou lendemain expiration si dispo) |
| État des lieux de sortie | 1 mois avant échéance, 2 sem avant échéance, Jour de l'échéance, Date perso | 1 mois avant échéance |
| Documents manquants | 7 jours, 14 jours, 1 mois, Date perso | 7 jours |

### Comportement UX

1. Quand l'utilisateur change le dropdown → la date se recalcule automatiquement
2. Quand il choisit "Date personnalisée" → un DatePicker apparaît sous le Select
3. La date calculée est toujours affichée en texte lisible (ex: "02 décembre 2030")
4. Badge "Auto" conservé quand une option relative (non personnalisée) est sélectionnée
5. Si la date de début ou durée du bail change → les dates relatives se recalculent

### Option dynamique assurance

Si l'utilisateur a renseigné une date d'expiration sur l'attestation d'assurance (étape Documents), une option supplémentaire apparaît dans le dropdown du `insurance_reminder` :
- Label : "Lendemain expiration assurance (JJ/MM/AAAA)"
- Valeur : `insurance_expiry_next_day`
- Cette option devient le défaut si elle existe

## Hors scope

- Pas de changement dans la logique de soumission (handleSubmit) — on envoie toujours `scheduledDate`
- Pas de changement dans les interventions de documents manquants (elles gardent leur logique simple)
- Pas de persistance de l'option choisie en DB — seule la date finale est persistée
