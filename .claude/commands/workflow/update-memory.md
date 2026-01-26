---
name: update-memory
description: Mise à jour complète du memory bank après une session de travail
---

# Update Memory Bank

Mise à jour complète du memory bank après une session de travail significative.

## Étapes

### 1. Identifier les changements

```bash
# Fichiers modifiés depuis le dernier commit
git diff --name-only HEAD~5

# Fichiers trackés par les hooks
cat .claude/auto-memory/dirty-files
```

### 2. Catégoriser les changements

| Type de changement | Fichier à mettre à jour |
|-------------------|------------------------|
| Schema DB modifié | techContext.md |
| Nouveau pattern | systemPatterns.md |
| Nouvelle feature | productContext.md |
| Travail en cours | activeContext.md |
| Session terminée | progress.md |

### 3. Mettre à jour techContext.md

Si schema Prisma/Supabase modifié :
1. Régénérer les types si nécessaire : `npm run supabase:types`
2. Mettre à jour la section Database Schema
3. Mettre à jour les relations si nouvelles FK
4. Vérifier les fonctions RLS

### 4. Mettre à jour systemPatterns.md

Si nouveau pattern détecté :
1. Documenter le pattern avec exemple
2. Ajouter à la section appropriée
3. Inclure les fichiers de référence

### 5. Mettre à jour productContext.md

Si nouvelle feature :
1. Ajouter à la section appropriée (✅ ou 🚧)
2. Documenter les composants clés
3. Mettre à jour les frustrations résolues si applicable

### 6. Mettre à jour activeContext.md

1. Mettre à jour "Focus Actuel"
2. Cocher les tâches complétées
3. Ajouter les décisions prises
4. Lister les prochaines étapes
5. Ajouter notes pour prochaine session

### 7. Mettre à jour progress.md

1. Ajouter une entrée pour cette session :
   ```markdown
   ### YYYY-MM-DD - [Titre de la session]
   **Ce qui a été fait:**
   - Item 1
   - Item 2

   **Fichiers clés modifiés:**
   - `path/to/file1.ts`
   - `path/to/file2.ts`
   ```

2. Mettre à jour les métriques si changées
3. Ajouter aux décisions techniques si applicable

### 8. Validation

Vérifier que tous les fichiers memory-bank sont cohérents :
- Les dates sont à jour
- Les références croisées sont correctes
- Les métriques correspondent à la réalité

### 9. Commit

```bash
git add .claude/memory-bank/
git commit -m "docs: update memory bank after [description]"
```

## Output Attendu

```markdown
## Memory Bank Update Report

### Session: YYYY-MM-DD

### Fichiers mis à jour
- [x] activeContext.md - Focus + prochaines étapes
- [x] progress.md - Nouvelle entrée session
- [ ] techContext.md - Pas de changement schema
- [ ] systemPatterns.md - Pas de nouveau pattern
- [ ] productContext.md - Feature X ajoutée

### Métriques mises à jour
| Métrique | Avant | Après |
|----------|-------|-------|
| Components | 270 | 275 |

### Prochaine action recommandée
Exécuter `/sync-memory` dans 1 semaine
```
