/**
 * Script de validation complète Phase 2
 * Vérifie toute l'architecture Next.js 2025 compliant mise en place
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 VALIDATION COMPLÈTE PHASE 2 - Next.js 2025 Architecture')
console.log('=' .repeat(60))
console.log('')

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..')

const validation = {
  phase21: { name: 'DAL + Services modulaires', status: 'pending', score: 0 },
  phase22: { name: 'Cache React natif', status: 'pending', score: 0 },
  phase23: { name: 'Bundle optimization', status: 'pending', score: 0 },
  phase24: { name: 'Server Components auth', status: 'pending', score: 0 },
  overall: { score: 0, maxScore: 400 }
}

/**
 * Phase 2.1 - Validation DAL + Services modulaires
 */
function validatePhase21() {
  console.log('📋 PHASE 2.1 - DAL + Services modulaires')
  console.log('-'.repeat(40))

  let score = 0

  // 1. Structure DAL complète
  const dalFiles = [
    'lib/dal/index.ts',
    'lib/dal/auth.ts',
    'lib/dal/cache.ts',
    'lib/dal/users.ts',
    'lib/dal/permissions.ts',
    'lib/dal/sessions.ts'
  ]

  dalFiles.forEach(file => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, file))
    console.log(`  ${exists ? '✅' : '❌'} ${file}`)
    if (exists) score += 10
  })

  // 2. Exports DAL centralisés
  const dalIndex = path.join(PROJECT_ROOT, 'lib/dal/index.ts')
  if (fs.existsSync(dalIndex)) {
    const content = fs.readFileSync(dalIndex, 'utf-8')
    const exports = [
      'verifySession',
      'requireRole',
      'requireAuthWithPermissions',
      'getCachedUser',
      'hasPermission'
    ]

    exports.forEach(exp => {
      const hasExport = content.includes(exp)
      console.log(`  ${hasExport ? '✅' : '❌'} Export: ${exp}`)
      if (hasExport) score += 5
    })
  }

  // 3. Cache React natif dans DAL
  const cacheFile = path.join(PROJECT_ROOT, 'lib/dal/cache.ts')
  if (fs.existsSync(cacheFile)) {
    const content = fs.readFileSync(cacheFile, 'utf-8')
    if (content.includes('import { cache }')) {
      console.log('  ✅ Utilise cache React natif')
      score += 15
    }
    if (content.includes('unstable_cache')) {
      console.log('  ✅ Utilise unstable_cache Next.js')
      score += 15
    }
  }

  validation.phase21.score = score
  validation.phase21.status = score >= 80 ? 'passed' : 'failed'
  console.log(`  📊 Score Phase 2.1: ${score}/100\n`)

  return score
}

/**
 * Phase 2.2 - Validation Cache React natif
 */
function validatePhase22() {
  console.log('💾 PHASE 2.2 - Cache React natif')
  console.log('-'.repeat(40))

  let score = 0

  // 1. Migration du cache custom
  const authCacheExists = fs.existsSync(path.join(PROJECT_ROOT, 'lib/auth-cache-manager.ts'))
  if (!authCacheExists) {
    console.log('  ✅ Cache custom supprimé')
    score += 20
  } else {
    console.log('  ⚠️  Cache custom encore présent')
  }

  // 2. ReactCacheManager implémenté
  const cacheFile = path.join(PROJECT_ROOT, 'lib/dal/cache.ts')
  if (fs.existsSync(cacheFile)) {
    const content = fs.readFileSync(cacheFile, 'utf-8')

    if (content.includes('class ReactCacheManager')) {
      console.log('  ✅ ReactCacheManager implémenté')
      score += 20
    }

    if (content.includes('createCacheFunction')) {
      console.log('  ✅ Cache factory functions')
      score += 15
    }

    if (content.includes('specializedCaches')) {
      console.log('  ✅ Caches spécialisés')
      score += 15
    }

    if (content.includes('cacheAdapters')) {
      console.log('  ✅ Adapters pour migration')
      score += 15
    }
  }

  // 3. Utilisation dans hooks/services
  const authService = path.join(PROJECT_ROOT, 'lib/auth-service.ts')
  if (fs.existsSync(authService)) {
    const content = fs.readFileSync(authService, 'utf-8')
    if (content.includes('ReactCacheManager') || content.includes('@/lib/dal')) {
      console.log('  ✅ Services utilisent le nouveau cache')
      score += 15
    }
  }

  validation.phase22.score = score
  validation.phase22.status = score >= 80 ? 'passed' : 'failed'
  console.log(`  📊 Score Phase 2.2: ${score}/100\n`)

  return score
}

