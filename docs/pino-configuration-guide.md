# Guide de Configuration Pino pour SEIDO

## 📋 Vue d'ensemble

SEIDO utilise **Pino** (v9.12.0) + **pino-pretty** (v13.1.1) pour un système de logging structuré et performant.

### ✅ Configuration Actuelle (Optimisée pour Next.js 15 + Edge Runtime)

La configuration a été optimisée pour être **100% compatible** avec Next.js 15 et Edge Runtime :
- **Pipe externe** (shell) pour pino-pretty → Évite les worker threads incompatibles avec Edge Runtime
- **Logs colorisés** automatiquement en développement via `npm run dev`
- **JSON brut** disponible via `npm run dev:json` pour parsing/debugging
- **Performance optimale** sans overhead de worker threads

### 🔍 Pourquoi cette Approche ?

#### ❌ Problème avec Transport Intégré (worker threads)
```typescript
// ❌ NE PAS FAIRE - Cause "worker has exited" errors
pino({
  transport: {
    target: 'pino-pretty', // Uses worker threads
    options: { colorize: true }
  }
})
```

**Problème** : Next.js Edge Runtime (utilisé par middleware, certains layouts) ne supporte **pas** les worker threads de Node.js, causant des crashes :
```
Error: the worker has exited
    at eval (lib\dal.ts:77:11)
```

#### ✅ Solution : Pipe Externe
```bash
# package.json
"dev": "next dev 2>&1 | npx pino-pretty --colorize"
```

**Avantages** :
- ✅ Compatible avec Edge Runtime (processus séparé)
- ✅ Fonctionne dans tous les contextes Next.js (Server Components, middleware, layouts)
- ✅ Performance identique (transformation en post-traitement)
- ✅ Multi-plateforme (Windows, Linux, macOS)

## 🚀 Utilisation

### Commandes Disponibles

```bash
# Développement avec logs formatés et colorisés (RECOMMANDÉ)
npm run dev

# Développement avec logs JSON bruts (parsing/debugging)
npm run dev:json

# Build production
npm run build

# Production (logs JSON structurés)
npm run start
```

### Import du Logger

```typescript
// Import du logger principal
import { logger } from '@/lib/logger'

// Import de loggers contextuels
import {
  authLogger,           // Pour l'authentification
  supabaseLogger,       // Pour les opérations Supabase
  interventionLogger,   // Pour les interventions
  dashboardLogger,      // Pour les dashboards
  testLogger           // Pour les tests
} from '@/lib/logger'

// Import de fonctions utilitaires
import {
  logUserAction,        // Log d'action utilisateur
  logApiCall,          // Log d'appel API
  logError,            // Log d'erreur enrichi
  logSupabaseOperation // Log d'opération Supabase
} from '@/lib/logger'
```

## 📝 Exemples d'Utilisation

### 1. Logs de Base

```typescript
import { logger } from '@/lib/logger'

// Logs simples
logger.info('✅ Opération réussie')
logger.debug('🔍 Information de debug')
logger.warn('⚠️ Attention')
logger.error('❌ Erreur survenue')
```

**Output en développement :**
```
[15:36:45] INFO: ✅ Opération réussie
[15:36:45] DEBUG: 🔍 Information de debug
[15:36:45] WARN: ⚠️ Attention
[15:36:45] ERROR: ❌ Erreur survenue
```

### 2. Logs avec Contexte

```typescript
import { authLogger } from '@/lib/logger'

authLogger.info({ userId: 'user-123', role: 'gestionnaire' }, '🔐 Connexion réussie')
```

**Output :**
```
[15:36:45] INFO: 🔐 Connexion réussie
    userId: "user-123"
    role: "gestionnaire"
```

### 3. Logs d'Action Utilisateur

```typescript
import { logUserAction } from '@/lib/logger'

logUserAction('create_intervention', userId, {
  interventionId: 'int-789',
  priority: 'high',
  building: 'Immeuble A'
})
```

**Output :**
```
[15:36:45] INFO: 👤 User action: create_intervention
    type: "user_action"
    action: "create_intervention"
    userId: "user-123"
    metadata: {
      "interventionId": "int-789",
      "priority": "high",
      "building": "Immeuble A"
    }
```

### 4. Logs d'Appel API

```typescript
import { logApiCall } from '@/lib/logger'

// Début de la requête
const startTime = Date.now()

// ... traitement ...

// Log de la réponse
const duration = Date.now() - startTime
logApiCall('POST', '/api/interventions', 201, duration)
```

**Output :**
```
[15:36:45] INFO: 🌐 API POST /api/interventions (201)
    type: "api_call"
    method: "POST"
    endpoint: "/api/interventions"
    statusCode: 201
    duration: 145
```

### 5. Logs d'Erreur Enrichis

