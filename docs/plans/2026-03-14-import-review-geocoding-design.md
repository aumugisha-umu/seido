# Design: Import Review + Simplify + Deferred Geocoding

**Date**: 2026-03-14
**Status**: Validated

---

## Contexte

La section gestionnaire/import (~7,700 LOC, 30+ fichiers) necessite :
1. Review fonctionnelle exhaustive
2. Simplify du code existant
3. Geocoding differe (ne plus bloquer l'import avec Phase 0 geocoding)

## Architecture — Geocoding differe

### Flux actuel
```
Upload → Validate → [GEOCODE 25s bloquant] → Companies → Contacts → Buildings → Lots → Contracts → Result
```

### Nouveau flux
```
Upload → Validate → Companies → Contacts → Buildings → Lots → Contracts → Result (quelques secondes)
                                                                              ↓
                                                          after() → Geocode batch en background
```

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `import.service.ts` | Supprimer Phase 0 geocoding du pipeline synchrone. Creer adresses sans coordonnees. Retourner liste address_id a geocoder |
| `app/api/import/execute-stream/route.ts` | Apres resultat, lancer after() pour geocoder |
| `import-step-progress.tsx` | Supprimer indicateur Phase 0 geocoding. Garder 5 phases |
| `address.service.ts` | Ajouter geocodePendingAddresses(addressIds) |

### Principes
- Forms : deja bien geres (Google Places client-side), pas toucher
- Import : geocoding non-critique, differe via after()
- Pas de composant dashboard pour le geocoding (YAGNI)
- Les coordonnees apparaissent quand l'utilisateur consulte l'entite

## Review + Simplify Scope

- 7 composants import (1,476 LOC)
- 6 validators (1,552 LOC) — potentiel de factorisation
- 1 service import (1,876 LOC) — plus gros fichier
- 1 hook wizard (581 LOC) — state management
- Constants (1,096 LOC) — probablement du bloat
- Types (385 LOC)
- Excel parser (349 LOC)
- Template generator (315 LOC)
