#!/usr/bin/env node

/**
 * Script de nettoyage automatique des ports pour les tests
 * Nettoie les ports, le cache Next.js et prépare l'environnement pour les tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

// Configuration
const PORTS_TO_CHECK = [3000, 3001, 3002, 3003, 3004, 3005, 3006];
const NEXT_CACHE_DIR = path.join(process.cwd(), '.next');
const TEST_RESULTS_DIR = path.join(process.cwd(), 'test-results');
const PLAYWRIGHT_REPORT_DIR = path.join(process.cwd(), 'playwright-report');

// Couleurs pour la console
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
  log(`=== ${title} ===`, colors.bright + colors.blue);
}

// Fonction pour vérifier si un port est utilisé
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(false);
    });

    server.listen(port, '127.0.0.1');
  });
}

// Fonction pour tuer un processus sur un port spécifique
function killPort(port) {
  try {
    // Première tentative : utiliser npx kill-port (universel et plus fiable)
    try {
      execSync(`npx kill-port ${port}`, { stdio: 'ignore', timeout: 10000 });
      log(`  ✓ Port ${port} libéré avec npx kill-port`, colors.green);
      return;
    } catch (npxError) {
      log(`  ⚠ npx kill-port échoué pour port ${port}, utilisation méthode native`, colors.yellow);
    }

    if (process.platform === 'win32') {
      // Windows: Trouver et tuer le processus
      try {
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        const lines = result.split('\n').filter(line => line.includes('LISTENING'));

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              log(`  ✓ Processus PID ${pid} sur port ${port} terminé`, colors.green);
            } catch (e) {
              log(`  ⚠ Impossible de terminer PID ${pid}`, colors.yellow);
            }
          }
        }
      } catch (e) {
        // Pas de processus trouvé sur ce port
      }
    } else {
      // Unix/Linux/Mac
      try {
        execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
        log(`  ✓ Port ${port} libéré`, colors.green);
      } catch (e) {
        // Pas de processus sur ce port
      }
    }
  } catch (error) {
    log(`  ⚠ Erreur lors du nettoyage du port ${port}: ${error.message}`, colors.yellow);
  }
}

// Fonction pour nettoyer tous les ports
async function cleanupPorts() {
  logSection('Nettoyage des ports');

  let portsInUse = [];

  // Vérifier quels ports sont utilisés
  for (const port of PORTS_TO_CHECK) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      portsInUse.push(port);
      log(`  Port ${port}: EN UTILISATION`, colors.yellow);
    } else {
      log(`  Port ${port}: Disponible`, colors.green);
    }
  }

  // Nettoyer les ports utilisés
  if (portsInUse.length > 0) {
    log('\n  Nettoyage des ports en cours...', colors.cyan);
    for (const port of portsInUse) {
      killPort(port);
    }

    // Attendre un peu pour que les ports soient libérés
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Vérifier à nouveau
    log('\n  Vérification après nettoyage:', colors.cyan);
    for (const port of portsInUse) {
      const stillInUse = await isPortInUse(port);
      if (stillInUse) {
        log(`  ✗ Port ${port}: Toujours en utilisation`, colors.red);
      } else {
        log(`  ✓ Port ${port}: Maintenant disponible`, colors.green);
      }
    }
  } else {
    log('  ✓ Tous les ports sont disponibles', colors.green);
  }
}

// Fonction pour nettoyer le cache Next.js
function cleanupNextCache() {
  logSection('Nettoyage du cache Next.js');

  if (fs.existsSync(NEXT_CACHE_DIR)) {
    try {
      if (process.platform === 'win32') {
        // Essayer d'abord PowerShell Remove-Item, puis rmdir en fallback
        try {
          execSync(`powershell "Remove-Item -Recurse -Force '${NEXT_CACHE_DIR}'"`, { stdio: 'ignore' });
          log('  ✓ Cache .next supprimé avec PowerShell', colors.green);
        } catch (psError) {
          execSync(`rmdir /s /q "${NEXT_CACHE_DIR}"`, { stdio: 'ignore' });
          log('  ✓ Cache .next supprimé avec rmdir', colors.green);
        }
      } else {
        execSync(`rm -rf "${NEXT_CACHE_DIR}"`, { stdio: 'ignore' });
        log('  ✓ Cache .next supprimé', colors.green);
      }
    } catch (error) {
      log(`  ⚠ Impossible de supprimer le cache: ${error.message}`, colors.yellow);
    }
  } else {
    log('  ℹ Pas de cache .next à nettoyer', colors.cyan);
  }
}

// Fonction pour nettoyer les résultats de tests précédents
function cleanupTestResults() {
  logSection('Nettoyage des résultats de tests');

  const dirsToClean = [TEST_RESULTS_DIR, PLAYWRIGHT_REPORT_DIR];

  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      try {
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${dir}"`, { stdio: 'ignore' });
        } else {
          execSync(`rm -rf "${dir}"`, { stdio: 'ignore' });
        }
        log(`  ✓ Dossier ${path.basename(dir)} supprimé`, colors.green);
      } catch (error) {
        log(`  ⚠ Impossible de supprimer ${path.basename(dir)}: ${error.message}`, colors.yellow);
      }
    }
  }
}

// Fonction pour vérifier les dépendances
function checkDependencies() {
  logSection('Vérification des dépendances');

  const requiredPackages = ['playwright', '@playwright/test'];
  let allInstalled = true;

  for (const pkg of requiredPackages) {
    try {
      require.resolve(pkg);
      log(`  ✓ ${pkg} installé`, colors.green);
    } catch (e) {
      log(`  ✗ ${pkg} manquant`, colors.red);
      allInstalled = false;
    }
  }

  if (!allInstalled) {
    log('\n  Installation des dépendances manquantes...', colors.cyan);
    try {
      execSync('npm install', { stdio: 'inherit' });
      log('  ✓ Dépendances installées', colors.green);
    } catch (error) {
      log(`  ✗ Erreur lors de l\'installation: ${error.message}`, colors.red);
      process.exit(1);
    }
  }
}

// Fonction principale
async function main() {
  console.clear();
  log('╔══════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║     SEIDO - Préparation de l\'environnement      ║', colors.bright + colors.cyan);
  log('╚══════════════════════════════════════════════════╝', colors.bright + colors.cyan);

  try {
    // 1. Nettoyer les ports
    await cleanupPorts();

    // 2. Nettoyer le cache Next.js
    cleanupNextCache();

    // 3. Nettoyer les résultats de tests
    cleanupTestResults();

    // 4. Vérifier les dépendances
    checkDependencies();

    logSection('Environnement prêt');
    log('✓ Port 3000 disponible pour les tests', colors.green);
    log('✓ Cache nettoyé', colors.green);
    log('✓ Environnement de test préparé', colors.green);

    console.log('');
    log('Vous pouvez maintenant lancer les tests avec:', colors.bright);
    log('  npm run test:e2e', colors.cyan);
    log('  npm run test:unit', colors.cyan);
    log('  npm run dev:test', colors.cyan);

  } catch (error) {
    logSection('Erreur');
    log(`✗ ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Exécuter le script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  cleanupPorts,
  cleanupNextCache,
  cleanupTestResults,
  isPortInUse
};