```typescript
import { logError } from '@/lib/logger'

try {
  // Code qui peut échouer
  await createIntervention(data)
} catch (error) {
  logError(error as Error, 'intervention-creation', {
    userId,
    buildingId,
    attemptCount: 3
  })
  throw error
}
```

**Output :**
```
[15:36:45] ERROR: ❌ Error in intervention-creation: Database connection failed
    type: "error"
    context: "intervention-creation"
    metadata: {
      "userId": "user-123",
      "buildingId": "bld-456",
      "attemptCount": 3
    }
    error: {
      "name": "DatabaseError",
      "message": "Database connection failed",
      "stack": "DatabaseError: Database connection failed\n    at ..."
    }
```

### 6. Logs d'Opération Supabase

```typescript
import { logSupabaseOperation } from '@/lib/logger'

const { data, error } = await supabase
  .from('interventions')
  .insert(interventionData)

logSupabaseOperation(
  'insert',
  'interventions',
  !error,
  { rowsAffected: data?.length || 0 }
)
```

**Output (succès) :**
```
[15:36:45] INFO: ✅ Supabase insert on interventions
    type: "supabase_operation"
    operation: "insert"
    table: "interventions"
    success: true
    metadata: {
      "rowsAffected": 1
    }
```

**Output (erreur) :**
```
[15:36:45] ERROR: ❌ Supabase insert on interventions
    type: "supabase_operation"
    operation: "insert"
    table: "interventions"
    success: false
    metadata: {
      "error": "duplicate key value violates unique constraint"
    }
```

## 🎨 Configuration par Environnement

### Développement (NODE_ENV=development ou undefined)

- **Transport** : Pipe externe vers pino-pretty
- **Niveau** : `debug` (tous les logs)
- **Format** : Texte formaté et colorisé
- **Output** : Console (stdout/stderr)

```typescript
// Auto-détecté quand NODE_ENV=development ou undefined
const logger = createLogger()
logger.debug('Message visible en dev')
```

### Production (NODE_ENV=production)

- **Transport** : Aucun (JSON natif)
- **Niveau** : `info` (info, warn, error, fatal)
- **Format** : JSON structuré (NDJSON)
- **Output** : Console (parsable par outils de log)

```json
{"level":30,"time":"2025-10-05T15:36:45.123Z","pid":1234,"hostname":"server-01","msg":"Opération réussie"}
```

### Tests (NODE_ENV=test)

- **Niveau** : `silent` (aucun log)
- **Format** : N/A
- **Output** : Aucun (évite pollution des tests)

```typescript
// En tests, tous les logs sont désactivés
const logger = createLogger()
logger.info('Ce message n\'apparaît pas pendant les tests')
```

## 🔧 Configuration Technique

### Fichier Principal : `lib/logger.ts`

```typescript
import pino from 'pino'

const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined
  const isTest = process.env.NODE_ENV === 'test'
  const isBrowser = typeof window !== 'undefined'

  // Browser-side: console wrapper simple
  if (isBrowser) {
    return pino({
      level: isDevelopment ? 'debug' : 'info',
      browser: {
        asObject: true,
        write: {
          info: (obj) => console.info(obj),
          error: (obj) => console.error(obj),
          warn: (obj) => console.warn(obj),
          debug: (obj) => console.debug(obj),
        }
      }
    })
  }

  const baseConfig = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    timestamp: pino.stdTimeFunctions.isoTime,
  }

  // Développement: JSON brut (formaté par pipe externe)
  if (isDevelopment) {
    return pino(baseConfig)
  }

  // Tests (silencieux)
  if (isTest) {
    return pino({ ...baseConfig, level: 'silent' })
  }

  // Production (JSON brut)
  return pino(baseConfig)
}

export const logger = createLogger()
```

### Scripts package.json

```json
{
  "scripts": {
    "dev": "next dev 2>&1 | npx pino-pretty --colorize --translateTime \"HH:MM:ss\" --ignore \"pid,hostname\"",
    "dev:json": "next dev"
  }
}
```

### Options pino-pretty Utilisées

| Option | Valeur | Description |
|--------|--------|-------------|
| `--colorize` | flag | Active la colorisation des logs |
| `--translateTime` | `"HH:MM:ss"` | Format d'horodatage court |
| `--ignore` | `"pid,hostname"` | Masque PID et hostname (bruit) |
| `2>&1` | redirection | Redirige stderr vers stdout pour capture |

## 🎯 Bonnes Pratiques

### 1. Utiliser les Loggers Contextuels

```typescript
// ❌ Éviter
import { logger } from '@/lib/logger'
logger.info({ context: 'auth' }, 'Login réussi')

// ✅ Préférer
import { authLogger } from '@/lib/logger'
authLogger.info('Login réussi')
```

