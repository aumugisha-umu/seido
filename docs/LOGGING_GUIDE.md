# 📝 Guide d'utilisation du système de logging Pino

## 🚀 Installation et configuration

Le système de logging est déjà configuré dans votre projet Seido-app avec les packages suivants :
- `pino` : Logger principal
- `pino-pretty` : Formatage des logs pour le développement

## 🎯 Vue d'ensemble

Le système de logging est organisé en plusieurs modules :

```
lib/
├── logger.ts           # Logger principal et utilitaires
├── supabase-logger.ts  # Logs spécialisés pour Supabase
├── react-logger.tsx    # Hooks React pour les composants
└── api-logger.ts       # Middleware pour les API routes
```

## 🔧 Configuration

### Variables d'environnement

Ajoutez ces variables à votre `.env.local` :

```env
# Niveau de logging (trace, debug, info, warn, error, fatal)
LOG_LEVEL=debug

# Pour la production
NODE_ENV=production
```

### Niveaux de logs

- 🔍 **TRACE** : Informations très détaillées
- 🐛 **DEBUG** : Informations de débogage
- ℹ️ **INFO** : Informations générales
- ⚠️ **WARN** : Avertissements
- ❌ **ERROR** : Erreurs
- 💀 **FATAL** : Erreurs critiques

## 📖 Utilisation

### 1. Logger de base

```typescript
import { logger } from '@/lib/logger'

// Log simple
logger.info('Application démarrée')

// Log avec métadonnées
logger.info({ userId: 123, action: 'login' }, 'Utilisateur connecté')

// Log d'erreur
logger.error({ error: err.message }, 'Erreur de connexion')
```

### 2. Loggers spécialisés

```typescript
import { 
  authLogger, 
  supabaseLogger, 
  interventionLogger, 
  dashboardLogger 
} from '@/lib/logger'

// Logs d'authentification
authLogger.info('Tentative de connexion', { email: 'user@example.com' })

// Logs Supabase
supabaseLogger.info('Requête base de données', { table: 'users', operation: 'select' })

// Logs d'intervention
interventionLogger.info('Intervention créée', { interventionId: 456, type: 'plomberie' })
```

### 3. Fonctions utilitaires

```typescript
import { 
  logUserAction, 
  logApiCall, 
  logError, 
  logSupabaseOperation 
} from '@/lib/logger'

// Action utilisateur
logUserAction('create_intervention', 'user123', { 
  interventionType: 'plomberie',
  urgency: 'high' 
})

// Appel API
logApiCall('POST', '/api/interventions', 201, 150)

// Erreur
logError(new Error('Database connection failed'), 'supabase', {
  table: 'interventions',
  operation: 'insert'
})

// Opération Supabase
logSupabaseOperation('insert', 'interventions', true, {
  rowCount: 1,
  duration: 45
})
```

## ⚛️ Hooks React

### 1. useComponentLogger

```typescript
import { useComponentLogger } from '@/lib/react-logger'

const MyComponent = () => {
  const { logAction, logError, logRender, logStateChange } = useComponentLogger('MyComponent')

  useEffect(() => {
    logRender({ prop1: 'value1' })
  }, [])

  const handleClick = () => {
    logAction('button_clicked', { buttonId: 'submit' })
  }

  const [state, setState] = useState('')
  
  useEffect(() => {
    logStateChange('formState', state)
  }, [state])

  return <button onClick={handleClick}>Click me</button>
}
```

### 2. useInteractionLogger

```typescript
import { useInteractionLogger } from '@/lib/react-logger'

const FormComponent = () => {
  const { logClick, logHover, logFocus, logFormSubmit } = useInteractionLogger('FormComponent')

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      logFormSubmit('user-registration', true, { fields: ['name', 'email'] })
    }}>
      <input 
        onFocus={() => logFocus('email-input')}
        onMouseEnter={() => logHover('email-input')}
      />
      <button 
        onClick={() => logClick('submit-button')}
        type="submit"
      >
        Submit
      </button>
    </form>
  )
}
```

### 3. usePerformanceLogger

```typescript
import { usePerformanceLogger } from '@/lib/react-logger'

const HeavyComponent = () => {
  usePerformanceLogger('HeavyComponent')
  
  // Le composant loggera automatiquement sa durée de montage
  return <div>Heavy content</div>
}
```

### 4. withLogger HOC

```typescript
import { withLogger } from '@/lib/react-logger'

const MyComponent = ({ title }: { title: string }) => {
  return <h1>{title}</h1>
}

// Wrapper automatique avec logging
export default withLogger(MyComponent, 'MyComponent')
```

