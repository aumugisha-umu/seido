#!/usr/bin/env node
/**
 * Script pour exécuter les tests UI optimisés avec captures d'écran
 * Usage: node test/scripts/run-optimized-tests.js [options]
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs/promises')

async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  console.log('🚀 Démarrage des tests UI optimisés Seido...\n')

  // Créer les dossiers nécessaires
  await setupDirectories()

  // Construire la commande Playwright
  const command = buildPlaywrightCommand(options)

  console.log(`📋 Commande: ${command.join(' ')}\n`)

  // Exécuter les tests
  const testProcess = spawn('npx', command, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  })

  testProcess.on('exit', (code) => {
    if (code === 0) {
      console.log('\n✅ Tests terminés avec succès!')
      console.log('📊 Consultez les rapports:')
      console.log('   - HTML: ./test/reports/html/index.html')
      console.log('   - JSON: ./test/reports/test-results.json')
      console.log('   - Synthèse: ./test/reports/DERNIERE-EXECUTION.md')
    } else {
      console.log(`\n❌ Tests échoués (code: ${code})`)
      console.log('🔍 Consultez les captures d\'écran dans ./test/test-results/')
    }
  })

  testProcess.on('error', (error) => {
    console.error('❌ Erreur lors de l\'exécution:', error)
    process.exit(1)
  })
}

function parseArgs(args) {
  const options = {
    browser: null,
    headed: false,
    debug: false,
    project: null,
    grep: null,
    workers: null,
    retries: null,
    timeout: null,
    spec: null
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--browser':
      case '-b':
        options.browser = args[++i]
        break
      case '--headed':
      case '-h':
        options.headed = true
        break
      case '--debug':
      case '-d':
        options.debug = true
        break
      case '--project':
      case '-p':
        options.project = args[++i]
        break
      case '--grep':
      case '-g':
        options.grep = args[++i]
        break
      case '--workers':
      case '-w':
        options.workers = args[++i]
        break
      case '--retries':
      case '-r':
        options.retries = args[++i]
        break
      case '--timeout':
      case '-t':
        options.timeout = args[++i]
        break
      case '--spec':
      case '-s':
        options.spec = args[++i]
        break
      case '--help':
        showHelp()
        process.exit(0)
        break
    }
  }

  return options
}

function buildPlaywrightCommand(options) {
  const command = ['playwright', 'test']

  // Spécifier le fichier de test ou tous les tests optimisés
  if (options.spec) {
    command.push(options.spec)
  } else {
    command.push('test/e2e/auth-optimized.spec.ts')
  }

  // Options de configuration
  if (options.browser) {
    command.push('--project', options.browser)
  }

  if (options.project) {
    command.push('--project', options.project)
  }

  if (options.headed) {
    command.push('--headed')
  }

  if (options.debug) {
    command.push('--debug')
  }

  if (options.grep) {
    command.push('--grep', options.grep)
  }

  if (options.workers) {
    command.push('--workers', options.workers)
  }

  if (options.retries) {
    command.push('--retries', options.retries)
  }

  if (options.timeout) {
    command.push('--timeout', options.timeout)
  }

  // Reporter forcé sur notre configuration
  command.push('--reporter=list,html,json')

  return command
}

async function setupDirectories() {
  const dirs = [
    'test/reports',
    'test/test-results',
    'test/screenshots',
    'test/videos',
    'test/traces',
    'test/auth-states'
  ]

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true })
    } catch (error) {
      // Le dossier existe déjà
    }
  }

  console.log('📁 Dossiers de test préparés')
}

function showHelp() {
  console.log(`
🧪 Script des Tests UI Optimisés Seido

Usage: node test/scripts/run-optimized-tests.js [options]

Options:
  -b, --browser <name>     Navigateur spécifique (chromium, firefox, webkit)
  -p, --project <name>     Projet spécifique (gestionnaire, prestataire, locataire, admin)
  -h, --headed             Exécuter en mode visible (non-headless)
  -d, --debug              Mode debug avec pause
  -g, --grep <pattern>     Filtrer les tests par nom
  -w, --workers <number>   Nombre de workers parallèles
  -r, --retries <number>   Nombre de tentatives en cas d'échec
  -t, --timeout <ms>       Timeout global des tests
  -s, --spec <file>        Fichier de test spécifique
  --help                   Afficher cette aide

Exemples:
  # Tous les tests avec captures complètes
  node test/scripts/run-optimized-tests.js

  # Tests pour gestionnaire seulement
  node test/scripts/run-optimized-tests.js --project gestionnaire

  # Tests de connexion seulement
  node test/scripts/run-optimized-tests.js --grep "login"

  # Mode debug visible
  node test/scripts/run-optimized-tests.js --headed --debug

  # Test spécifique
  node test/scripts/run-optimized-tests.js --spec test/e2e/intervention-lifecycle.spec.ts

Rapports générés:
  📊 HTML: ./test/reports/html/index.html
  📋 JSON: ./test/reports/test-results.json
  📝 Synthèse: ./test/reports/DERNIERE-EXECUTION.md
  🖼️ Screenshots: ./test/test-results/
  🎥 Vidéos: ./test/videos/
`)
}

// Gestion des signaux pour nettoyage
process.on('SIGINT', () => {
  console.log('\n🛑 Interruption des tests...')
  process.exit(1)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt des tests...')
  process.exit(1)
})

main().catch(console.error)