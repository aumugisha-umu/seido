#!/usr/bin/env node

/**
 * Script de validation de la structure de test organisée
 * Vérifie que tous les dossiers sont créés et que l'organisation par rôle fonctionne
 */

const fs = require('fs')
const path = require('path')

const testDir = path.join(process.cwd(), 'test')

// Structure attendue
const expectedStructure = {
  screenshots: ['admin', 'gestionnaire', 'prestataire', 'locataire', 'auth', 'general'],
  videos: ['admin', 'gestionnaire', 'prestataire', 'locataire', 'auth', 'general'],
  traces: ['admin', 'gestionnaire', 'prestataire', 'locataire', 'auth', 'general'],
  e2e: ['admin', 'gestionnaire', 'prestataire', 'locataire', 'auth'],
  helpers: ['screenshot-helper.ts', 'media-organization-helper.ts'],
  utils: ['test-helpers.ts']
}

console.log('\n📋 Validation de la structure de test SEIDO\n')
console.log('=' .repeat(60))

let hasErrors = false

// Fonction de validation
function validateDirectory(baseDir, subDirs, description) {
  const dirPath = path.join(testDir, baseDir)

  console.log(`\n✅ Vérification de ${description}:`)

  if (!fs.existsSync(dirPath)) {
    console.error(`  ❌ Dossier manquant: ${baseDir}`)
    hasErrors = true
    return
  }

  subDirs.forEach(subDir => {
    const fullPath = path.join(dirPath, subDir)
    const exists = fs.existsSync(fullPath)

    if (exists) {
      const isFile = subDir.includes('.')
      const stats = fs.statSync(fullPath)

      if (isFile) {
        console.log(`  ✅ Fichier présent: ${subDir}`)
      } else {
        const fileCount = fs.readdirSync(fullPath).length
        console.log(`  ✅ ${subDir}/ (${fileCount} fichiers)`)
      }
    } else {
      console.error(`  ❌ Manquant: ${subDir}`)
      hasErrors = true
    }
  })
}

// Validation de chaque partie
validateDirectory('screenshots', expectedStructure.screenshots, 'Organisation Screenshots')
validateDirectory('videos', expectedStructure.videos, 'Organisation Videos')
validateDirectory('traces', expectedStructure.traces, 'Organisation Traces')
validateDirectory('e2e', expectedStructure.e2e, 'Tests E2E par rôle')
validateDirectory('helpers', expectedStructure.helpers, 'Helpers')
validateDirectory('utils', expectedStructure.utils, 'Utils')

// Vérification des fichiers importants
console.log('\n✅ Vérification des fichiers de configuration:')

const importantFiles = [
  'global-teardown.ts',
  'CONFIGURATION-SCREENSHOTS-RAPPORTS.md',
  '../playwright.config.ts'
]

importantFiles.forEach(file => {
  const filePath = path.join(testDir, file)
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    const size = (stats.size / 1024).toFixed(2)
    console.log(`  ✅ ${file} (${size} KB)`)
  } else {
    console.error(`  ❌ Fichier manquant: ${file}`)
    hasErrors = true
  }
})

// Statistiques
console.log('\n📊 Statistiques de la structure de test:')
console.log('=' .repeat(60))

const countFilesRecursive = (dir) => {
  let count = 0
  if (fs.existsSync(dir)) {
    const items = fs.readdirSync(dir)
    items.forEach(item => {
      const fullPath = path.join(dir, item)
      const stats = fs.statSync(fullPath)
      if (stats.isDirectory()) {
        count += countFilesRecursive(fullPath)
      } else {
        count++
      }
    })
  }
  return count
}

const stats = {
  totalScreenshots: countFilesRecursive(path.join(testDir, 'screenshots')),
  totalVideos: countFilesRecursive(path.join(testDir, 'videos')),
  totalTraces: countFilesRecursive(path.join(testDir, 'traces')),
  totalTests: countFilesRecursive(path.join(testDir, 'e2e'))
}

console.log(`  📸 Screenshots: ${stats.totalScreenshots} fichiers`)
console.log(`  🎥 Videos: ${stats.totalVideos} fichiers`)
console.log(`  🔍 Traces: ${stats.totalTraces} fichiers`)
console.log(`  🧪 Tests E2E: ${stats.totalTests} fichiers`)

// Résumé final
console.log('\n' + '=' .repeat(60))
if (!hasErrors) {
  console.log('\n✅ Structure de test validée avec succès!')
  console.log('   Tous les dossiers et fichiers requis sont présents.')
  console.log('   L\'organisation par rôle est correctement configurée.')
} else {
  console.error('\n❌ Des problèmes ont été détectés dans la structure.')
  console.error('   Veuillez corriger les éléments manquants ci-dessus.')
  process.exit(1)
}

console.log('\n💡 Utilisation:')
console.log('   - Tests par rôle: npm run test:e2e:gestionnaire')
console.log('   - Tests complets: npm run test:e2e')
console.log('   - Rapport HTML: npx playwright show-report test/reports/html')
console.log('\n')