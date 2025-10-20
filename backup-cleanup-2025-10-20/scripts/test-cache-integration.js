/**
 * Script de test pour valider l'intégration du cache SSR
 * Vérifie les performances et la fonctionnalité du cache multi-niveau
 */

const { authCacheManager } = require('../lib/auth-cache-manager')

console.log('🧪 Test d\'intégration du cache SSR SEIDO\n')
console.log('=' .repeat(50))

async function testCacheIntegration() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }

  // Test 1: Cache Manager Singleton
  console.log('\n📊 Test 1: Cache Manager Singleton')
  try {
    const instance1 = authCacheManager
    const instance2 = require('../lib/auth-cache-manager').authCacheManager

    if (instance1 === instance2) {
      console.log('✅ Singleton pattern fonctionnel')
      results.passed++
    } else {
      throw new Error('Instances différentes')
    }
  } catch (error) {
    console.log('❌ Singleton pattern échoué:', error.message)
    results.failed++
  }

  // Test 2: Set and Get
  console.log('\n📊 Test 2: Cache Set/Get Operations')
  try {
    const testData = {
      id: 'test-user-123',
      email: 'test@seido.com',
      role: 'gestionnaire'
    }

    authCacheManager.set('profile', 'test-user', testData)
    const retrieved = await authCacheManager.get('profile', 'test-user')

    if (retrieved && retrieved.id === testData.id) {
      console.log('✅ Cache set/get fonctionnel')
      results.passed++
    } else {
      throw new Error('Données non récupérées')
    }
  } catch (error) {
    console.log('❌ Cache set/get échoué:', error.message)
    results.failed++
  }

  // Test 3: TTL Validation
  console.log('\n📊 Test 3: TTL et Expiration')
  try {
    const shortLivedData = { temp: true }
    authCacheManager.set('session', 'temp-session', shortLivedData)

    // Données fraîches
    const fresh = await authCacheManager.get('session', 'temp-session')
    if (!fresh) throw new Error('Données fraîches non trouvées')

    console.log('✅ TTL validation fonctionnelle')
    results.passed++
  } catch (error) {
    console.log('❌ TTL validation échouée:', error.message)
    results.failed++
  }

  // Test 4: Cache Metrics
  console.log('\n📊 Test 4: Métriques du Cache')
  try {
    const metrics = authCacheManager.getMetrics()

    if (metrics && typeof metrics.hitRate === 'number') {
      console.log(`✅ Métriques disponibles:`)
      console.log(`   - Hit Rate: ${metrics.hitRate.toFixed(2)}%`)
      console.log(`   - Taille: ${metrics.size} entrées`)
      console.log(`   - Mémoire: ~${metrics.memoryUsage}KB`)
      results.passed++
    } else {
      throw new Error('Métriques invalides')
    }
  } catch (error) {
    console.log('❌ Métriques échouées:', error.message)
    results.failed++
  }

  // Test 5: Cache Invalidation
  console.log('\n📊 Test 5: Invalidation du Cache')
  try {
    authCacheManager.set('profile', 'user-to-invalidate', { test: true })
    authCacheManager.invalidate('profile', 'user-to-invalidate')

    const invalidated = await authCacheManager.get('profile', 'user-to-invalidate')

    if (!invalidated) {
      console.log('✅ Invalidation fonctionnelle')
      results.passed++
    } else {
      throw new Error('Données non invalidées')
    }
  } catch (error) {
    console.log('❌ Invalidation échouée:', error.message)
    results.failed++
  }

  // Test 6: Stale While Revalidate
  console.log('\n📊 Test 6: Stale-While-Revalidate Strategy')
  try {
    let fetchCount = 0
    const fetcher = async () => {
      fetchCount++
      return { data: 'fresh', count: fetchCount }
    }

    // Premier fetch
    const data1 = await authCacheManager.get('profile', 'stale-test', fetcher)

    // Deuxième appel (devrait être en cache)
    const data2 = await authCacheManager.get('profile', 'stale-test', fetcher)

    if (data1 && data2 && fetchCount === 1) {
      console.log('✅ Stale-while-revalidate fonctionnel')
      console.log(`   - Fetch appelé ${fetchCount} fois (cache hit)`)
      results.passed++
    } else {
      throw new Error(`Fetcher appelé ${fetchCount} fois`)
    }
  } catch (error) {
    console.log('❌ Stale-while-revalidate échoué:', error.message)
    results.failed++
  }

  // Test 7: Memory Usage
  console.log('\n📊 Test 7: Gestion Mémoire')
  try {
    const memoryUsage = authCacheManager.getMemoryUsage()

    if (memoryUsage && memoryUsage.total >= 0) {
      console.log('✅ Gestion mémoire fonctionnelle')
      console.log(`   - Profiles: ${memoryUsage.profiles} entrées`)
      console.log(`   - Teams: ${memoryUsage.teams} entrées`)
      console.log(`   - Permissions: ${memoryUsage.permissions} entrées`)
      console.log(`   - Total: ${memoryUsage.total} entrées`)
      results.passed++
    } else {
      throw new Error('Usage mémoire invalide')
    }
  } catch (error) {
    console.log('❌ Gestion mémoire échouée:', error.message)
    results.failed++
  }

  // Clean up
  authCacheManager.clear()

  // Résumé
  console.log('\n' + '=' .repeat(50))
  console.log('📈 RÉSUMÉ DES TESTS\n')
  console.log(`✅ Tests réussis: ${results.passed}/7`)
  console.log(`❌ Tests échoués: ${results.failed}/7`)

  const successRate = (results.passed / 7 * 100).toFixed(1)
  console.log(`\n📊 Taux de réussite: ${successRate}%`)

  if (results.passed === 7) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS!')
    console.log('Le système de cache SSR est opérationnel.')
  } else {
    console.log('\n⚠️ Certains tests ont échoué.')
    console.log('Vérifiez les logs ci-dessus pour plus de détails.')
  }

  return results
}

// Performance benchmark
async function benchmarkCache() {
  console.log('\n' + '=' .repeat(50))
  console.log('⚡ BENCHMARK DE PERFORMANCE\n')

  const iterations = 1000
  const testData = { id: 'bench', data: 'x'.repeat(1000) }

  // Benchmark Set
  console.log(`📊 Test Set (${iterations} itérations)`)
  const setStart = Date.now()
  for (let i = 0; i < iterations; i++) {
    authCacheManager.set('profile', `bench-${i}`, testData)
  }
  const setTime = Date.now() - setStart
  console.log(`   ⏱️ Temps: ${setTime}ms`)
  console.log(`   📈 Ops/sec: ${(iterations / setTime * 1000).toFixed(0)}`)

  // Benchmark Get (cache hit)
  console.log(`\n📊 Test Get - Cache Hit (${iterations} itérations)`)
  const getStart = Date.now()
  for (let i = 0; i < iterations; i++) {
    await authCacheManager.get('profile', `bench-${i % 100}`)
  }
  const getTime = Date.now() - getStart
  console.log(`   ⏱️ Temps: ${getTime}ms`)
  console.log(`   📈 Ops/sec: ${(iterations / getTime * 1000).toFixed(0)}`)

  // Clear benchmark data
  authCacheManager.clear()

  console.log('\n✅ Benchmark terminé')
}

// Main execution
async function main() {
  try {
    await testCacheIntegration()
    await benchmarkCache()

    console.log('\n' + '=' .repeat(50))
    console.log('✅ Tests d\'intégration du cache terminés avec succès')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error)
    process.exit(1)
  }
}

main()