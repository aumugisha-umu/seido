# Plan: Page Lot Details pour Locataire

## Context

Le dashboard locataire affiche les infos lot dans la card mauve, mais il n'y a aucune page de détails dédiée. Le gestionnaire a une page complète à `/gestionnaire/biens/lots/[id]` avec 6 tabs. On veut réutiliser ce composant avec un `role` prop pour offrir une vue scoped au locataire (3 tabs: Contrats, Interventions, Documents).

## Architecture

**Approche**: Shared client component (`LotDetailsClient`) avec `role` prop + server pages séparées par rôle.

## Changements

### 1. Bouton "Voir les détails" dans la card mauve

**Fichier**: `components/dashboards/locataire-dashboard-hybrid.tsx`

- Bouton outlined blanc sous la ligne détails propriété (étage/porte/description)
- Visible uniquement quand un lot spécifique est sélectionné (pas "Vue d'ensemble")
- Icône `ExternalLink` + texte "Voir les détails"
- Lien vers `/locataire/lots/{currentProperty.id}`

### 2. Server page locataire

**Nouveau fichier**: `app/locataire/(no-navbar)/lots/[id]/page.tsx`

```
1. Auth: getServerAuthContext('locataire')
2. Vérifier accès: contract_contacts where user_id AND lot_id
   → redirect('/locataire/dashboard') si pas d'accès
3. Fetch parallèle:
   - lotService.getByIdWithRelations(id)
   - contractService.getContractsByLotId(id)
   - interventionService.getByLotId(id)
   - interventionService.getDocumentsByInterventionIds(...)
4. Render <LotDetailsClient role="locataire" ... />
   - contacts=[] buildingContacts=[] (vides)
```

### 3. Refactoring LotDetailsClient

**Fichier**: `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx`

**Nouveau prop**:
```ts
role?: 'gestionnaire' | 'locataire'  // default: 'gestionnaire'
```

**Comportement par rôle**:

| Aspect | Gestionnaire | Locataire |
|--------|-------------|-----------|
| Tabs | 6 (overview, contracts, interventions, documents, emails, activity) | 3 (contracts, interventions, documents) |
| Tab par défaut | overview | contracts |
| Header actions | Modifier + Créer intervention + dropdown | Aucune |
| Bouton retour | → building ou /gestionnaire/biens | → /locataire/dashboard |
| InterventionsNavigator | userContext="gestionnaire" | userContext="locataire" |
| Liens interventions | /gestionnaire/interventions/... | /locataire/interventions/... |
| Liens contrats | /gestionnaire/contrats/... | Pas de click-through |
| Props optionnels | — | contacts, buildingContacts deviennent optionnels |

**Filtrage tabs**:
```ts
const visibleTabs = role === 'locataire'
  ? lotTabs.filter(t => ['contracts','interventions','documents'].includes(t.value))
  : lotTabs
```

## Sécurité

- RLS existant sur `lots` SELECT via `get_accessible_lot_ids()` couvre déjà les locataires via `contract_contacts`
- Guard explicite côté serveur: vérifier `contract_contacts` avant de fetch
- Pas de nouvelles policies RLS nécessaires

## Ce qui ne change PAS

- Page gestionnaire lot details: inchangée (role default = 'gestionnaire')
- Pipeline de données locataire (tenant.service.ts, etc.)
- RLS policies existantes
- Sub-composants (ContractsNavigator, InterventionsNavigator, PropertyDocumentsPanel)

## Vérification

1. Bouton "Voir les détails" visible uniquement quand lot sélectionné
2. Page locataire affiche 3 tabs (Contrats, Interventions, Documents)
3. Pas de boutons Modifier/Supprimer/Créer intervention
4. Bouton retour → /locataire/dashboard
5. URL guessing /locataire/lots/wrong-id → redirect dashboard
6. Page gestionnaire inchangée (regression check)
7. `npm run lint` passe
