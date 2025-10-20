#!/usr/bin/env node

/**
 * Script pour garantir que le port 3000 est disponible
 * Utilisé avant de démarrer le serveur de développement pour les tests
 */

const { cleanupPorts, isPortInUse } = require('./cleanup-ports');

async function ensurePort3000() {
  const inUse = await isPortInUse(3000);

  if (inUse) {
    console.log('Port 3000 en utilisation, nettoyage en cours...');
    await cleanupPorts();

    // Vérifier une dernière fois
    const stillInUse = await isPortInUse(3000);
    if (stillInUse) {
      console.error('ERREUR: Impossible de libérer le port 3000');
      process.exit(1);
    }
  }

  console.log('✓ Port 3000 disponible');
}

ensurePort3000().catch(console.error);