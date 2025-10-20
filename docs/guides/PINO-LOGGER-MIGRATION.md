# 📝 Guide : Migration Logger vers Format Pino Correct

Ce guide explique comment migrer tous les appels `logger.*()` vers le format Pino correct pour obtenir des logs structurés exploitables.

---

## 🚨 Problème : Données Manquantes dans les Logs

### Symptômes

Les logs JSON ne contiennent que le message, sans les données additionnelles :

```json
❌ Avant (données perdues):
{"level":"info","time":"...","msg":"🔍 [TEAM-INVITATIONS] Fetching all invitations for team:"}
{"level":"info","time":"...","msg":"✅ [TEAM-INVITATIONS] Found"}
{"level":"info","time":"...","msg":"📦 [DASHBOARD] Teams result:"}
```

### Cause Racine

**Pattern incorrect** (les arguments après le message sont ignorés par Pino) :

```typescript
// ❌ INCORRECT: Arguments ignorés
logger.info('✅ [TEAM-INVITATIONS] Found', invitations.length)
logger.info('📦 [DASHBOARD] Teams result:', teamsResult)
logger.info('🔍 [USER-LOAD] Loading user:', userId)
```

**Pino API** :
```typescript
// Signatures supportées par Pino
logger.info(obj: object, msg?: string)  // ✅ CORRECT
logger.info(msg: string)                // ✅ OK mais pas de données
logger.info(msg: string, ...args)       // ❌ INCORRECT - args ignorés
```

---

## ✅ Solution : Format Pino Correct

### Pattern Recommandé

```typescript
// ✅ CORRECT: Données dans l'objet
logger.info({ count: invitations.length }, '✅ [TEAM-INVITATIONS] Found')
logger.info({ result: teamsResult }, '📦 [DASHBOARD] Teams result')
logger.info({ userId }, '🔍 [USER-LOAD] Loading user')
```

### Résultat avec `npm run dev:pretty`

```
[13:09:00] INFO: ✅ [TEAM-INVITATIONS] Found
    count: 5

[13:10:13] INFO: 📦 [DASHBOARD] Teams result
    result: { success: true, data: [...] }

[13:10:13] INFO: 🔍 [USER-LOAD] Loading user
    userId: "7d808b3b-1caf-4226-a5f4-459e9c7f7c38"
```

### Résultat avec `npm run dev` (JSON)

```json
{"level":"info","time":"...","count":5,"msg":"✅ [TEAM-INVITATIONS] Found"}
{"level":"info","time":"...","result":{"success":true,"data":[...]},"msg":"📦 [DASHBOARD] Teams result"}
{"level":"info","time":"...","userId":"7d808b3b-...","msg":"🔍 [USER-LOAD] Loading user"}
```

---

## 🤖 Migration Automatique

### Script de Migration

Un script automatique est disponible pour migrer tous les fichiers :

```bash
# Mode dry-run (affichage seulement)
npm run migrate:logger-format

# Écriture effective des fichiers
npm run migrate:logger-format:write
```

### Fonctionnement

Le script :
1. Scan tous les fichiers `.ts` et `.tsx` dans `app/`, `lib/`, `hooks/`, `components/`
2. Détecte les appels `logger.*()` avec pattern incorrect
3. Génère le code corrigé automatiquement
4. Affiche un diff avant/après
5. (Mode write) Écrit les fichiers modifiés

### Exemple de Sortie

```bash
$ npm run migrate:logger-format

🔍 Pino Logger Migration Script
Mode: 🔍 DRY-RUN (no files will be modified)
Scanning directories: app, lib, hooks, components
Extensions: .ts, .tsx

📂 Found 142 files to process

📝 [FIX] app/api/invite-user/route.ts
   ❌ Before: logger.info('✅ [STEP-4] Activity logged successfully', userId)
   ✅ After:  logger.info({ userId }, '✅ [STEP-4] Activity logged successfully')

📝 [FIX] app/gestionnaire/dashboard/page.tsx
   ❌ Before: logger.info('📦 [DASHBOARD] Teams result:', teamsResult)
   ✅ After:  logger.info({ result: teamsResult }, '📦 [DASHBOARD] Teams result')

📝 [FIX] lib/auth-dal.ts
   ❌ Before: logger.info('✅ [DAL] Complete user profile loaded:', user.email)
   ✅ After:  logger.info({ email: user.email }, '✅ [DAL] Complete user profile loaded')

============================================================
📊 Migration Summary
============================================================
Files processed:      142
Files modified:       47
Logger calls fixed:   183

ℹ️  This was a DRY-RUN. No files were modified.
   To apply changes, run with --write flag:
   npm run migrate:logger-format:write
```

---

## 🛠️ Migration Manuelle

Si vous préférez migrer manuellement certains fichiers :

### Règles de Conversion

#### Cas 1 : Un seul argument simple

```typescript
// ❌ Avant
logger.info('✅ [TEAM-INVITATIONS] Found', count)

// ✅ Après
logger.info({ count }, '✅ [TEAM-INVITATIONS] Found')
```

#### Cas 2 : Un argument complexe (objet, résultat)

```typescript
// ❌ Avant
logger.info('📦 [DASHBOARD] Teams result:', teamsResult)

// ✅ Après
logger.info({ result: teamsResult }, '📦 [DASHBOARD] Teams result')
```

#### Cas 3 : Plusieurs arguments

