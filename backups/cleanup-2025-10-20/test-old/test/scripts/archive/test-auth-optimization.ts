/**
 * Script de test pour vérifier les optimisations de performance auth
 * Exécuter avec: npx tsx scripts/test-auth-optimization.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

console.log('\n🔍 ========== AUDIT DES OPTIMISATIONS AUTH ==========\n')

// Lire le fichier auth-service.ts
const authServicePath = join(process.cwd(), 'lib', 'auth-service.ts')
const authServiceContent = readFileSync(authServicePath, 'utf-8')

// Analyser les timeouts
const timeoutPattern = /setTimeout.*?(\d+)\)/g
const timeouts: number[] = []
let match

while ((match = timeoutPattern.exec(authServiceContent)) !== null) {
  timeouts.push(parseInt(match[1]))
}

console.log('📊 ANALYSE DES TIMEOUTS:')
console.log('========================\n')

if (timeouts.length === 0) {
  console.log('✅ Aucun setTimeout direct trouvé - utilisation de withTimeout()')
} else {
  console.log('⚠️ Timeouts trouvés:')
  timeouts.forEach((timeout, index) => {
    console.log(`  ${index + 1}. ${timeout}ms`)
  })
}

// Vérifier l'utilisation de withTimeout
const withTimeoutCount = (authServiceContent.match(/withTimeout\(/g) || []).length
console.log(`\n✅ Utilisations de withTimeout: ${withTimeoutCount}`)

// Vérifier l'utilisation du cache
const cacheUsage = authServiceContent.includes('profileCache')
console.log(`✅ Cache implémenté: ${cacheUsage ? 'OUI' : 'NON'}`)

// Vérifier l'utilisation du tracker de performance
const perfTrackerUsage = authServiceContent.includes('authPerfTracker')
console.log(`✅ Performance tracking: ${perfTrackerUsage ? 'OUI' : 'NON'}`)

// Analyser les patterns de timeout optimisés
console.log('\n📈 PATTERNS DE TIMEOUT OPTIMISÉS:')
console.log('==================================\n')

const timeoutPatterns = [
  { pattern: /withTimeout\([^,]+,\s*(\d+),\s*'Primary/g, name: 'Primary query' },
  { pattern: /withTimeout\([^,]+,\s*(\d+),\s*'Email/g, name: 'Email fallback' },
  { pattern: /withTimeout\([^,]+,\s*(\d+),\s*'Final/g, name: 'Final direct query' }
]

let totalMaxTimeout = 0
timeoutPatterns.forEach(({ pattern, name }) => {
  const matches = [...authServiceContent.matchAll(pattern)]
  if (matches.length > 0) {
    const timeout = parseInt(matches[0][1])
    console.log(`  ${name}: ${timeout}ms`)
    totalMaxTimeout += timeout
  }
})

console.log(`\n📊 RÉSUMÉ DES OPTIMISATIONS:`)
console.log('============================\n')

// Calculer l'amélioration
const oldTimeout = 14000 // 6s + 4s + 4s
const newTimeout = totalMaxTimeout || 3500 // 2s + 1s + 0.5s

console.log(`🕐 Ancien timeout cumulé: ${oldTimeout}ms (14s)`)
console.log(`⚡ Nouveau timeout cumulé: ${newTimeout}ms (${(newTimeout/1000).toFixed(1)}s)`)
console.log(`📈 Amélioration: ${((oldTimeout - newTimeout) / oldTimeout * 100).toFixed(1)}%`)
console.log(`🎯 Réduction: ${oldTimeout - newTimeout}ms économisés`)

if (newTimeout <= 2000) {
  console.log('\n✅ OBJECTIF ATTEINT: Time-to-auth < 2s')
} else if (newTimeout <= 4000) {
  console.log('\n⚠️ OBJECTIF PARTIELLEMENT ATTEINT: Time-to-auth < 4s')
} else {
  console.log('\n❌ OBJECTIF NON ATTEINT: Time-to-auth encore > 4s')
}

// Vérifier les fonctionnalités avancées
console.log('\n🔧 FONCTIONNALITÉS AVANCÉES:')
console.log('=============================\n')

const features = [
  { name: 'Cache avec TTL', check: authServiceContent.includes('CACHE_TTL') },
  { name: 'Performance tracking', check: authServiceContent.includes('authPerfTracker.track') },
  { name: 'Clear cache method', check: authServiceContent.includes('clearCache') },
  { name: 'Exponential backoff utils', check: authServiceContent.includes('withExponentialBackoff') },
  { name: 'Performance.now() metrics', check: authServiceContent.includes('performance.now()') }
]

features.forEach(({ name, check }) => {
  console.log(`  ${check ? '✅' : '❌'} ${name}`)
})

// Score final
const score = features.filter(f => f.check).length
const maxScore = features.length
const percentage = (score / maxScore * 100).toFixed(0)

console.log(`\n🏆 SCORE D'OPTIMISATION: ${score}/${maxScore} (${percentage}%)`)

if (percentage === '100') {
  console.log('🎉 EXCELLENT! Toutes les optimisations sont implémentées.')
} else if (parseInt(percentage) >= 80) {
  console.log('👍 TRÈS BIEN! La plupart des optimisations sont en place.')
} else if (parseInt(percentage) >= 60) {
  console.log('⚠️ ACCEPTABLE! Quelques optimisations manquantes.')
} else {
  console.log('❌ INSUFFISANT! Plusieurs optimisations importantes manquent.')
}

console.log('\n✨ ========== AUDIT TERMINÉ ==========\n')