## 🗄️ Logs Supabase

### 1. Logger automatique

```typescript
import { createSupabaseLogger } from '@/lib/supabase-logger'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)
const supabaseWithLogs = createSupabaseLogger(supabase)

// Utilisation normale avec logs automatiques
const { data, error } = await supabaseWithLogs.select('users', '*')
const { data, error } = await supabaseWithLogs.insert('interventions', newIntervention)
const { data, error } = await supabaseWithLogs.update('users', updates, { id: userId })
const { data, error } = await supabaseWithLogs.delete('interventions', { id: interventionId })
```

### 2. Logs d'authentification

```typescript
import { logAuthStateChange, logAuthError } from '@/lib/supabase-logger'

// Dans votre composant d'authentification
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    logAuthStateChange(event, session)
  })

  return () => subscription.unsubscribe()
}, [])

// Gestion des erreurs d'auth
try {
  await supabase.auth.signInWithPassword({ email, password })
} catch (error) {
  logAuthError(error, 'sign_in')
}
```

## 🌐 Logs API Routes

### 1. Middleware automatique

```typescript
// app/api/interventions/route.ts
import { withApiLogger } from '@/lib/api-logger'

export const POST = withApiLogger(async (req: NextRequest) => {
  // Votre logique API ici
  // Les logs sont automatiques
  return NextResponse.json({ success: true })
})
```

### 2. Logs côté client

```typescript
import { logClientApiCall } from '@/lib/api-logger'

// Au lieu de fetch normal
const response = await logClientApiCall('/api/interventions', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

## 🎨 Exemples d'utilisation dans Seido-app

### 1. Dashboard Gestionnaire

```typescript
// app/dashboard/gestionnaire/page.tsx
import { useComponentLogger } from '@/lib/react-logger'
import { interventionLogger } from '@/lib/logger'

const GestionnaireDashboard = () => {
  const { logAction } = useComponentLogger('GestionnaireDashboard')

  const handleCreateIntervention = async (data: any) => {
    logAction('create_intervention_started', { type: data.type })
    
    try {
      const result = await createIntervention(data)
      interventionLogger.info('Intervention créée', { 
        interventionId: result.id,
        type: data.type,
        urgency: data.urgency 
      })
      logAction('create_intervention_success', { interventionId: result.id })
    } catch (error) {
      logAction('create_intervention_failed', { error: error.message })
    }
  }

  return (
    <div>
      {/* Votre interface */}
    </div>
  )
}
```

### 2. Composant d'intervention

```typescript
// components/intervention/intervention-card.tsx
import { useInteractionLogger } from '@/lib/react-logger'

const InterventionCard = ({ intervention }: { intervention: any }) => {
  const { logClick, logHover } = useInteractionLogger('InterventionCard')

  return (
    <div 
      onMouseEnter={() => logHover('intervention-card')}
      onClick={() => logClick('intervention-card', { 
        interventionId: intervention.id,
        status: intervention.status 
      })}
    >
      {/* Contenu de la carte */}
    </div>
  )
}
```

### 3. Hook d'authentification

```typescript
// hooks/use-auth.ts
import { authLogger, logUserAction } from '@/lib/logger'

export const useAuth = () => {
  const signIn = async (email: string, password: string) => {
    authLogger.info('Tentative de connexion', { email })
    
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      logUserAction('sign_in', result.user?.id, { email })
      authLogger.info('Connexion réussie', { userId: result.user?.id })
    } catch (error) {
      authLogger.error('Échec de connexion', { email, error: error.message })
      throw error
    }
  }

  return { signIn }
}
```

## 🔍 Débogage et monitoring

### 1. Filtrage des logs

```bash
# Voir seulement les logs d'erreur
npm run dev 2>&1 | grep "❌"

# Voir seulement les logs d'intervention
npm run dev 2>&1 | grep "intervention"

# Voir seulement les logs Supabase
npm run dev 2>&1 | grep "supabase"
```

### 2. Logs en production

En production, les logs sont au format JSON pour faciliter l'analyse :

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "type": "user_action",
  "action": "create_intervention",
  "userId": "123",
  "msg": "👤 User action: create_intervention"
}
```

### 3. Intégration avec des services externes

Pour envoyer les logs vers un service externe (Sentry, LogRocket, etc.) :

```typescript
// lib/logger.ts - Ajouter dans la configuration
const logger = pino({
  // ... configuration existante
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'debug',
        options: { /* ... */ }
      },
      {
        target: 'pino/file',
        level: 'error',
        options: { destination: './logs/error.log' }
      }
    ]
  }
})
```

## 🚨 Bonnes pratiques

