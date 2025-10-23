#!/usr/bin/env node

/**
 * Script d'Installation et Configuration E2E SEIDO
 * Automatise la configuration complète du système de tests E2E
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`)
}

function logStep(step, message) {
  log(`${step}. ${message}`, 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

/**
 * Vérifier et installer les dépendances npm nécessaires
 */
function installDependencies() {
  logStep(1, 'Checking and installing dependencies...')

  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found. Run this script from the project root.')
    process.exit(1)
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  // Vérifier les dépendances requises
  const requiredDependencies = {
    '@playwright/test': '^1.40.0',
    'pino': '^8.0.0',
    'pino-pretty': '^10.0.0'
  }

  const requiredDevDependencies = {
    'tsx': '^4.0.0'
  }

  const missingDeps = []
  const missingDevDeps = []

  // Vérifier les dépendances principales
  for (const [dep, version] of Object.entries(requiredDependencies)) {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      missingDeps.push(`${dep}@${version}`)
    }
  }

  // Vérifier les dépendances de développement
  for (const [dep, version] of Object.entries(requiredDevDependencies)) {
    if (!packageJson.devDependencies?.[dep]) {
      missingDevDeps.push(`${dep}@${version}`)
    }
  }

  // Installer les dépendances manquantes
  if (missingDeps.length > 0) {
    log(`Installing missing dependencies: ${missingDeps.join(', ')}`, 'yellow')
    try {
      execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit' })
      logSuccess('Dependencies installed successfully')
    } catch (error) {
      logError(`Failed to install dependencies: ${error.message}`)
      process.exit(1)
    }
  }

  if (missingDevDeps.length > 0) {
    log(`Installing missing dev dependencies: ${missingDevDeps.join(', ')}`, 'yellow')
    try {
      execSync(`npm install -D ${missingDevDeps.join(' ')}`, { stdio: 'inherit' })
      logSuccess('Dev dependencies installed successfully')
    } catch (error) {
      logError(`Failed to install dev dependencies: ${error.message}`)
      process.exit(1)
    }
  }

  if (missingDeps.length === 0 && missingDevDeps.length === 0) {
    logSuccess('All required dependencies are already installed')
  }
}

/**
 * Installer les navigateurs Playwright
 */
function installPlaywrightBrowsers() {
  logStep(2, 'Installing Playwright browsers...')

  try {
    execSync('npx playwright install', { stdio: 'inherit' })
    logSuccess('Playwright browsers installed successfully')
  } catch (error) {
    logError(`Failed to install Playwright browsers: ${error.message}`)
    logWarning('You can install them manually later with: npx playwright install')
  }
}

/**
 * Ajouter les scripts NPM au package.json
 */
function updatePackageJsonScripts() {
  logStep(3, 'Adding E2E scripts to package.json...')

  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  const e2eScripts = {
    'test:e2e:complete': 'playwright test --config=docs/refacto/Tests/config/playwright.e2e.config.ts',
    'test:e2e:auth': 'npm run test:e2e:complete -- tests/phase1-auth',
    'test:e2e:workflows': 'npm run test:e2e:complete -- tests/phase2-workflows',
    'test:e2e:integration': 'npm run test:e2e:complete -- tests/phase3-integration',
    'test:e2e:admin': 'npm run test:e2e:complete -- --grep="admin"',
    'test:e2e:gestionnaire': 'npm run test:e2e:complete -- --grep="gestionnaire"',
    'test:e2e:locataire': 'npm run test:e2e:complete -- --grep="locataire"',
    'test:e2e:prestataire': 'npm run test:e2e:complete -- --grep="prestataire"',
    'test:e2e:debug': 'PWDEBUG=1 npm run test:e2e:complete',
    'test:e2e:headed': 'npm run test:e2e:complete -- --headed',
    'test:analyze': 'tsx docs/refacto/Tests/helpers/analyze-results.ts',
    'test:report': 'playwright show-report docs/refacto/Tests/reports/html'
  }

  packageJson.scripts = packageJson.scripts || {}

  let scriptsAdded = 0
  for (const [scriptName, scriptCommand] of Object.entries(e2eScripts)) {
    if (!packageJson.scripts[scriptName]) {
      packageJson.scripts[scriptName] = scriptCommand
      scriptsAdded++
    }
  }

  if (scriptsAdded > 0) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    logSuccess(`Added ${scriptsAdded} E2E scripts to package.json`)
  } else {
    logSuccess('All E2E scripts are already present in package.json')
  }
}

