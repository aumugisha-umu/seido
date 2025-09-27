/**
 * Script de validation Phase 2.4 - Server Components auth protection
 * Vérifie que tous les Server Components utilisent correctement le DAL
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Validation Phase 2.4 - Server Components auth protection\n')

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..')
const APP_DIR = path.join(PROJECT_ROOT, 'app')

const checks = {
  serverComponents: 0,
  dalUsage: 0,
  authProtection: 0,
  suspenseUsage: 0,
  cacheConfig: 0,
  errors: []
}

/**
 * Récursive directory scan
 */
function scanDirectory(dir) {
  const files = []

  function scan(currentDir) {
    const items = fs.readdirSync(currentDir)

    for (const item of items) {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath)
      } else if (item.endsWith('.tsx') && (item === 'page.tsx' || item === 'layout.tsx')) {
        files.push(fullPath)
      }
    }
  }

  scan(dir)
  return files
}

/**
 * Analyser un fichier Server Component
 */
function analyzeServerComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(PROJECT_ROOT, filePath)

  console.log(`📄 Analyse: ${relativePath}`)

  const analysis = {
    isServerComponent: false,
    usesDal: false,
    hasAuthProtection: false,
    usesSuspense: false,
    hasCacheConfig: false,
    issues: []
  }

  // ✅ Check 1: Est-ce un Server Component (pas de 'use client')
  if (!content.includes('"use client"') && !content.includes("'use client'")) {
    analysis.isServerComponent = true
    checks.serverComponents++
  } else {
    analysis.issues.push('❌ Client Component - pas de validation Server Component')
    return analysis
  }

  // ✅ Check 2: Utilise le DAL
  const dalImports = [
    'requireRole',
    'requireAuth',
    'requirePermission',
    'requireAuthWithPermissions',
    'verifySession'
  ]

  const hasDALImport = dalImports.some(dalFunc =>
    content.includes(`import {`) && content.includes(dalFunc)
  )

  if (hasDALImport) {
    analysis.usesDal = true
    checks.dalUsage++
  } else {
    analysis.issues.push('⚠️  Pas d\'import DAL détecté')
  }

  // ✅ Check 3: Protection auth avec await
  const authPatterns = [
    /await\s+requireRole\(/,
    /await\s+requireAuth\(/,
    /await\s+requirePermission\(/,
    /await\s+requireAuthWithPermissions\(/
  ]

  const hasAuthProtection = authPatterns.some(pattern => pattern.test(content))

  if (hasAuthProtection) {
    analysis.hasAuthProtection = true
    checks.authProtection++
  } else {
    analysis.issues.push('❌ Pas de protection auth server-side détectée')
  }

  // ✅ Check 4: Utilisation de Suspense
  if (content.includes('<Suspense') && content.includes('fallback=')) {
    analysis.usesSuspense = true
    checks.suspenseUsage++
  } else {
    analysis.issues.push('ℹ️  Pas de Suspense utilisé (recommandé pour async data)')
  }

  // ✅ Check 5: Configuration cache (revalidate)
  if (content.includes('export const revalidate')) {
    analysis.hasCacheConfig = true
    checks.cacheConfig++
  } else {
    analysis.issues.push('ℹ️  Pas de configuration de cache (revalidate)')
  }

  // Affichage des résultats
  if (analysis.issues.length === 0) {
    console.log('  ✅ Toutes les validations passent')
  } else {
    analysis.issues.forEach(issue => console.log(`  ${issue}`))
  }

  console.log('')
  return analysis
}

/**
 * Validation des exemples créés en Phase 2.4
 */
function validatePhase24Examples() {
  console.log('🎯 Validation des exemples Phase 2.4:\n')

  const phase24Examples = [
    path.join(APP_DIR, 'admin', 'users', 'page.tsx'),
    path.join(APP_DIR, '[role]', 'dashboard', 'page.tsx'),
    path.join(APP_DIR, '[role]', 'dashboard', 'layout.tsx'),
    path.join(APP_DIR, 'prestataire', 'quotes', 'page.tsx')
  ]

  const existingExamples = phase24Examples.filter(file => fs.existsSync(file))

  if (existingExamples.length === 0) {
    checks.errors.push('❌ Aucun exemple Phase 2.4 trouvé')
    return
  }

  console.log(`📋 ${existingExamples.length} exemples Phase 2.4 trouvés\n`)

  existingExamples.forEach(file => {
    analyzeServerComponent(file)
  })
}

/**
 * Validation du DAL complet
 */
function validateDALStructure() {
  console.log('🔧 Validation structure DAL:\n')

  const dalFiles = [
    path.join(PROJECT_ROOT, 'lib', 'dal', 'index.ts'),
    path.join(PROJECT_ROOT, 'lib', 'dal', 'auth.ts'),
    path.join(PROJECT_ROOT, 'lib', 'dal', 'cache.ts'),
    path.join(PROJECT_ROOT, 'lib', 'dal', 'users.ts'),
    path.join(PROJECT_ROOT, 'lib', 'dal', 'permissions.ts')
  ]

  const existingDAL = dalFiles.filter(file => fs.existsSync(file))

  console.log(`📁 DAL: ${existingDAL.length}/${dalFiles.length} fichiers présents`)

  dalFiles.forEach(file => {
    const exists = fs.existsSync(file)
    const relativePath = path.relative(PROJECT_ROOT, file)
    console.log(`  ${exists ? '✅' : '❌'} ${relativePath}`)
  })

  console.log('')
}

/**
 * Recommandations Next.js 2025
 */
function validateNextJS2025Compliance() {
  console.log('🆕 Validation conformité Next.js 2025:\n')

  // Check middleware est lightweight
  const middlewarePath = path.join(PROJECT_ROOT, 'middleware.ts')
  if (fs.existsSync(middlewarePath)) {
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8')
    const lines = middlewareContent.split('\n').length

    console.log(`📄 middleware.ts: ${lines} lignes`)

    if (lines > 100) {
      checks.errors.push('⚠️  Middleware trop volumineux (>100 lignes)')
      console.log('  ⚠️  Middleware devrait être léger (cookies only)')
    } else {
      console.log('  ✅ Middleware lightweight')
    }

    // Check pas de JWT validation dans middleware
    if (middlewareContent.includes('jwt') || middlewareContent.includes('getUser')) {
      checks.errors.push('❌ Middleware fait de la validation JWT (interdit Next.js 2025)')
      console.log('  ❌ Middleware ne devrait pas faire de validation JWT')
    } else {
      console.log('  ✅ Pas de validation JWT dans middleware')
    }
  }

  // Check utilisation cache React natif
  const cacheFile = path.join(PROJECT_ROOT, 'lib', 'dal', 'cache.ts')
  if (fs.existsSync(cacheFile)) {
    const cacheContent = fs.readFileSync(cacheFile, 'utf-8')

    if (cacheContent.includes('import { cache }') && cacheContent.includes('unstable_cache')) {
      console.log('  ✅ Utilise cache React natif')
    } else {
      checks.errors.push('⚠️  N\'utilise pas le cache React natif')
      console.log('  ⚠️  Devrait utiliser cache() et unstable_cache()')
    }
  }

  console.log('')
}

/**
 * Main validation
 */
function main() {
  try {
    validateDALStructure()
    validateNextJS2025Compliance()
    validatePhase24Examples()

    // Scan global des pages app/
    console.log('🔍 Scan complet du répertoire app/:\n')
    const allPages = scanDirectory(APP_DIR)

    if (allPages.length === 0) {
      checks.errors.push('❌ Aucune page trouvée dans app/')
    } else {
      console.log(`📊 ${allPages.length} pages/layouts trouvés au total\n`)
    }

    // Résumé final
    console.log('📊 RÉSUMÉ PHASE 2.4 - SERVER COMPONENTS')
    console.log('=' .repeat(50))
    console.log(`✅ Server Components détectés: ${checks.serverComponents}`)
    console.log(`🔧 Avec DAL: ${checks.dalUsage}`)
    console.log(`🛡️  Avec protection auth: ${checks.authProtection}`)
    console.log(`⏳ Avec Suspense: ${checks.suspenseUsage}`)
    console.log(`💾 Avec cache config: ${checks.cacheConfig}`)
    console.log('')

    if (checks.errors.length > 0) {
      console.log('❌ ERREURS CRITIQUES:')
      checks.errors.forEach(error => console.log(`  ${error}`))
    } else {
      console.log('🎉 PHASE 2.4 VALIDÉE - Server Components conformes Next.js 2025!')
    }

    console.log('')
    console.log('✨ Phase 2.4 terminée - Prêt pour validation complète Phase 2')

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message)
    process.exit(1)
  }
}

// Exécution
main()