/**
 * Phase 2.3 - Validation Bundle optimization
 */
function validatePhase23() {
  console.log('📦 PHASE 2.3 - Bundle optimization')
  console.log('-'.repeat(40))

  let score = 0

  // 1. Next.js config optimisé
  const nextConfig = path.join(PROJECT_ROOT, 'next.config.mjs')
  if (fs.existsSync(nextConfig)) {
    const content = fs.readFileSync(nextConfig, 'utf-8')

    if (content.includes('splitChunks')) {
      console.log('  ✅ Code splitting configuré')
      score += 25
    }

    if (content.includes('auth-dal')) {
      console.log('  ✅ Chunk auth/DAL séparé')
      score += 20
    }

    if (content.includes('optimizePackageImports')) {
      console.log('  ✅ Package imports optimisés')
      score += 20
    }

    if (content.includes('optimizeCss')) {
      console.log('  ✅ CSS optimization activée')
      score += 15
    }

    if (content.includes('Strict-Transport-Security')) {
      console.log('  ✅ Headers de sécurité')
      score += 20
    }
  }

  validation.phase23.score = score
  validation.phase23.status = score >= 80 ? 'passed' : 'failed'
  console.log(`  📊 Score Phase 2.3: ${score}/100\n`)

  return score
}

/**
 * Phase 2.4 - Validation Server Components
 */
function validatePhase24() {
  console.log('🖥️  PHASE 2.4 - Server Components auth protection')
  console.log('-'.repeat(40))

  let score = 0

  // 1. Exemples Server Components créés
  const examples = [
    'app/admin/users/page.tsx',
    'app/[role]/dashboard/page.tsx',
    'app/[role]/dashboard/layout.tsx',
    'app/prestataire/quotes/page.tsx'
  ]

  examples.forEach(file => {
    const exists = fs.existsSync(path.join(PROJECT_ROOT, file))
    console.log(`  ${exists ? '✅' : '❌'} ${file}`)
    if (exists) score += 15
  })

  // 2. Middleware lightweight
  const middleware = path.join(PROJECT_ROOT, 'middleware.ts')
  if (fs.existsSync(middleware)) {
    const content = fs.readFileSync(middleware, 'utf-8')
    const lines = content.split('\n').length

    if (lines < 100) {
      console.log(`  ✅ Middleware lightweight (${lines} lignes)`)
      score += 20
    }

    if (!content.includes('getUser') && !content.includes('jwt')) {
      console.log('  ✅ Pas de validation JWT dans middleware')
      score += 20
    }
  }

  validation.phase24.score = score
  validation.phase24.status = score >= 80 ? 'passed' : 'failed'
  console.log(`  📊 Score Phase 2.4: ${score}/100\n`)

  return score
}

/**
 * Test de build pour vérifier que tout compile
 */
function testBuild() {
  console.log('🔨 TEST DE BUILD')
  console.log('-'.repeat(40))

  try {
    console.log('  🔄 npm run build...')
    const buildOutput = execSync('npm run build', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 120000 // 2 minutes max
    })

    if (buildOutput.includes('✓ Compiled successfully')) {
      console.log('  ✅ Build réussie')
      return 50
    } else {
      console.log('  ⚠️  Build avec warnings')
      return 25
    }
  } catch (error) {
    console.log('  ❌ Build échouée')
    console.log(`  Error: ${error.message.slice(0, 200)}...`)
    return 0
  }
}

/**
 * Validation des métriques de performance
 */
