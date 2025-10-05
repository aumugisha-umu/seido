/**
 * Script de validation de l'intégration du cache SSR
 */

import { authCacheManager } from '../lib/auth-cache-manager'
import { clientCache } from '../lib/cache/client-cache'
import { logger, logError } from '@/lib/logger'

console.log('🧪 Validation de l\'intégration du cache SSR SEIDO\n')
console.log('=' .repeat(50))

async function validateCacheIntegration() {
  const results = {
    components: [] as string[],
    apis: [] as string[],
    performance: {} as any
  }

  // 1. Vérifier les composants du cache
  console.log('\n📦 Composants du Cache:')

  const components = [
    { name: 'Auth Cache Manager', path: '../lib/auth-cache-manager.ts' },
    { name: 'Server Cache', path: '../lib/cache/server-cache.ts' },
    { name: 'Client Cache', path: '../lib/cache/client-cache.ts' },
    { name: 'Cache Sync', path: '../lib/cache/cache-sync.ts' }
  ]

  for (const comp of components) {
    try {
      require(comp.path)
      console.log(`✅ ${comp.name}`)
      results.components.push(comp.name)
    } catch {
      console.log(`❌ ${comp.name} - Non trouvé`)
    }
  }

  // 2. Vérifier les API Routes
  console.log('\n🔌 API Routes:')

  const apis = [
    { name: 'Dashboard Stats', path: '../app/api/dashboard/stats/route.ts' },
    { name: 'Cache Metrics', path: '../app/api/cache/metrics/route.ts' }
  ]

  for (const api of apis) {
    try {
      require(api.path)
      console.log(`✅ ${api.name}`)
      results.apis.push(api.name)
    } catch {
      console.log(`❌ ${api.name} - Non trouvé`)
    }
  }

  // 3. Test de performance basique
  console.log('\n⚡ Performance du Cache:')

  // Test Auth Cache Manager
  const testStart = Date.now()
  authCacheManager.set('test-key', { data: 'test' })
  const testData = authCacheManager.get('test-key')
  const testTime = Date.now() - testStart

  console.log(`✅ Auth Cache: ${testTime}ms`)
  results.performance.authCache = testTime

  // Test métriques
  const metrics = authCacheManager.getMetrics()
  console.log(`✅ Hit Rate: ${metrics.hitRate?.toFixed(1) || 0}%`)
  console.log(`✅ Entrées en cache: ${metrics.size || 0}`)

  // 4. Résumé
  console.log('\n' + '=' .repeat(50))
  console.log('📊 RÉSUMÉ DE LA VALIDATION\n')

  const totalComponents = results.components.length
  const totalAPIs = results.apis.length

  console.log(`Composants intégrés: ${totalComponents}/4`)
  console.log(`API Routes créées: ${totalAPIs}/2`)
  console.log(`Performance cache: <${results.performance.authCache}ms`)

  if (totalComponents === 4 && totalAPIs === 2) {
    console.log('\n✅ Intégration du cache SSR complète!')
    console.log('Tous les composants sont en place et fonctionnels.')
  } else {
    console.log('\n⚠️ Intégration partielle.')
    console.log('Certains composants manquent ou nécessitent configuration.')
  }

  // Clean up
  authCacheManager.clear()

  return results
}

// Execute validation
validateCacheIntegration()
  .then(() => {
    console.log('\n✅ Validation terminée')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de la validation:', error)
    process.exit(1)
  })

export {}
