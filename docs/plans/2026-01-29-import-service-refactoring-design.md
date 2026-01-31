# Design : Refactorisation Service d'Import avec Geocoding

**Date** : 2026-01-29
**Statut** : En cours d'implémentation
**Auteur** : Claude + Arthur

---

## Contexte

Après la migration des adresses vers une table centralisée (`addresses`), le service d'import (`import.service.ts`) est cassé car il essaie d'insérer les colonnes `address`, `city`, `postal_code`, `country` directement dans `buildings`, alors que ces colonnes n'existent plus.

## Objectifs

1. **Corriger le bug** : Adapter l'import à la nouvelle structure DB
2. **Ajouter le geocoding** : Géolocaliser automatiquement les adresses importées
3. **Couvrir toutes les entités** : Buildings, lots indépendants, companies

---

## Architecture

### Flux d'import refactorisé

```
PARSE EXCEL → GEOCODING BATCH → CREATE ADDRESSES → CREATE ENTITIES
```

### Entités et logique d'adresse

| Entité | Condition | Comportement |
|--------|-----------|--------------|
| Building | Toujours | Créer adresse + geocoder |
| Lot indépendant | `building_name` vide ET `street` rempli | Créer adresse + geocoder |
| Lot lié | `building_name` rempli | Hérite de l'adresse du building |
| Company | `street` OU `city` rempli | Créer adresse + geocoder |

### Geocoding batch

- Rate limiting : max 50 req/sec (limite Google API)
- Batch size : 10 requêtes parallèles
- Délai entre batches : 200ms
- Déduplication par `place_id` existant

---

## Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `lib/services/domain/address.service.ts` | Fix `pays_bas` → `pays-bas` |
| `lib/services/domain/import.service.ts` | Refactor complet avec geocoding |
| `lib/import/types.ts` | Ajouter `ImportPhase: 'geocoding'` |

---

## Implémentation

### Phase 1 : Fix bug pays-bas
- [x] Corriger `mapCountryToEnum()` dans address.service.ts

### Phase 2 : Types
- [x] Ajouter phase 'geocoding' aux types (`lib/import/types.ts`)
- [x] Mettre à jour `ImportProgressEvent.totalPhases` de 5 à 6

### Phase 3 : Import service refactoring
- [x] Ajouter `AddressService` comme dépendance
- [x] Créer méthode `geocodeAddressesBatch()` avec rate limiting
- [x] Créer méthode helper `createAddress()`
- [x] Refactorer `importBuildings()` - geocoding + address_id
- [x] Refactorer `importLots()` - support lots indépendants avec adresse
- [x] Refactorer `importCompanies()` - geocoding + address_id
- [x] Mettre à jour `executeImport()` avec phase geocoding (phase 0)
- [x] Mettre à jour factory function `createServerActionImportService()`

### Phase 4 : Template
- [x] Ajouter mention geocoding dans instructions Excel

### Phase 5 : Validation
- [x] ESLint passé sans erreurs

### Phase 6 : Corrections post-implémentation (2026-01-29)
- [x] Fix warning RLS lots : Utilisation de `skipInitialSelect: true` pour éviter le warning `RLS prevented reading created record`
- [x] Fix erreurs geocoding : Changement de `logger.error` → `logger.warn` et retour `createSuccessResponse(null)` au lieu d'erreurs pour que le geocoding soit optionnel
- [x] Amélioration robustesse : Le geocoding ne bloque plus l'import même si Google API échoue

---

## Résumé des fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `lib/services/domain/address.service.ts` | Fix `pays_bas` → `pays-bas`, geocoding optionnel (non-bloquant) |
| `lib/services/domain/import.service.ts` | Refactoring complet avec geocoding, `skipInitialSelect` pour lots |
| `lib/import/types.ts` | Ajout phase 'geocoding' |
| `lib/import/template-generator.ts` | Note geocoding dans instructions |

---

## Notes techniques

### Gestion RLS pour les lots créés
Le warning `RLS prevented reading created record` n'est **pas une erreur** - c'est un comportement attendu car :
1. Le lot est créé avec succès (INSERT passe)
2. Le SELECT après INSERT échoue car les politiques RLS requièrent que le gestionnaire soit dans `lot_contacts`
3. Le gestionnaire est ajouté **après** la création du lot

Solution : Utilisation de `skipInitialSelect: true` pour éviter le SELECT inutile.

### Geocoding optionnel
Le geocoding est maintenant **non-bloquant** :
- Les erreurs Google API (REQUEST_DENIED, OVER_QUERY_LIMIT, etc.) retournent `null` au lieu d'erreurs
- L'adresse est créée sans coordonnées GPS si le geocoding échoue
- L'import continue normalement

---

*Dernière mise à jour : 2026-01-29*
*Statut : ✅ Implémentation terminée + corrections post-test*
