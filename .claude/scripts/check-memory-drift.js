#!/usr/bin/env node
/**
 * Vérifie si le memory bank a besoin de synchronisation
 *
 * USAGE : node check-memory-drift.js
 * OUTPUT : Liste des drifts détectés
 *
 * Utilisé par l'agent memory-synchronizer et la commande /sync-memory
 */
const fs = require('fs');
const path = require('path');

const MEMORY_BANK_PATH = path.join(__dirname, '..', 'memory-bank');
const LAST_SYNC_PATH = path.join(__dirname, '..', 'auto-memory', 'last-sync');
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Configuration des vérifications
const checks = {
  techContext: {
    file: path.join(MEMORY_BANK_PATH, 'techContext.md'),
    sources: [
      path.join(PROJECT_ROOT, 'lib', 'database.types.ts'),
      path.join(PROJECT_ROOT, 'package.json')
    ],
    description: 'Schema DB ou dépendances ont changé'
  },
  systemPatterns: {
    file: path.join(MEMORY_BANK_PATH, 'systemPatterns.md'),
    sourceDirs: [
      path.join(PROJECT_ROOT, 'lib', 'services', 'domain'),
      path.join(PROJECT_ROOT, 'lib', 'services', 'repositories')
    ],
    description: 'Patterns de services ou repositories ont changé'
  },
  productContext: {
    file: path.join(MEMORY_BANK_PATH, 'productContext.md'),
    sourceDirs: [
      path.join(PROJECT_ROOT, 'app'),
      path.join(PROJECT_ROOT, 'components')
    ],
    description: 'Features ou UI ont changé'
  }
};

function getLatestMtime(dirOrFile) {
  try {
    const stat = fs.statSync(dirOrFile);
    if (stat.isFile()) {
      return stat.mtime;
    }

    // Pour les dossiers, on vérifie récursivement (mais limité)
    let latest = new Date(0);
    const files = fs.readdirSync(dirOrFile).slice(0, 50); // Limite à 50 fichiers

    for (const file of files) {
      const filePath = path.join(dirOrFile, file);
      try {
        const fileStat = fs.statSync(filePath);
        if (fileStat.isFile() && fileStat.mtime > latest) {
          latest = fileStat.mtime;
        }
      } catch {
        // Ignorer les erreurs d'accès
      }
    }
    return latest;
  } catch {
    return new Date(0);
  }
}

function checkDrift() {
  const results = [];

  for (const [key, check] of Object.entries(checks)) {
    // Vérifier si le fichier memory-bank existe
    if (!fs.existsSync(check.file)) {
      results.push({
        key,
        status: 'MISSING',
        description: `${key}.md n'existe pas`
      });
      continue;
    }

    // Obtenir la date de modification du fichier memory-bank
    const memoryMtime = fs.statSync(check.file).mtime;

    // Obtenir la date de modification la plus récente des sources
    let latestSourceMtime = new Date(0);

    if (check.sources) {
      for (const source of check.sources) {
        const mtime = getLatestMtime(source);
        if (mtime > latestSourceMtime) {
          latestSourceMtime = mtime;
        }
      }
    }

    if (check.sourceDirs) {
      for (const sourceDir of check.sourceDirs) {
        const mtime = getLatestMtime(sourceDir);
        if (mtime > latestSourceMtime) {
          latestSourceMtime = mtime;
        }
      }
    }

    // Si une source est plus récente que le fichier memory-bank
    if (latestSourceMtime > memoryMtime) {
      results.push({
        key,
        status: 'STALE',
        description: check.description,
        memoryDate: memoryMtime.toISOString(),
        sourceDate: latestSourceMtime.toISOString()
      });
    }
  }

  return results;
}

// Exécution
const drifts = checkDrift();

if (drifts.length > 0) {
  console.log('## Memory Bank Drift Détecté\n');
  drifts.forEach(d => {
    console.log(`- **${d.key}**: ${d.status} - ${d.description}`);
    if (d.memoryDate) {
      console.log(`  - Memory Bank: ${d.memoryDate}`);
      console.log(`  - Source: ${d.sourceDate}`);
    }
  });
  console.log('\nExécuter `/sync-memory` pour synchroniser.');
} else {
  console.log('✅ Memory Bank synchronisé avec le code.');
}