### 2. Ajouter des Métadonnées Structurées

```typescript
// ❌ Éviter (string interpolation)
logger.info(`User ${userId} created intervention ${interventionId}`)

// ✅ Préférer (objet structuré)
logger.info(
  { userId, interventionId, action: 'create_intervention' },
  'Intervention créée'
)
```

### 3. Utiliser les Fonctions Utilitaires

```typescript
// ❌ Éviter (logs manuels)
logger.error({
  type: 'error',
  error: { message: error.message, stack: error.stack },
  context: 'api'
}, `Error: ${error.message}`)

// ✅ Préférer (fonction dédiée)
logError(error, 'api', { endpoint: '/api/users' })
```

### 4. Niveaux de Log Appropriés

| Niveau | Cas d'Usage | Exemple |
|--------|-------------|---------|
| `debug` | Détails techniques | `logger.debug({ query }, 'SQL query executed')` |
| `info` | Événements normaux | `logger.info('User logged in')` |
| `warn` | Situations anormales non critiques | `logger.warn('Rate limit approaching')` |
| `error` | Erreurs récupérables | `logger.error('Payment failed, retrying')` |
| `fatal` | Erreurs critiques système | `logger.fatal('Database unreachable')` |

### 5. Performance : Éviter les Calculs Inutiles

```typescript
// ❌ Éviter (calcul toujours exécuté)
logger.debug(`Complex calculation: ${expensiveFunction()}`)

// ✅ Préférer (calcul uniquement si debug actif)
if (logger.isLevelEnabled('debug')) {
  logger.debug({ result: expensiveFunction() }, 'Complex calculation')
}
```

## 🧪 Tests et Diagnostic

### Script de Test Complet

```bash
# Test du logger avec exemples
npx tsx scripts/test-logger-final.ts
```

### Script de Diagnostic

```bash
# Comparaison des différentes configurations
npx tsx scripts/test-pino-logger.ts
```

### Vérification de la Configuration

```typescript
// Vérifier le niveau actuel
console.log('Log level:', logger.level)

// Vérifier si un niveau est actif
if (logger.isLevelEnabled('debug')) {
  console.log('Debug logs are enabled')
}
```

## 🐛 Dépannage

### Problème : Logs non formatés (JSON brut)

**Symptôme :**
```json
{"level":30,"time":"2025-10-05T15:36:45.123Z","msg":"Hello"}
```

**Solutions :**
1. Vérifier que vous utilisez `npm run dev` (pas `npm run dev:json`)
2. Vérifier installation pino-pretty : `npm list pino-pretty`
3. Windows PowerShell : Utiliser CMD ou Git Bash si problème de pipe

### Problème : Erreur "the worker has exited"

**Symptôme :**
```
Error: the worker has exited
    at eval (lib\dal.ts:77:11)
```

**Solution :** ✅ Déjà corrigé dans la configuration actuelle
- Le logger n'utilise **pas** de transport avec worker threads
- Utilise pipe externe compatible avec Edge Runtime

### Problème : Aucun log n'apparaît

**Solutions :**
1. Vérifier le niveau de log : `LOG_LEVEL=debug npm run dev`
2. Vérifier si NODE_ENV=test (logs désactivés)
3. Vérifier les imports : utiliser `from '@/lib/logger'`

### Problème : Pipe ne fonctionne pas (Windows)

**Solution :**
```bash
# PowerShell : Utiliser CMD
cmd /c "npm run dev"

# Ou Git Bash
bash -c "npm run dev"
```

## 📊 Comparaison des Approches

### ❌ Transport Intégré (worker threads) - INCOMPATIBLE Edge Runtime

```typescript
// lib/logger.ts
pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})
```

**Problèmes :**
- ❌ Crash avec Edge Runtime ("worker has exited")
- ❌ Incompatible avec middleware Next.js
- ❌ Incompatible avec certains layouts

### ✅ Pipe Externe (processus séparé) - COMPATIBLE Edge Runtime

```json
// package.json
"dev": "next dev 2>&1 | npx pino-pretty --colorize"
```

**Avantages :**
- ✅ Compatible avec Edge Runtime
- ✅ Fonctionne dans tous les contextes Next.js
- ✅ Performance identique (post-traitement)
- ✅ Multi-plateforme
- ✅ Recommandé par Pino pour environnements restreints

## 🔗 Références

- [Documentation Pino](https://getpino.io/)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
- [Best Practices Pino](https://getpino.io/#/docs/best-practices)
- [Next.js Logging](https://nextjs.org/docs/app/building-your-application/optimizing/logging)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/api-reference/edge)

---

**Dernière mise à jour** : 2025-10-05
**Version Pino** : 9.12.0
**Version pino-pretty** : 13.1.1
**Statut** : ✅ Production Ready - Compatible Edge Runtime
