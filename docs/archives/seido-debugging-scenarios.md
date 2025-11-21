# SEIDO Debugging Scenarios

Guide pratique des scénarios de debugging les plus fréquents dans SEIDO avec solutions étape par étape.

## 🚨 Scenarios critiques par fréquence

### 1. "L'intervention n'apparaît pas dans mon dashboard"

**Symptômes** :
- L'utilisateur voit un dashboard vide ou incomplet
- Une intervention créée n'est pas visible
- Les compteurs ne correspondent pas

**Debugging étapes** :

#### Étape 1 : Vérifier l'identité utilisateur
```typescript
import { SEIDODebugger } from '@/lib/seido-debugger'

// Dans le composant dashboard
useEffect(() => {
  const currentUser = getCurrentUser()
  SEIDODebugger.debugAuth('role_check', currentUser.email, currentUser.role, !!currentUser)

  console.log('🔍 [DEBUG] Current user context:', {
    id: currentUser.id,
    role: currentUser.role,
    team_id: currentUser.team_id
  })
}, [])
```

#### Étape 2 : Vérifier les filtres de données
```typescript
// Vérifier la query selon le rôle
const debugDashboardQuery = async (userRole: UserRole, userId: string) => {
  let query = supabase.from('interventions').select('*')

  switch (userRole) {
    case 'gestionnaire':
      query = query.eq('manager_id', userId)
      break
    case 'prestataire':
      query = query.eq('assigned_provider_id', userId)
      break
    case 'locataire':
      query = query.eq('tenant_id', userId)
      break
  }

  const { data, error } = await query

  SEIDODebugger.debugDatabaseOperation(
    'interventions', 'SELECT', userRole, userId,
    { filters: getFiltersForRole(userRole, userId) },
    { data, count: data?.length, error }
  )

  return { data, error }
}
```

#### Étape 3 : Vérifier les politiques RLS
```sql
-- Test en base pour vérifier les politiques RLS
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'interventions';

-- Test d'une requête avec un utilisateur spécifique
SET role authenticated;
SET request.jwt.claim.sub TO 'user-id-here';
SELECT * FROM interventions; -- Doit retourner seulement les données autorisées
```

#### Étape 4 : Vérifier les relations de données
```typescript
const validateInterventionRelations = async (interventionId: string) => {
  const intervention = await getIntervention(interventionId)

  // Vérifier que le lot existe et appartient au bon gestionnaire
  const lot = await getLot(intervention.lot_id)
  const building = await getBuilding(lot.building_id)

  SEIDODebugger.log('DEBUG', 'info', 'Relation validation',
    { interventionId },
    {
      intervention: { id: intervention.id, status: intervention.status },
      lot: { id: lot.id, building_id: lot.building_id },
      building: { id: building.id, manager_id: building.manager_id }
    }
  )

  // Vérifier la cohérence
  if (building.manager_id !== intervention.manager_id) {
    console.error('❌ Inconsistent manager assignment!')
  }
}
```

---

### 2. "Je ne reçois pas de notifications"

**Symptômes** :
- Notifications en retard ou manquantes
- Compteur de notifications incorrect
- Événements temps réel non reçus

**Debugging étapes** :

#### Étape 1 : Vérifier la connexion real-time
```typescript
const testRealtimeConnection = () => {
  const channel = supabase
    .channel('test-channel')
    .on('broadcast', { event: 'test' }, (payload) => {
      console.log('✅ Real-time working:', payload)
    })
    .subscribe((status) => {
      SEIDODebugger.debugNotification('realtime_status', getCurrentUser().role, getCurrentUser().id, status === 'SUBSCRIBED', { status })
    })

  // Envoyer un message test
  setTimeout(() => {
    channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { message: 'Test message', timestamp: Date.now() }
    })
  }, 1000)
}
```

#### Étape 2 : Vérifier les critères de notification
```typescript
const debugNotificationCriteria = (notification: any, user: any) => {
  const criteria = {
    roleMatch: notification.target_roles?.includes(user.role),
    userMatch: notification.target_users?.includes(user.id),
    teamMatch: notification.target_teams?.includes(user.team_id),
    statusMatch: notification.intervention_status === user.current_intervention_status
  }

  const shouldReceive = Object.values(criteria).some(Boolean)

  SEIDODebugger.debugNotification(
    notification.type,
    user.role,
    user.id,
    shouldReceive,
    { criteria, notification, user }
  )
}
```

#### Étape 3 : Tracer le pipeline de notification
```typescript
const traceNotificationPipeline = async (interventionId: string, event: string) => {
  console.group(`🔔 [SEIDO-TRACE] Notification Pipeline: ${event}`)

  // 1. Trigger de l'événement
  console.log('1. Event triggered:', { interventionId, event })

  // 2. Règles de notification
  const rules = await getNotificationRules(event)
  console.log('2. Notification rules:', rules)

  // 3. Destinataires calculés
  const recipients = await calculateRecipients(interventionId, rules)
  console.log('3. Recipients calculated:', recipients)

  // 4. Notifications créées
  const notifications = await createNotifications(recipients, event, interventionId)
  console.log('4. Notifications created:', notifications)

  // 5. Livraison temps réel
  const deliveryResults = await deliverNotifications(notifications)
  console.log('5. Delivery results:', deliveryResults)

  console.groupEnd()
}
```

