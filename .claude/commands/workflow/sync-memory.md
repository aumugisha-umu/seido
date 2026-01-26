---
name: sync-memory
description: Synchronisation rapide du memory bank avec le code
---

# Sync Memory Bank

Synchronisation rapide du memory bank avec l'état actuel du code.

## Étapes

### 1. Vérifier les drifts
```bash
node .claude/scripts/check-memory-drift.js
```

### 2. Lire les fichiers modifiés récemment
```bash
cat .claude/auto-memory/dirty-files
```

### 3. Pour chaque drift détecté

| Drift | Action |
|-------|--------|
| techContext.md STALE | Comparer avec `lib/database.types.ts` et `package.json` |
| systemPatterns.md STALE | Vérifier `lib/services/` pour nouveaux patterns |
| productContext.md STALE | Vérifier `app/` et `components/` pour nouvelles features |

### 4. Fichiers à Vérifier

- `techContext.md` vs `lib/database.types.ts`
- `systemPatterns.md` vs `lib/services/`
- `activeContext.md` vs git status
- `progress.md` vs dernières sessions

### 5. Mettre à jour les fichiers concernés

Pour chaque fichier memory-bank désynchronisé :
1. Lire la source de vérité (code)
2. Proposer les corrections
3. Mettre à jour avec le timestamp

### 6. Mettre à jour last-sync

```bash
echo "$(date -Iseconds)" > .claude/auto-memory/last-sync
```

## Après Synchronisation

```bash
git add .claude/memory-bank/
git commit -m "docs: sync memory bank"
```

## Output Attendu

```markdown
## Memory Bank Sync Report

### Drifts Détectés
- [ ] techContext.md - X tables added
- [ ] systemPatterns.md - Y services added

### Actions Effectuées
- Updated techContext.md
- Updated progress.md

### Next Sync Recommended
Dans 1 semaine ou après modifications majeures
```
