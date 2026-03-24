# Plan : Suppression de la catégorie "collocation" des lots

**Date :** 2026-01-31
**Statut :** Validé

## Contexte

La "collocation" n'est pas un type de bien immobilier mais un **mode d'occupation**. Un appartement peut être en collocation, ce n'est pas une caractéristique intrinsèque du lot.

La gestion de la collocation doit se faire au niveau du **bail** (contrat), pas au niveau du lot.

## Nouvelles règles métier

### Validation des contrats (chevauchement)

| Situation | Avant | Après |
|-----------|-------|-------|
| Chevauchement + lot non-collocation | ❌ ERREUR BLOQUANTE | ⚠️ WARNING |
| Chevauchement + lot collocation | ⚠️ WARNING | ⚠️ WARNING |
| Même locataire sur le lot | ❌ ERREUR BLOQUANTE | ❌ ERREUR BLOQUANTE |

**Comportement du warning :**
- Afficher les contrats en chevauchement
- Proposer la prochaine date disponible
- Permettre la création (le gestionnaire décide si c'est une colocation/cohabitation)

### Migration des données

Les lots existants avec `category = 'collocation'` sont convertis en `'appartement'`.

## Fichiers modifiés

### 1. Base de données
- `supabase/migrations/20260131_remove_collocation_category.sql`

### 2. Logique métier
- `app/actions/contract-actions.ts` - Simplifier la logique de chevauchement

### 3. Types et validation
- `lib/lot-types.ts`
- `lib/validation/schemas.ts`
- `lib/services/repositories/lot.repository.ts`
- `lib/services/domain/lot.service.ts`

### 4. Import CSV
- `lib/import/constants.ts`
- `lib/import/validators/lot.validator.ts`
- `lib/services/domain/import.service.ts`

### 5. UI (labels/badges)
- `components/building-contacts-tab.tsx`
- `components/property-selector.tsx`
- `components/ui/lots-with-contacts-preview.tsx`
- `components/patrimoine/building-card-expandable.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx`

## Implémentation

Ordre d'exécution :
1. Migration SQL (convertit données + modifie enum)
2. Régénérer `database.types.ts`
3. Modifier les fichiers TypeScript
4. Mettre à jour l'UI
5. Tester
