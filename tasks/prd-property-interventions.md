# PRD: Interventions planifiées pour Immeubles & Lots

## Contexte

Lors de la création d'un bail, SEIDO propose automatiquement des interventions planifiées (état des lieux, indexation, assurance...) avec dates relatives et assignation de contacts. Cette même logique doit s'appliquer à la création d'immeubles et de lots pour les interventions techniques récurrentes (entretien chaudière, contrôle ascenseur, PEB, sécurité incendie, etc.).

## Objectif

Ajouter une étape "Interventions" dans les flux de création d'immeuble et de lot, réutilisant les composants existants (`InterventionScheduleRow`, `ContactSelector`) avec un système de templates adapté aux biens immobiliers.

## Périmètre

### In scope
- Nouveau fichier de constantes `property-interventions.ts` (templates immeuble + lot)
- Composant générique `PropertyInterventionsStep` réutilisable (immeuble ET lot)
- Nouvelle étape dans le flux de création d'immeuble (step 4 → confirmation devient step 5)
- Nouvelle étape dans le flux de création de lot (step 4 → confirmation devient step 5)
- Dates dynamiques : basées sur échéance du document lié si renseignée, sinon depuis date de création
- Interventions pour documents manquants (même pattern que le bail)
- Création des interventions via `createInterventionAction` à la soumission

### Out of scope
- Modification du flux de création de bail (déjà implémenté)
- Récurrence automatique des interventions (future feature)
- Dashboard agrégé des interventions planifiées

## Personas impactés

- **Gestionnaire** (70% users) : Crée les biens, planifie les interventions techniques
- **Prestataire** (assigné) : Recevra les interventions créées

## Interventions recommandées

### Immeuble

| Intervention | Type code DB | Document lié | Scheduling par défaut | Activée par défaut |
|---|---|---|---|---|
| Entretien chaudière | `chauffage` | `entretien_chaudiere` | Échéance doc ou +24 mois | Oui |
| Contrôle ascenseur | `ascenseur` | `controle_ascenseur` | Échéance doc ou +12 mois | Oui |
| Contrôle sécurité incendie | `securite_incendie` | — | +12 mois | Oui |
| Renouvellement PEB | `autre_technique` | `certificat_peb` | Échéance doc ou +120 mois | Non (long terme) |
| Nettoyage parties communes | `nettoyage` | — | +1 mois | Non |
| Entretien espaces verts | `espaces_verts` | — | +3 mois | Non |

### Lot (standalone, sans immeuble)

| Intervention | Type code DB | Document lié | Scheduling par défaut | Activée par défaut |
|---|---|---|---|---|
| Entretien chaudière | `chauffage` | `entretien_chaudiere` | Échéance doc ou +24 mois | Oui |
| Renouvellement PEB | `autre_technique` | `certificat_peb` | Échéance doc ou +120 mois | Non |

### Lot dans un immeuble

Les lots dans un immeuble n'ont PAS d'entretien chaudière (géré au niveau immeuble). Seuls les documents manquants génèrent des interventions.

### Documents manquants (tous contextes)

Chaque document recommandé non uploadé génère une intervention "Récupérer: {label}" avec type `autre_administratif`, planifiée dans 7 jours par défaut (identique au bail).

## Scheduling dynamique

Pour chaque intervention liée à un document :
1. Si le document a une date d'expiration renseignée → option dynamique "X jours/mois avant expiration" (prioritaire)
2. Sinon → options relatives depuis la date de création du bien (+12 mois, +24 mois, etc.)
3. Toujours → option "Date personnalisée" (DatePicker)

## Architecture technique

### Réutilisation maximale

| Composant existant | Rôle | Modifications |
|---|---|---|
| `InterventionScheduleRow` | Ligne avec checkbox + schedule + assign | Aucune (déjà générique) |
| `ContactSelector` | Modal d'assignation | Aucune |
| `ScheduledInterventionData` | Type de données | Aucune |
| `createInterventionAction` | Server action de création | Paramètre `building_id` ou `lot_id` |

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `lib/constants/property-interventions.ts` | Templates d'interventions pour immeubles et lots |
| `components/property-interventions-step.tsx` | Composant step générique (paramétré par entity type) |

### Fichiers modifiés

| Fichier | Modification |
|---|---|
| `lib/step-configurations.ts` | Ajouter step "Interventions" aux building/lot steps |
| `building-creation-form.tsx` | Ajouter step 4 Interventions, décaler confirmation à step 5 |
| `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` | Idem pour lots |
| `lib/constants/lease-interventions.ts` | Extraire `CUSTOM_DATE_VALUE` et types partagés dans un fichier commun (ou réexporter) |

## Acceptance Criteria

1. Step "Interventions" visible et fonctionnelle dans la création d'immeuble
2. Step "Interventions" visible et fonctionnelle dans la création de lot
3. Les interventions recommandées sont correctement filtrées selon le type d'entité
4. Les dates dynamiques basées sur l'échéance du document fonctionnent
5. Les interventions pour documents manquants apparaissent
6. L'assignation de contacts fonctionne via ContactSelector
7. Les interventions sont créées en DB à la soumission
8. Toggle enable/disable + date personnalisée fonctionnent
9. Typecheck passe (`npm run lint`)
10. Pas de régression sur le flux de création de bail existant