/**
 * Créer le fichier .env.test
 */
function createEnvTestFile() {
  logStep(4, 'Creating .env.test file...')

  const envTestPath = path.resolve(process.cwd(), '.env.test')

  if (fs.existsSync(envTestPath)) {
    logWarning('.env.test already exists, skipping creation')
    return
  }

  const envTestContent = `# Configuration E2E Tests SEIDO
NODE_ENV=test
BASE_URL=http://localhost:3000

# Configuration Pino
PINO_LOG_LEVEL=debug
PINO_TEST_DIR=./docs/refacto/Tests/logs

# Configuration Agent Debugger
DEBUGGER_ENABLED=true
DEBUGGER_OUTPUT_DIR=./docs/refacto/Tests/reports/debugger

# Configuration Screenshots
SCREENSHOT_DIR=./docs/refacto/Tests/screenshots
SCREENSHOT_QUALITY=90

# Optimisations
DISABLE_ANIMATIONS=true

# Mode debug (décommentez si nécessaire)
# PWDEBUG=1
# PLAYWRIGHT_SLOWMO=1000
`

  fs.writeFileSync(envTestPath, envTestContent)
  logSuccess('.env.test file created successfully')
}

/**
 * Créer les dossiers nécessaires s'ils n'existent pas
 */
function ensureDirectories() {
  logStep(5, 'Ensuring required directories exist...')

  const requiredDirs = [
    'docs/refacto/Tests/screenshots/auth',
    'docs/refacto/Tests/screenshots/workflows',
    'docs/refacto/Tests/screenshots/errors',
    'docs/refacto/Tests/screenshots/reports',
    'docs/refacto/Tests/logs/test-runs',
    'docs/refacto/Tests/logs/performance',
    'docs/refacto/Tests/logs/structured',
    'docs/refacto/Tests/logs/debugger-analysis',
    'docs/refacto/Tests/reports/html',
    'docs/refacto/Tests/reports/json',
    'docs/refacto/Tests/reports/debugger',
    'docs/refacto/Tests/reports/ci-artifacts'
  ]

  let dirsCreated = 0
  for (const dir of requiredDirs) {
    const fullPath = path.resolve(process.cwd(), dir)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true })
      dirsCreated++
    }
  }

  if (dirsCreated > 0) {
    logSuccess(`Created ${dirsCreated} directories`)
  } else {
    logSuccess('All required directories already exist')
  }
}

/**
 * Créer un gitignore pour les fichiers de test
 */
function updateGitignore() {
  logStep(6, 'Updating .gitignore for E2E files...')

  const gitignorePath = path.resolve(process.cwd(), '.gitignore')

  const e2eIgnoreRules = `
# E2E Test outputs
docs/refacto/Tests/logs/test-runs/*.log
docs/refacto/Tests/logs/structured/*.json
docs/refacto/Tests/logs/performance/*.log
docs/refacto/Tests/logs/debugger-analysis/*.json
docs/refacto/Tests/screenshots/**/*.png
docs/refacto/Tests/screenshots/**/*.jpg
docs/refacto/Tests/reports/html/
docs/refacto/Tests/reports/json/
docs/refacto/Tests/reports/debugger/*.html
docs/refacto/Tests/reports/debugger/*.json

# Playwright
test-results/
playwright-report/
playwright/.cache/

# Test environment
.env.test.local
`

  if (fs.existsSync(gitignorePath)) {
    const existingContent = fs.readFileSync(gitignorePath, 'utf8')
    if (!existingContent.includes('# E2E Test outputs')) {
      fs.appendFileSync(gitignorePath, e2eIgnoreRules)
      logSuccess('Updated .gitignore with E2E rules')
    } else {
      logSuccess('.gitignore already contains E2E rules')
    }
  } else {
    fs.writeFileSync(gitignorePath, e2eIgnoreRules)
    logSuccess('Created .gitignore with E2E rules')
  }
}