### 1. Niveaux de logs appropriés

- **DEBUG** : Informations de développement, états internes
- **INFO** : Actions utilisateur importantes, événements métier
- **WARN** : Situations anormales mais non critiques
- **ERROR** : Erreurs qui empêchent le fonctionnement normal
- **FATAL** : Erreurs critiques qui arrêtent l'application

### 2. Métadonnées utiles

```typescript
// ✅ Bon
logger.info({
  userId: user.id,
  action: 'create_intervention',
  interventionType: 'plomberie',
  urgency: 'high',
  duration: 150
}, 'Intervention créée')

// ❌ Éviter
logger.info('Intervention créée')
```

### 3. Performance

```typescript
// ✅ Utiliser des logs conditionnels pour les opérations coûteuses
if (logger.level <= 20) { // DEBUG level
  logger.debug({ largeObject }, 'Debug info')
}

// ✅ Éviter les logs dans les boucles
// ❌ Mauvais
data.forEach(item => logger.debug(item))

// ✅ Bon
logger.debug({ itemCount: data.length }, 'Processing items')
data.forEach(item => { /* process */ })
```

## 🎯 Cas d'usage spécifiques Seido-app

### 1. Suivi des interventions

```typescript
// Logs automatiques pour chaque étape d'une intervention
interventionLogger.info('Intervention créée', { id, type, urgency })
interventionLogger.info('Prestataire assigné', { interventionId: id, prestataireId })
interventionLogger.info('Intervention démarrée', { interventionId: id, startTime })
interventionLogger.info('Intervention terminée', { interventionId: id, endTime, duration })
```

### 2. Monitoring des performances

```typescript
// Dans vos composants lourds
const { logRender } = useComponentLogger('InterventionList')

useEffect(() => {
  const startTime = performance.now()
  
  // Rendu du composant
  
  const endTime = performance.now()
  logRender({ 
    renderTime: endTime - startTime,
    itemCount: interventions.length 
  })
}, [interventions])
```

### 3. Audit des actions utilisateur

```typescript
// Logs d'audit pour les actions sensibles
logUserAction('delete_intervention', userId, { 
  interventionId,
  reason: 'cancelled_by_user',
  previousStatus: 'pending'
})
```

## 🔧 Configuration avancée

### 1. Logs par environnement

```typescript
// lib/logger.ts
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'test') return 'warn'
  if (process.env.NODE_ENV === 'development') return 'debug'
  return 'info'
}
```

### 2. Logs rotatifs

```typescript
// Pour les logs de production
const logger = pino({
  transport: {
    target: 'pino/file',
    options: {
      destination: './logs/app.log',
      mkdir: true
    }
  }
})
```

### 3. Intégration avec les tests

```typescript
// Dans vos tests
import { testLogger } from '@/lib/logger'

beforeEach(() => {
  testLogger.info('Test started', { testName: expect.getState().currentTestName })
})
```

## 🧪 Test du système

### Page de test

Visitez `http://localhost:3000/test-logging` pour tester tous les types de logs :

- ✅ Logs de composants React
- ✅ Logs d'interactions utilisateur  
- ✅ Logs de performance
- ✅ Logs d'erreurs
- ✅ Logs Supabase
- ✅ Logs d'authentification
- ✅ Logs généraux (debug, info, warn, error)

## 📊 Types de logs capturés

### 1. **Logs Serveur** 🌐
- ✅ **API Routes** : Requêtes, réponses, erreurs
- ✅ **Middleware** : Authentification, validation  
- ✅ **Services** : Logique métier, appels externes
- ✅ **Base de données** : Opérations Supabase

### 2. **Logs Navigateur** 🖥️
- ✅ **Composants React** : Rendu, interactions, erreurs
- ✅ **Actions utilisateur** : Clics, formulaires, navigation
- ✅ **Erreurs JavaScript** : Erreurs non capturées
- ✅ **Performance** : Temps de rendu, interactions

### 3. **Logs Base de données** 🗄️
- ✅ **Opérations CRUD** : SELECT, INSERT, UPDATE, DELETE
- ✅ **Authentification** : Connexions, déconnexions
- ✅ **Performance** : Temps de requête, nombre de lignes
- ✅ **Erreurs** : Erreurs de connexion, requêtes échouées

---

## 📞 Support

Pour toute question sur le système de logging, consultez :
- [Documentation Pino](https://getpino.io/)
- [Documentation pino-pretty](https://github.com/pinojs/pino-pretty)
- Les exemples dans le code de l'application

Le système est maintenant prêt à être utilisé dans toute votre application Seido-app ! 🚀