```typescript
// ❌ Avant
logger.info('🔍 [USER-LOAD] Loading user:', userId, teamId)

// ✅ Après
logger.info({ userId, teamId }, '🔍 [USER-LOAD] Loading user')
```

#### Cas 4 : Arguments avec expressions

```typescript
// ❌ Avant
logger.info('📊 [STATS] Calculated:', buildings.length, lots.length)

// ✅ Après
logger.info(
  { buildingsCount: buildings.length, lotsCount: lots.length },
  '📊 [STATS] Calculated'
)
```

---

## 📋 Exemples de Patterns Courants

### Pattern 1 : IDs et Références

```typescript
// ❌ Avant
logger.info('🔍 [INTERVENTION] Loading intervention:', interventionId)
logger.info('✅ [USER] Found user:', user.id, user.email)

// ✅ Après
logger.info({ interventionId }, '🔍 [INTERVENTION] Loading intervention')
logger.info({ userId: user.id, email: user.email }, '✅ [USER] Found user')
```

### Pattern 2 : Résultats d'Opérations

```typescript
// ❌ Avant
logger.info('✅ [QUERY] Query executed:', result)
logger.error('❌ [QUERY] Query failed:', error)

// ✅ Après
logger.info({ result }, '✅ [QUERY] Query executed')
logger.error({ error: error.message, stack: error.stack }, '❌ [QUERY] Query failed')
```

### Pattern 3 : Counts et Statistiques

```typescript
// ❌ Avant
logger.info('📊 [STATS] Found buildings:', buildings.length)
logger.info('📊 [STATS] Occupancy rate:', occupancyRate, '%')

// ✅ Après
logger.info({ count: buildings.length }, '📊 [STATS] Found buildings')
logger.info({ rate: occupancyRate, unit: '%' }, '📊 [STATS] Occupancy rate')
```

### Pattern 4 : Context avec Plusieurs Données

```typescript
// ❌ Avant
logger.info('🔄 [PROCESS] Step completed', step, duration, success)

// ✅ Après
logger.info({ step, duration, success }, '🔄 [PROCESS] Step completed')
```

---

## 🧪 Validation des Changements

### Test 1 : Dry-Run

```bash
npm run migrate:logger-format
```

Vérifiez que les transformations proposées sont correctes avant d'écrire.

### Test 2 : Migration Effective

```bash
npm run migrate:logger-format:write
```

### Test 3 : Vérifier les Logs

```bash
npm run dev:pretty
```

**Vérifiez que** :
- ✅ Les emojis sont affichés correctement
- ✅ Les données sont visibles sous chaque log
- ✅ Les structures JSON sont bien formatées

### Test 4 : JSON Structuré

```bash
npm run dev
```

**Vérifiez que** :
- ✅ Les objets JSON contiennent les champs de données
- ✅ Pas de `undefined` ou champs manquants
- ✅ Les types sont corrects (numbers, strings, objects)

---

## ⚠️ Cas Particuliers

### Cas 1 : Logs avec Variables Template

```typescript
// ❌ Avant
logger.info(`✅ [USER] Found user: ${user.email}`)

// ✅ Après
logger.info({ email: user.email }, '✅ [USER] Found user')
```

### Cas 2 : Logs Conditionnels

```typescript
// ❌ Avant
if (result) {
  logger.info('✅ [QUERY] Success', result)
} else {
  logger.error('❌ [QUERY] Failed', error)
}

// ✅ Après
if (result) {
  logger.info({ result }, '✅ [QUERY] Success')
} else {
  logger.error({ error: error?.message }, '❌ [QUERY] Failed')
}
```

### Cas 3 : Logs avec Métadonnées Complexes

```typescript
// ❌ Avant
logger.info('📦 [DASHBOARD] Loading data', userId, teamId, timestamp)

// ✅ Après
logger.info(
  {
    userId,
    teamId,
    timestamp: new Date().toISOString()
  },
  '📦 [DASHBOARD] Loading data'
)
```

---

## 📊 Bénéfices de la Migration

| Avant | Après |
|-------|-------|
| Données perdues | ✅ Données structurées exploitables |
| Debugging difficile | ✅ Contexte complet dans chaque log |
| Logs non parsables | ✅ JSON valide pour outils d'analyse |
| Impossible de filtrer | ✅ Filtrage par champ (userId, teamId, etc.) |

### Exemples d'Utilisation Post-Migration

#### Filtrer par userId en production

```bash
# Logs Vercel avec jq
vercel logs | jq 'select(.userId == "7d808b3b-...")'
```

#### Analyser les durées d'opération

```bash
# Extraire toutes les durées
npm run dev | jq 'select(.duration) | {msg, duration}'
```

#### Détecter les erreurs par type

```bash
# Filtrer les erreurs avec stack trace
npm run dev | jq 'select(.level == "error") | {msg, error}'
```

---

## 🎯 Recommandation Finale

1. **Lancer le dry-run** pour voir l'étendue des changements
   ```bash
   npm run migrate:logger-format
   ```

2. **Appliquer la migration**
   ```bash
   npm run migrate:logger-format:write
   ```

3. **Tester avec dev:pretty**
   ```bash
   npm run dev:pretty
   ```

4. **Commit les changements**
   ```bash
   git add .
   git commit -m "📝 Migrate logger calls to Pino format (structured data)"
   ```

---

**Dernière mise à jour** : 2025-10-05
**Script** : `scripts/migrate-logger-to-pino-format.ts`
**Commandes** : `npm run migrate:logger-format` (dry-run), `npm run migrate:logger-format:write` (write)