---

### 3. "L'action sur l'intervention ne fonctionne pas"

**Symptômes** :
- Bouton d'action grisé ou invisible
- Erreur lors du clic sur une action
- Statut qui ne change pas après action

**Debugging étapes** :

#### Étape 1 : Vérifier les permissions d'action
```typescript
const debugActionPermissions = (
  interventionStatus: string,
  userRole: UserRole,
  action: string
) => {
  const permissionMatrix = {
    'nouvelle-demande': {
      gestionnaire: ['approve', 'reject'],
      locataire: ['cancel'],
      prestataire: [],
      admin: ['approve', 'reject', 'cancel']
    },
    'approuvee': {
      gestionnaire: ['schedule', 'cancel'],
      prestataire: ['accept', 'request_quote'],
      locataire: [],
      admin: ['schedule', 'cancel']
    }
    // ... autres statuts
  }

  const allowedActions = permissionMatrix[interventionStatus]?.[userRole] || []
  const isAllowed = allowedActions.includes(action)

  SEIDODebugger.debugPermissions(
    `intervention_action_${action}`,
    userRole,
    'current_user_id',
    { interventionStatus, action },
    isAllowed,
    isAllowed ? 'Action permitted' : `Only allowed: ${allowedActions.join(', ')}`
  )

  return isAllowed
}
```

#### Étape 2 : Vérifier les données requises
```typescript
const validateActionRequirements = (intervention: any, action: string) => {
  const requirements = {
    'approve': ['tenant_id', 'manager_id'],
    'schedule': ['assigned_provider_id', 'manager_approval'],
    'start': ['scheduled_date', 'provider_confirmation'],
    'complete': ['execution_comment', 'final_amount']
  }

  const required = requirements[action] || []
  const missing = required.filter(field => !intervention[field])

  if (missing.length > 0) {
    SEIDODebugger.log('DEBUG', 'error', `Missing required data for ${action}`,
      { action, interventionId: intervention.id },
      { missing, required, intervention }
    )
  }

  return missing
}
```

#### Étape 3 : Tracer l'exécution de l'action
```typescript
const traceActionExecution = async (
  interventionId: string,
  action: string,
  payload: any
) => {
  const startTime = performance.now()

  console.group(`⚡ [SEIDO-TRACE] Action Execution: ${action}`)

  try {
    // 1. Validation pré-action
    console.log('1. Pre-validation...')
    const intervention = await getIntervention(interventionId)
    const validationErrors = validateActionRequirements(intervention, action)

    // 2. Exécution de l'action
    console.log('2. Executing action...')
    const result = await executeInterventionAction(interventionId, action, payload)

    // 3. Vérification post-action
    console.log('3. Post-validation...')
    const updatedIntervention = await getIntervention(interventionId)

    SEIDODebugger.debugInterventionTransition(
      interventionId,
      intervention.status,
      updatedIntervention.status,
      getCurrentUser().role,
      !!result.success
    )

    SEIDODebugger.debugPerformance(`action_${action}`, startTime, { interventionId })

    console.log('✅ Action completed successfully')

  } catch (error) {
    console.error('❌ Action failed:', error)
    SEIDODebugger.log('DEBUG', 'error', `Action ${action} failed`,
      { interventionId, action },
      { error: error.message, payload }
    )
  }

  console.groupEnd()
}
```

---

### 4. "Les données sont incohérentes entre les rôles"

**Symptômes** :
- Un gestionnaire voit des données différentes d'un prestataire
- Compteurs qui ne correspondent pas
- Interventions dupliquées ou manquantes

**Debugging étapes** :

#### Étape 1 : Audit des données par rôle
```typescript
const auditDataConsistency = async (interventionId: string) => {
  console.group(`📊 [SEIDO-AUDIT] Data Consistency: ${interventionId}`)

  const roles: UserRole[] = ['gestionnaire', 'prestataire', 'locataire', 'admin']
  const dataByRole: Record<UserRole, any> = {}

  for (const role of roles) {
    // Simuler l'accès avec chaque rôle
    const mockUser = { id: `${role}-test`, role, team_id: 'test-team' }
    const data = await getInterventionAsRole(interventionId, mockUser)
    dataByRole[role] = data

    console.log(`${role}:`, {
      visible: !!data,
      status: data?.status,
      fields: data ? Object.keys(data) : []
    })
  }

  // Comparer les données
  const inconsistencies = detectDataInconsistencies(dataByRole)
  if (inconsistencies.length > 0) {
    console.error('❌ Data inconsistencies found:', inconsistencies)
  } else {
    console.log('✅ Data consistent across roles')
  }

  console.groupEnd()
}
```

