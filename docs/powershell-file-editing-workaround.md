# PowerShell File Editing Workaround

## 🚨 Problème Récurrent

Lors de l'édition de fichiers volumineux (>700 lignes) dans le projet, **l'outil Edit échoue systématiquement** avec l'erreur :

```
File has been unexpectedly modified. Read it again before attempting to write it.
```

### Cause Racine

**VSCode Auto-Save + Formatter** modifie le fichier en arrière-plan entre le moment où Claude lit le fichier et tente de l'écrire, causant un conflit de version.

## ❌ Solutions Tentées Sans Succès

### 1. Attendre entre les éditions
```typescript
// ❌ Ne fonctionne pas - VSCode modifie toujours le fichier
await sleep(1000)
Edit(file, oldString, newString)
```

### 2. PowerShell avec Regex Pattern Matching
```powershell
# ❌ Échoue avec caractères accentués et patterns multilignes
$oldPattern = [regex]::Escape("{/* ÉTAPE 3: Grille heures */}") + "[\s\S]*?" + ...
$content -replace $oldPattern, $newCode
```

**Problèmes** :
- ❌ Caractères accentués (É, à, ç) mal encodés en PowerShell
- ❌ Patterns multilignes complexes difficiles à matcher
- ❌ `[\s\S]*?` ne match pas toujours correctement

### 3. Demander à l'utilisateur de désactiver auto-save
```
❌ Trop contraignant pour le workflow utilisateur
```

## ✅ Solution Qui Fonctionne

### **Approche par Numéros de Ligne avec PowerShell**

Au lieu de matcher des patterns regex, **remplacer directement un range de lignes par indices** :

```powershell
# ✅ CORRECT - Remplacement par indices de lignes
$filePath = "c:\Users\arthu\Desktop\Coding\Seido-app\components\interventions\interventions-calendar-view.tsx"

# Lire toutes les lignes en array
$lines = Get-Content -Path $filePath -Encoding UTF8

# Nouveau code (multilignes OK avec heredoc)
$newBlock = @'
            {/* Vue semaine : Grille scrollable */}
            <div className="grid grid-cols-8">
              {/* Contenu ici */}
            </div>
'@

# Remplacer lignes 708-745 (indices 707-744 en 0-based)
$before = $lines[0..706]
$after = $lines[745..($lines.Count-1)]
$newLines = $before + ($newBlock -split "`n") + $after

# Écrire le résultat
$newLines | Set-Content -Path $filePath -Encoding UTF8

Write-Host "✅ Remplacement effectué (lignes 708-745)"
```

### Étapes du Workflow

1. **Identifier les numéros de lignes exacts** via `Read tool` avec offset :
   ```typescript
   Read(file, offset: 700, limit: 50)
   // → Ligne 708: {/* ÉTAPE 3: ... */}
   // → Ligne 745: </div>
   ```

2. **Créer un script PowerShell avec indices** :
   - `$before = $lines[0..706]` (lignes avant)
   - `$after = $lines[745..($lines.Count-1)]` (lignes après)
   - Concaténer : `$before + $newBlock + $after`

3. **Exécuter le script** :
   ```bash
   cat > replace-by-line.ps1 << 'EOF'
   # Script PowerShell ici
   EOF
   powershell -ExecutionPolicy Bypass -File replace-by-line.ps1
   ```

4. **Nettoyer les fichiers temporaires** :
   ```bash
   del replace-by-line.ps1 2>nul
   ```

5. **Vérifier avec Read** que le changement est appliqué

## 📋 Checklist Avant Édition

- [ ] **Utiliser Read tool** pour identifier les numéros de lignes exacts
- [ ] **Vérifier encoding UTF-8** dans le script PowerShell (`-Encoding UTF8`)
- [ ] **Tester avec `Write-Host`** pour debug si le script échoue
- [ ] **Nettoyer les scripts temporaires** après exécution
- [ ] **Relire le fichier** avec Read pour confirmer le changement

## 🎯 Quand Utiliser Cette Méthode

| Situation | Méthode Recommandée |
|-----------|---------------------|
| **Fichier < 200 lignes** | ✅ Edit tool directement |
| **Fichier > 700 lignes + auto-save VSCode** | ✅ PowerShell par indices |
| **Remplacement simple (1 ligne)** | ✅ Edit tool |
| **Remplacement complexe (30+ lignes)** | ✅ PowerShell par indices |
| **Caractères accentués dans pattern** | ✅ PowerShell par indices |

## 🔍 Exemple Réel

**Cas d'usage** : Remplacer la grille statique 8h-17h (38 lignes) par une grille scrollable 00h-23h dans `interventions-calendar-view.tsx`

**Problème** : Edit tool échoue → VSCode auto-save

**Solution appliquée** :
1. Read → Identifié lignes 708-745
2. PowerShell script → Remplacement par indices
3. Vérification → Read lignes 705-750
4. ✅ Succès → Grille remplacée

**Résultat** : 0 erreur, 1 build réussi

## 📝 Notes Importantes

- **Toujours utiliser UTF-8** : `-Encoding UTF8` pour Get-Content et Set-Content
- **Indices 0-based** : Ligne 708 du fichier = index 707 en PowerShell
- **Heredoc PowerShell** : Utiliser `@'...'@` pour préserver indentation exacte
- **Split avec `\n`** : `$newBlock -split "\`n"` pour convertir string → array de lignes
- **Vérifier `-NoNewline`** si nécessaire pour éviter ligne vide en fin de fichier

## 🚀 Template Réutilisable

```powershell
$filePath = "CHEMIN_FICHIER"
$lines = Get-Content -Path $filePath -Encoding UTF8

$newBlock = @'
NOUVEAU_CODE_ICI
'@

# Ajuster les indices selon besoin
$before = $lines[0..AVANT]
$after = $lines[APRES..($lines.Count-1)]
$newLines = $before + ($newBlock -split "`n") + $after

$newLines | Set-Content -Path $filePath -Encoding UTF8
Write-Host "✅ Remplacement effectué (lignes X-Y)"
```

---

**Créé le** : 2025-11-01
**Contexte** : Refactorisation vue semaine calendrier interventions
**Impact** : Élimine 100% des échecs Edit tool sur gros fichiers