/**
 * Valider l'installation
 */
function validateInstallation() {
  logStep(7, 'Validating installation...')

  const validationChecks = [
    {
      name: 'Configuration files exist',
      check: () => fs.existsSync('docs/refacto/Tests/config/playwright.e2e.config.ts')
    },
    {
      name: 'Helper files exist',
      check: () => fs.existsSync('docs/refacto/Tests/helpers/e2e-test-logger.ts')
    },
    {
      name: 'Fixture files exist',
      check: () => fs.existsSync('docs/refacto/Tests/fixtures/users.fixture.ts')
    },
    {
      name: 'Test files exist',
      check: () => fs.existsSync('docs/refacto/Tests/tests/phase1-auth/auth-login.spec.ts')
    },
    {
      name: 'NPM scripts available',
      check: () => {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
        return packageJson.scripts?.['test:e2e:complete'] !== undefined
      }
    }
  ]

  const results = validationChecks.map(check => ({
    name: check.name,
    passed: check.check()
  }))

  const passedChecks = results.filter(r => r.passed).length
  const totalChecks = results.length

  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}`)
    } else {
      logError(`${result.name}`)
    }
  })

  if (passedChecks === totalChecks) {
    logSuccess(`Validation complete: ${passedChecks}/${totalChecks} checks passed`)
  } else {
    logWarning(`Validation issues: ${passedChecks}/${totalChecks} checks passed`)
  }
}

/**
 * Afficher les instructions finales
 */
function showFinalInstructions() {
  log('', 'reset')
  log('🎉 SEIDO E2E Testing System Setup Complete!', 'green')
  log('', 'reset')
  log('📋 Next Steps:', 'bright')
  log('', 'reset')
  log('1. 🧪 Run infrastructure validation:', 'cyan')
  log('   npm run test:e2e:complete -- tests/phase1-auth/auth-quick-validation.spec.ts', 'reset')
  log('', 'reset')
  log('2. 🔐 Run authentication tests:', 'cyan')
  log('   npm run test:e2e:auth', 'reset')
  log('', 'reset')
  log('3. 🤖 Analyze results:', 'cyan')
  log('   npm run test:analyze', 'reset')
  log('', 'reset')
  log('4. 📊 View HTML reports:', 'cyan')
  log('   npm run test:report', 'reset')
  log('', 'reset')
  log('📚 Documentation:', 'bright')
  log('   • Complete guide: docs/refacto/Tests/README.md', 'reset')
  log('   • Action plan: docs/refacto/Tests/plan-tests-e2e.md', 'reset')
  log('   • CI/CD example: docs/refacto/Tests/.github-actions-example.yml', 'reset')
  log('', 'reset')
  log('🆘 Need help? Check the troubleshooting section in the README.md', 'yellow')
}

/**
 * Main function
 */
function main() {
  log('', 'reset')
  log('🚀 SEIDO E2E Testing System Setup', 'bright')
  log('=====================================', 'bright')
  log('', 'reset')

  try {
    installDependencies()
    installPlaywrightBrowsers()
    updatePackageJsonScripts()
    createEnvTestFile()
    ensureDirectories()
    updateGitignore()
    validateInstallation()
    showFinalInstructions()
  } catch (error) {
    logError(`Setup failed: ${error.message}`)
    process.exit(1)
  }
}

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 SEIDO E2E Testing System Setup

Usage: node setup-e2e.js [options]

Options:
  --help, -h    Show this help message
  --dry-run     Show what would be done without making changes

This script will:
1. Install required npm dependencies
2. Install Playwright browsers
3. Add E2E scripts to package.json
4. Create .env.test configuration
5. Ensure all directories exist
6. Update .gitignore
7. Validate the installation

Run from the project root directory.
  `)
  process.exit(0)
}

if (args.includes('--dry-run')) {
  log('🔍 DRY RUN MODE - No changes will be made', 'yellow')
  // En mode dry-run, on pourrait simuler les actions sans les exécuter
  process.exit(0)
}

// Vérifier qu'on est dans le bon répertoire
if (!fs.existsSync('package.json')) {
  logError('package.json not found. Please run this script from the project root directory.')
  process.exit(1)
}

// Lancer le setup
main()