#### Étape 2 : Vérifier la synchronisation des caches
```typescript
const debugCacheSynchronization = () => {
  // Vérifier si les données sont cachées et synchronisées
  const cacheKeys = [
    'interventions_gestionnaire',
    'interventions_prestataire',
    'notifications_count',
    'dashboard_metrics'
  ]

  cacheKeys.forEach(key => {
    const cached = localStorage.getItem(key)
    const timestamp = localStorage.getItem(`${key}_timestamp`)

    console.log(`Cache ${key}:`, {
      exists: !!cached,
      age: timestamp ? Date.now() - parseInt(timestamp) : 'unknown',
      size: cached?.length || 0
    })
  })
}
```

---

### 5. "Problèmes de performance sur un dashboard"

**Symptômes** :
- Dashboard lent à charger
- Interface qui se bloque
- Métriques qui ne se mettent pas à jour

**Debugging étapes** :

#### Étape 1 : Profiler les requêtes
```typescript
const profileDashboardQueries = async (userRole: UserRole, userId: string) => {
  const startTime = performance.now()

  console.group(`⏱️ [SEIDO-PERF] Dashboard Performance: ${userRole}`)

  // Profiler chaque requête
  const metrics = await Promise.all([
    profileQuery('interventions', () => getInterventions(userRole, userId)),
    profileQuery('buildings', () => getBuildings(userRole, userId)),
    profileQuery('notifications', () => getNotifications(userId)),
    profileQuery('metrics', () => calculateMetrics(userRole, userId))
  ])

  const totalTime = performance.now() - startTime

  console.table(metrics)
  console.log(`Total dashboard load time: ${totalTime.toFixed(2)}ms`)

  // Identifier les requêtes lentes
  const slowQueries = metrics.filter(m => m.duration > 1000)
  if (slowQueries.length > 0) {
    console.warn('⚠️ Slow queries detected:', slowQueries)
  }

  console.groupEnd()
}

const profileQuery = async (name: string, queryFn: () => Promise<any>) => {
  const start = performance.now()
  const result = await queryFn()
  const duration = performance.now() - start

  return {
    query: name,
    duration: Math.round(duration),
    count: Array.isArray(result) ? result.length : 1,
    status: result ? 'success' : 'failed'
  }
}
```

#### Étape 2 : Analyser les re-renders
```typescript
// Hook pour détecter les re-renders excessifs
const useRenderTracker = (componentName: string) => {
  const renderCount = useRef(0)
  const lastRender = useRef(Date.now())

  renderCount.current += 1

  useEffect(() => {
    const now = Date.now()
    const timeSinceLastRender = now - lastRender.current
    lastRender.current = now

    if (renderCount.current > 5 && timeSinceLastRender < 100) {
      console.warn(`⚠️ [SEIDO-PERF] Excessive re-renders in ${componentName}:`, {
        count: renderCount.current,
        frequency: `${timeSinceLastRender}ms since last render`
      })
    }
  })

  return renderCount.current
}
```

---

## 🛠️ Outils de debugging SEIDO

### Console Commands
```javascript
// Commandes utiles dans la console du navigateur

// Activer le debugging verbose
window.SEIDO_DEBUG = true

// Tracer une intervention complète
SEIDODebugger.traceIntervention('intervention-id')

// Tester la connectivité Supabase
SEIDODebugger.testSupabaseConnectivity()

// Audit des permissions utilisateur
debugUserPermissions(getCurrentUser())

// Profiler les performances
profileDashboardQueries(getCurrentUser().role, getCurrentUser().id)
```

### Network Tab Debugging
```
Filtrer les requêtes par type :
- Supabase auth: /auth/v1/
- Database: /rest/v1/
- Real-time: /realtime/v1/
- Storage: /storage/v1/

Vérifier les headers :
- Authorization: Bearer token présent
- RLS policies: apikey header
- Real-time: websocket upgrade
```

### React DevTools
```
Composants à surveiller :
- Dashboard components (props et state)
- Intervention forms (validation states)
- Notification components (real-time updates)
- Auth guards (permission checks)

Profiler à activer pour :
- Component render times
- Hook dependencies
- Context value changes
```

---

## 📝 Checklist debugging rapide

### Avant de commencer
- [ ] Mode développement activé
- [ ] Console ouverte avec filtres SEIDO
- [ ] React DevTools installé
- [ ] Network tab accessible

### Pour chaque problème
- [ ] Reproduire le problème de façon consistante
- [ ] Identifier le rôle utilisateur concerné
- [ ] Vérifier les logs SEIDO dans la console
- [ ] Tracer les appels API dans Network tab
- [ ] Vérifier les permissions et filtres RLS
- [ ] Tester avec d'autres rôles pour comparaison

### Après résolution
- [ ] Valider la solution avec tous les rôles
- [ ] Vérifier l'impact sur les performances
- [ ] Documenter la cause et la solution
- [ ] Ajouter des tests de régression si nécessaire

Ce guide couvre 95% des problèmes de debugging dans SEIDO. Pour des problèmes plus spécifiques, utilisez l'agent SEIDO Debugger avec les outils et techniques appropriés.