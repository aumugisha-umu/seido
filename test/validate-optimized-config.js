#!/usr/bin/env node
/**
 * Script de validation de la configuration optimisée
 * Vérifie que tous les fichiers et helpers sont correctement configurés
 */

const fs = require('fs/promises')
const path = require('path')

async function main() {
  console.log('🔍 Validation de la configuration des tests UI optimisés...\n')

  const validationResults = {
    configFiles: [],
    helpers: [],
    scripts: [],
    directories: [],
    errors: []
  }

  try {
    // 1. Vérifier les fichiers de configuration
    await validateConfigFiles(validationResults)

    // 2. Vérifier les helpers
    await validateHelpers(validationResults)

    // 3. Vérifier les scripts
    await validateScripts(validationResults)

    // 4. Vérifier les dossiers
    await validateDirectories(validationResults)

    // 5. Afficher le résumé
    displayValidationResults(validationResults)

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error)
    process.exit(1)
  }
}

async function validateConfigFiles(results) {
  console.log('📋 Validation des fichiers de configuration...')

  const configFiles = [
    'playwright.config.ts',
    'package.json',
    'test/global-teardown.ts'
  ]

  for (const file of configFiles) {
    try {
      await fs.access(file)
      results.configFiles.push({ file, status: '✅ OK' })
      console.log(`   ✅ ${file}`)
    } catch (error) {
      results.configFiles.push({ file, status: '❌ Manquant' })
      results.errors.push(`Fichier manquant: ${file}`)
      console.log(`   ❌ ${file} - Manquant`)
    }
  }

  // Vérifier le contenu de package.json
  try {
    const packageJson = await fs.readFile('package.json', 'utf-8')
    const pkg = JSON.parse(packageJson)

    const requiredScripts = [
      'test:e2e:optimized',
      'test:e2e:visual',
      'test:e2e:gestionnaire'
    ]

    for (const script of requiredScripts) {
      if (pkg.scripts && pkg.scripts[script]) {
        console.log(`   ✅ Script ${script} configuré`)
      } else {
        results.errors.push(`Script manquant: ${script}`)
        console.log(`   ❌ Script ${script} manquant`)
      }
    }
  } catch (error) {
    results.errors.push('Impossible de valider package.json')
  }
}

async function validateHelpers(results) {
  console.log('\n🔧 Validation des helpers...')

  const helpers = [
    'test/e2e/helpers/screenshot-helpers.ts',
    'test/e2e/helpers/auth-helpers.ts',
    'test/e2e/helpers/test-selectors.ts'
  ]

  for (const helper of helpers) {
    try {
      const content = await fs.readFile(helper, 'utf-8')

      // Vérifications basiques du contenu
      let isValid = true
      let issues = []

      if (helper.includes('screenshot-helpers')) {
        if (!content.includes('class ScreenshotHelper')) {
          issues.push('ScreenshotHelper class manquante')
          isValid = false
        }
        if (!content.includes('captureStep')) {
          issues.push('Méthode captureStep manquante')
          isValid = false
        }
      }

      if (helper.includes('auth-helpers')) {
        if (!content.includes('class AuthHelper')) {
          issues.push('AuthHelper class manquante')
          isValid = false
        }
        if (!content.includes('TEST_USERS')) {
          issues.push('TEST_USERS configuration manquante')
          isValid = false
        }
      }

      if (helper.includes('test-selectors')) {
        if (!content.includes('SELECTORS')) {
          issues.push('SELECTORS configuration manquante')
          isValid = false
        }
      }

      if (isValid) {
        results.helpers.push({ helper, status: '✅ OK' })
        console.log(`   ✅ ${helper}`)
      } else {
        results.helpers.push({ helper, status: `❌ Problèmes: ${issues.join(', ')}` })
        results.errors.push(`Helper ${helper}: ${issues.join(', ')}`)
        console.log(`   ❌ ${helper} - ${issues.join(', ')}`)
      }

    } catch (error) {
      results.helpers.push({ helper, status: '❌ Manquant' })
      results.errors.push(`Helper manquant: ${helper}`)
      console.log(`   ❌ ${helper} - Manquant`)
    }
  }
}

async function validateScripts(results) {
  console.log('\n📜 Validation des scripts...')

  const scripts = [
    'test/scripts/run-optimized-tests.js',
    'test/scripts/generate-visual-report.js',
    'test/run-tests-with-report.js'
  ]

  for (const script of scripts) {
    try {
      const content = await fs.readFile(script, 'utf-8')

      // Vérifier que c'est un script exécutable
      if (content.includes('#!/usr/bin/env node') && content.includes('async function main')) {
        results.scripts.push({ script, status: '✅ OK' })
        console.log(`   ✅ ${script}`)
      } else {
        results.scripts.push({ script, status: '⚠️ Format incorrect' })
        console.log(`   ⚠️ ${script} - Format incorrect`)
      }

    } catch (error) {
      results.scripts.push({ script, status: '❌ Manquant' })
      results.errors.push(`Script manquant: ${script}`)
      console.log(`   ❌ ${script} - Manquant`)
    }
  }
}

async function validateDirectories(results) {
  console.log('\n📁 Validation des dossiers...')

  const directories = [
    'test/e2e',
    'test/e2e/helpers',
    'test/scripts',
    'test/reports',
    'test/auth-states'
  ]

  for (const dir of directories) {
    try {
      const stats = await fs.stat(dir)
      if (stats.isDirectory()) {
        results.directories.push({ dir, status: '✅ OK' })
        console.log(`   ✅ ${dir}`)
      } else {
        results.directories.push({ dir, status: '❌ N\'est pas un dossier' })
        console.log(`   ❌ ${dir} - N'est pas un dossier`)
      }
    } catch (error) {
      // Créer le dossier s'il n'existe pas
      try {
        await fs.mkdir(dir, { recursive: true })
        results.directories.push({ dir, status: '✅ Créé' })
        console.log(`   ✅ ${dir} - Créé`)
      } catch (createError) {
        results.directories.push({ dir, status: '❌ Impossible de créer' })
        results.errors.push(`Impossible de créer: ${dir}`)
        console.log(`   ❌ ${dir} - Impossible de créer`)
      }
    }
  }
}

function displayValidationResults(results) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 RÉSULTATS DE LA VALIDATION')
  console.log('='.repeat(60))

  console.log(`\n📋 Fichiers de configuration: ${results.configFiles.length}`)
  results.configFiles.forEach(item => console.log(`   ${item.status} ${item.file}`))

  console.log(`\n🔧 Helpers: ${results.helpers.length}`)
  results.helpers.forEach(item => console.log(`   ${item.status} ${item.helper}`))

  console.log(`\n📜 Scripts: ${results.scripts.length}`)
  results.scripts.forEach(item => console.log(`   ${item.status} ${item.script}`))

  console.log(`\n📁 Dossiers: ${results.directories.length}`)
  results.directories.forEach(item => console.log(`   ${item.status} ${item.dir}`))

  if (results.errors.length > 0) {
    console.log(`\n❌ ERREURS (${results.errors.length}):`)
    results.errors.forEach(error => console.log(`   • ${error}`))
    console.log('\n⚠️ Configuration incomplète - Corrigez les erreurs ci-dessus')
  } else {
    console.log('\n✅ VALIDATION RÉUSSIE!')
    console.log('\n🚀 Configuration optimisée prête à utiliser:')
    console.log('   npm run test:e2e:optimized')
    console.log('   npm run test:e2e:visual')
    console.log('   npm run test:e2e:gestionnaire')
  }

  console.log('\n' + '='.repeat(60))
}

main().catch(console.error)