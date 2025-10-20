#!/usr/bin/env node

/**
 * Script de nettoyage forcé des ports pour SEIDO
 * Force le nettoyage des ports 3000-3005 et supprime le cache .next
 * Utilise npx kill-port comme demandé
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORTS_TO_FORCE_CLEAN = [3000, 3001, 3002, 3003, 3004, 3005];
const NEXT_CACHE_DIR = path.join(process.cwd(), '.next');

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
  console.log(color + message + colors.reset);
}

function logSection(title) {
  log(`\n${colors.bright}${colors.blue}=== ${title} ===${colors.reset}`);
}

function header() {
  log(`${colors.bright}${colors.cyan}╔══════════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.bright}${colors.cyan}║          SEIDO - Force Port Cleanup             ║${colors.reset}`);
  log(`${colors.bright}${colors.cyan}╚══════════════════════════════════════════════════╝${colors.reset}`);
}

// Force cleanup des ports avec npx kill-port
async function forceCleanupPorts() {
  logSection('Force Cleanup des Ports avec npx kill-port');

  // Créer la commande avec tous les ports
  const portsString = PORTS_TO_FORCE_CLEAN.join(' ');

  try {
    log(`  Exécution: npx kill-port ${portsString}`, colors.cyan);
    execSync(`npx kill-port ${portsString}`, {
      stdio: 'pipe',
      timeout: 30000,
      encoding: 'utf8'
    });
    log(`  ✓ Tous les ports ${portsString} ont été nettoyés`, colors.green);
  } catch (error) {
    // npx kill-port peut "échouer" s'il n'y a rien à tuer, c'est normal
    if (error.stdout && error.stdout.includes('No process running')) {
      log(`  ✓ Aucun processus à nettoyer sur les ports ${portsString}`, colors.green);
    } else {
      log(`  ⚠ npx kill-port terminé (normal si ports déjà libres)`, colors.yellow);
    }
  }

  // Attendre un peu pour la libération des ports
  log('  Attente de libération des ports...', colors.cyan);
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Nettoyage forcé du cache .next avec Remove-Item
function forceCleanupNextCache() {
  logSection('Force Cleanup Cache .next avec Remove-Item');

  if (fs.existsSync(NEXT_CACHE_DIR)) {
    try {
      if (process.platform === 'win32') {
        log('  Exécution: Remove-Item -Recurse -Force .next', colors.cyan);
        execSync(`powershell "Remove-Item -Recurse -Force '${NEXT_CACHE_DIR}'"`, {
          stdio: 'ignore',
          timeout: 10000
        });
        log('  ✓ Cache .next supprimé avec PowerShell Remove-Item', colors.green);
      } else {
        execSync(`rm -rf "${NEXT_CACHE_DIR}"`, { stdio: 'ignore' });
        log('  ✓ Cache .next supprimé avec rm -rf', colors.green);
      }
    } catch (error) {
      // Essayer avec rmdir en fallback sur Windows
      if (process.platform === 'win32') {
        try {
          log('  Fallback: rmdir /s /q .next', colors.yellow);
          execSync(`rmdir /s /q "${NEXT_CACHE_DIR}"`, { stdio: 'ignore' });
          log('  ✓ Cache .next supprimé avec rmdir (fallback)', colors.green);
        } catch (fallbackError) {
          log(`  ❌ Impossible de supprimer le cache: ${fallbackError.message}`, colors.red);
        }
      } else {
        log(`  ❌ Impossible de supprimer le cache: ${error.message}`, colors.red);
      }
    }
  } else {
    log('  ℹ Pas de cache .next à nettoyer', colors.cyan);
  }
}

// Vérification finale
function verifyCleanup() {
  logSection('Vérification Post-Cleanup');

  log('  Vérification des ports:', colors.cyan);
  for (const port of PORTS_TO_FORCE_CLEAN) {
    try {
      if (process.platform === 'win32') {
        const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
        if (result.includes('LISTENING')) {
          log(`  ⚠ Port ${port}: Toujours en utilisation`, colors.yellow);
        } else {
          log(`  ✓ Port ${port}: Disponible`, colors.green);
        }
      } else {
        execSync(`lsof -i:${port}`, { stdio: 'ignore' });
        log(`  ⚠ Port ${port}: Toujours en utilisation`, colors.yellow);
      }
    } catch (error) {
      // Pas de processus = port libre
      log(`  ✓ Port ${port}: Disponible`, colors.green);
    }
  }

  log('  Vérification du cache:', colors.cyan);
  if (fs.existsSync(NEXT_CACHE_DIR)) {
    log('  ⚠ Cache .next existe encore', colors.yellow);
  } else {
    log('  ✓ Cache .next supprimé', colors.green);
  }
}

// Fonction principale
async function main() {
  header();

  await forceCleanupPorts();
  forceCleanupNextCache();
  verifyCleanup();

  log(`\n${colors.bright}${colors.green}✓ Force cleanup terminé !${colors.reset}`);
  log(`\n${colors.bright}Vous pouvez maintenant lancer:${colors.reset}`);
  log(`${colors.cyan}  npm run dev:test${colors.reset}`);
  log(`${colors.cyan}  npm run test:e2e${colors.reset}`);
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  log(`\n❌ Erreur inattendue: ${error.message}`, colors.red);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`\n❌ Promise rejetée: ${reason}`, colors.red);
  process.exit(1);
});

// Exécution
if (require.main === module) {
  main().catch((error) => {
    log(`❌ Erreur lors du nettoyage: ${error.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = { forceCleanupPorts, forceCleanupNextCache };