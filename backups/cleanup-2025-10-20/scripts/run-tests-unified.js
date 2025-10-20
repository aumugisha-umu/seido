#!/usr/bin/env node

/**
 * Script unifié pour lancer les tests avec configuration standardisée
 * Garantit que tous les tests utilisent localhost:3000
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(60)}`, colors.bright);
  log(`   ${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.bright);
  console.log('');
}

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'e2e';
const additionalArgs = args.slice(1);

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      ...options
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.clear();
  logSection('SEIDO - Test Runner Unifié');

  try {
    // 1. Nettoyer l'environnement
    log('1. Nettoyage de l\'environnement...', colors.cyan);
    await runCommand('node', ['scripts/cleanup-ports.js']);

    // 2. Démarrer le serveur de dev sur le port 3000
    log('2. Démarrage du serveur de développement sur port 3000...', colors.cyan);

    const serverProcess = spawn('npm', ['run', 'dev:test'], {
      stdio: 'pipe',
      shell: true,
      detached: false
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started server') || output.includes('Local:')) {
        serverReady = true;
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Ignorer les warnings Next.js normaux
      if (!output.includes('Warning') && !output.includes('Experimental')) {
        console.error('Server error:', output);
      }
    });

    // Attendre que le serveur soit prêt
    log('   Attente du serveur...', colors.yellow);
    const maxWaitTime = 30000; // 30 secondes max
    const startTime = Date.now();

    while (!serverReady && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier si le serveur répond
      try {
        const http = require('http');
        await new Promise((resolve, reject) => {
          const req = http.get('http://localhost:3000', (res) => {
            if (res.statusCode === 200 || res.statusCode === 404) {
              serverReady = true;
              resolve();
            } else {
              reject();
            }
          });
          req.on('error', reject);
          req.setTimeout(1000);
        });
      } catch {
        // Le serveur n'est pas encore prêt
      }
    }

    if (!serverReady) {
      throw new Error('Le serveur n\'a pas démarré dans le temps imparti');
    }

    log('   ✓ Serveur prêt sur http://localhost:3000', colors.green);

    // 3. Lancer les tests
    log('3. Lancement des tests...', colors.cyan);

    let testCommand, testArgs;

    switch (testType) {
      case 'e2e':
        testCommand = 'npx';
        testArgs = ['playwright', 'test', ...additionalArgs];
        break;

      case 'unit':
        testCommand = 'npm';
        testArgs = ['run', 'test:unit', ...additionalArgs];
        break;

      case 'all':
        // Lancer tous les tests séquentiellement
        log('   Tests unitaires...', colors.yellow);
        await runCommand('npm', ['run', 'test:unit']);

        log('   Tests E2E...', colors.yellow);
        testCommand = 'npx';
        testArgs = ['playwright', 'test'];
        break;

      case 'gestionnaire':
      case 'prestataire':
      case 'locataire':
      case 'admin':
        testCommand = 'npx';
        testArgs = ['playwright', 'test', '--project', testType, ...additionalArgs];
        break;

      default:
        // Si c'est un fichier de test spécifique
        if (testType.endsWith('.spec.ts') || testType.endsWith('.test.ts')) {
          testCommand = 'npx';
          testArgs = ['playwright', 'test', testType, ...additionalArgs];
        } else {
          throw new Error(`Type de test inconnu: ${testType}`);
        }
    }

    if (testCommand) {
      await runCommand(testCommand, testArgs);
    }

    logSection('Tests terminés avec succès');
    log('✓ Tous les tests sont passés', colors.green);

    // 4. Nettoyer
    log('\nArrêt du serveur...', colors.cyan);
    serverProcess.kill('SIGTERM');

  } catch (error) {
    logSection('Erreur lors des tests');
    log(`✗ ${error.message}`, colors.red);

    // Essayer d'arrêter le serveur en cas d'erreur
    try {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
      }
    } catch {}

    process.exit(1);
  }
}

// Gérer l'interruption proprement
process.on('SIGINT', () => {
  console.log('\n\nInterruption détectée, nettoyage en cours...');
  process.exit(0);
});

// Message d'aide
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/run-tests-unified.js [type] [options]

Types de tests:
  e2e           Tests End-to-End avec Playwright (défaut)
  unit          Tests unitaires avec Vitest
  all           Tous les tests (unit + e2e)
  gestionnaire  Tests du rôle gestionnaire
  prestataire   Tests du rôle prestataire
  locataire     Tests du rôle locataire
  admin         Tests du rôle admin
  [file.spec]   Un fichier de test spécifique

Options:
  --headed      Lancer les tests avec navigateur visible
  --debug       Mode debug avec Playwright Inspector
  --project     Projet spécifique Playwright
  --help        Afficher cette aide

Exemples:
  node scripts/run-tests-unified.js e2e
  node scripts/run-tests-unified.js unit
  node scripts/run-tests-unified.js gestionnaire --headed
  node scripts/run-tests-unified.js test/e2e/auth.spec.ts --debug

Note: Ce script garantit que tous les tests utilisent localhost:3000
`);
  process.exit(0);
}

// Lancer le script principal
main().catch(console.error);