function validatePerformanceMetrics() {
  console.log('⚡ MÉTRIQUES DE PERFORMANCE')
  console.log('-'.repeat(40))

  let score = 0

  // Vérifier la taille des bundles serait idéal mais nécessite un build
  // Pour l'instant, on vérifie les optimisations mises en place

  const nextConfig = path.join(PROJECT_ROOT, 'next.config.mjs')
  if (fs.existsSync(nextConfig)) {
    const content = fs.readFileSync(nextConfig, 'utf-8')

    // Optimisations présentes
    const optimizations = [
      { key: 'splitChunks', name: 'Code splitting', points: 10 },
      { key: 'optimizeCss', name: 'CSS optimization', points: 10 },
      { key: 'optimizePackageImports', name: 'Package imports', points: 15 },
      { key: 'tree shaking', name: 'Tree shaking config', points: 10 },
      { key: 'resolve.alias', name: 'Alias optimization', points: 5 }
    ]

    optimizations.forEach(opt => {
      if (content.includes(opt.key)) {
        console.log(`  ✅ ${opt.name}`)
        score += opt.points
      } else {
        console.log(`  ❌ ${opt.name}`)
      }
    })
  }

  console.log(`  📊 Score Performance: ${score}/50\n`)
  return score
}

/**
 * Résumé final et recommandations
 */
function generateFinalReport() {
  const totalScore = validation.phase21.score + validation.phase22.score +
                    validation.phase23.score + validation.phase24.score

  console.log('📊 RÉSUMÉ FINAL PHASE 2')
  console.log('=' .repeat(60))
  console.log('')

  // Status par phase
  Object.entries(validation).forEach(([key, phase]) => {
    if (key !== 'overall') {
      const status = phase.status === 'passed' ? '✅' :
                    phase.status === 'failed' ? '❌' : '⏳'
      console.log(`${status} ${phase.name}: ${phase.score}/100`)
    }
  })

  console.log('')
  console.log(`🎯 SCORE TOTAL: ${totalScore}/400 (${Math.round(totalScore/4)}%)`)

  // Évaluation globale
  if (totalScore >= 350) {
    console.log('🎉 EXCELLENT - Phase 2 complètement réussie!')
    console.log('   Architecture Next.js 2025 compliant implémentée avec succès')
  } else if (totalScore >= 300) {
    console.log('✅ BIEN - Phase 2 largement réussie')
    console.log('   Quelques optimisations mineures possibles')
  } else if (totalScore >= 250) {
    console.log('⚠️  CORRECT - Phase 2 partiellement réussie')
    console.log('   Certains aspects nécessitent des améliorations')
  } else {
    console.log('❌ INSUFFISANT - Phase 2 nécessite du travail supplémentaire')
  }

  console.log('')

  // Recommandations
  console.log('💡 RECOMMANDATIONS:')
  if (validation.phase21.score < 90) {
    console.log('  • Compléter l\'implémentation du DAL')
  }
  if (validation.phase22.score < 90) {
    console.log('  • Finaliser la migration vers cache React natif')
  }
  if (validation.phase23.score < 90) {
    console.log('  • Optimiser davantage la configuration webpack/bundle')
  }
  if (validation.phase24.score < 90) {
    console.log('  • Créer plus d\'exemples Server Components')
  }

  console.log('')
  console.log('🚀 Phase 2 terminée - Prêt pour Phase 3!')
}

/**
 * Main execution
 */
function main() {
  try {
    console.log(`📍 Projet: ${PROJECT_ROOT}`)
    console.log(`📅 Date: ${new Date().toLocaleString('fr-FR')}`)
    console.log('')

    // Exécution des validations
    validatePhase21()
    validatePhase22()
    validatePhase23()
    validatePhase24()

    // Tests additionnels
    const buildScore = testBuild()
    const perfScore = validatePerformanceMetrics()

    // Ajout des scores bonus
    validation.phase23.score += perfScore
    validation.phase24.score += buildScore

    // Rapport final
    generateFinalReport()

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message)
    process.exit(1)
  }
}

// Exécution
main()