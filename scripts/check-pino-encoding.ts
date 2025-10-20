#!/usr/bin/env node
/**
 * Script de Diagnostic - Encodage Terminal pour Pino
 *
 * Vérifie l'encodage du terminal et donne des recommandations
 * pour l'affichage correct des emojis dans les logs Pino.
 *
 * Usage:
 *   npx tsx scripts/check-pino-encoding.ts
 */

import { execSync } from 'child_process'
import { platform } from 'os'

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

const log = {
  title: (msg: string) => console.log(`\n${colors.cyan}${colors.bold}${msg}${colors.reset}\n`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  code: (msg: string) => console.log(`  ${colors.magenta}${msg}${colors.reset}`),
}

/**
 * Détecte l'encodage du terminal Windows
 */
function checkWindowsEncoding(): { codePage: number; isUtf8: boolean; name: string } {
  try {
    const output = execSync('chcp', { encoding: 'utf-8' }).toString()
    const match = output.match(/:\s*(\d+)/)

    if (match) {
      const codePage = parseInt(match[1], 10)
      return {
        codePage,
        isUtf8: codePage === 65001,
        name: getCodePageName(codePage),
      }
    }
  } catch (error) {
    log.warning('Impossible de détecter l\'encodage Windows (chcp non disponible)')
  }

  return { codePage: 0, isUtf8: false, name: 'Unknown' }
}

/**
 * Nom lisible pour les code pages courants
 */
function getCodePageName(codePage: number): string {
  const codePages: Record<number, string> = {
    65001: 'UTF-8',
    1252: 'Windows-1252 (Western European)',
    850: 'IBM850 (DOS Latin-1)',
    437: 'IBM437 (DOS US)',
    1250: 'Windows-1250 (Central European)',
    28591: 'ISO 8859-1 (Latin-1)',
  }

  return codePages[codePage] || `Code Page ${codePage}`
}

/**
 * Teste l'affichage des emojis
 */
function testEmojiDisplay() {
  const testEmojis = [
    { emoji: '✅', name: 'Check Mark', expected: '[OK]' },
    { emoji: '❌', name: 'Cross Mark', expected: '[ERROR]' },
    { emoji: '👤', name: 'User', expected: '[USER]' },
    { emoji: '🌐', name: 'Globe', expected: '[API]' },
    { emoji: '🔍', name: 'Magnifying Glass', expected: '[SEARCH]' },
    { emoji: '🚀', name: 'Rocket', expected: '[START]' },
  ]

  log.title('📊 Test d\'Affichage des Emojis')

  console.log('Si vous voyez des caractères corrompus (�, Ô£à, ­ƒöì), votre terminal n\'utilise pas UTF-8.\n')

  testEmojis.forEach(({ emoji, name, expected }) => {
    console.log(`  ${emoji}  ${name.padEnd(25)} → Fallback: ${expected}`)
  })
}

/**
 * Donne des recommandations basées sur la configuration
 */
function giveRecommendations(encoding: { codePage: number; isUtf8: boolean; name: string }) {
  log.title('💡 Recommandations')

  if (encoding.isUtf8) {
    log.success('Votre terminal est configuré en UTF-8 (Code Page 65001)')
    log.success('Les emojis devraient s\'afficher correctement')
    console.log()
    log.info('Utilisez ces commandes pour développer :')
    log.code('npm run dev          # Logs colorés avec emojis')
    log.code('npm run dev:pretty   # Alias de dev')
    log.code('npm run dev:json     # JSON brut (parsing/debug)')
  } else {
    log.error(`Votre terminal utilise ${encoding.name} (Code Page ${encoding.codePage})`)
    log.error('Les emojis seront corrompus dans les logs')
    console.log()
    log.warning('Solutions disponibles :')
    console.log()
    console.log('1️⃣  Solution Temporaire (Session actuelle)')
    log.code('chcp 65001              # Force UTF-8 pour cette session')
    log.code('npm run dev             # Puis lancez le dev server')
    console.log()
    console.log('2️⃣  Solution Permanente (Windows Terminal)')
    log.info('  a. Ouvrir Windows Terminal Settings (Ctrl + ,)')
    log.info('  b. Profils → Par défaut → Avancé')
    log.info('  c. Changer "Page de codes" → UTF-8 (65001)')
    log.info('  d. Sauvegarder et redémarrer le terminal')
    console.log()
    console.log('3️⃣  Alternative (Utiliser scripts sans emojis)')
    log.code('npm run dev:utf8        # Force UTF-8 automatiquement')
    log.code('npm run dev:win         # Version PowerShell UTF-8')
    log.code('npm run dev:no-emoji    # Emojis remplacés par texte')
  }

  console.log()
  log.info('Documentation complète : docs/guides/WINDOWS-UTF8-SETUP.md')
}

/**
 * Affiche la configuration actuelle du système
 */
function displaySystemInfo() {
  log.title('🖥️  Configuration Système')

  const systemInfo = {
    'Plateforme': platform(),
    'Node.js': process.version,
    'Terminal': process.env.TERM || 'Unknown',
    'Shell': process.env.SHELL || process.env.ComSpec || 'Unknown',
  }

  Object.entries(systemInfo).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(15)}: ${value}`)
  })
}

/**
 * Fonction principale
 */
function main() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔍 Diagnostic Encodage Terminal - SEIDO Pino Logger        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}
`)

  displaySystemInfo()

  // Windows uniquement
  if (platform() === 'win32') {
    const encoding = checkWindowsEncoding()

    log.title('🌐 Encodage Terminal Détecté')
    console.log(`  Code Page: ${encoding.codePage}`)
    console.log(`  Nom: ${encoding.name}`)
    console.log(`  UTF-8: ${encoding.isUtf8 ? '✅ Oui' : '❌ Non'}`)
    console.log()

    testEmojiDisplay()
    giveRecommendations(encoding)
  } else {
    // Unix/Linux/macOS
    log.title('🌐 Encodage Terminal')
    log.info('Système Unix/Linux/macOS détecté')
    log.info(`LANG: ${process.env.LANG || 'Non défini'}`)
    log.info(`LC_ALL: ${process.env.LC_ALL || 'Non défini'}`)
    console.log()

    if (process.env.LANG?.includes('UTF-8') || process.env.LC_ALL?.includes('UTF-8')) {
      log.success('UTF-8 détecté - Les emojis devraient fonctionner')
    } else {
      log.warning('UTF-8 non détecté explicitement')
      log.info('Définissez LANG=en_US.UTF-8 ou LC_ALL=en_US.UTF-8 si problème')
    }

    testEmojiDisplay()
  }

  console.log()
  log.title('📚 Commandes Disponibles')
  log.code('npm run dev              # Développement avec logs colorés (UTF-8)')
  log.code('npm run dev:pretty       # Alias de dev (logs métadonnées visibles)')
  log.code('npm run dev:pretty:full  # Logs simplifiés (message uniquement)')
  log.code('npm run dev:json         # JSON brut (pour parsing/debug)')
  log.code('npm run dev:utf8         # Force UTF-8 (Windows chcp)')
  log.code('npm run dev:win          # Force UTF-8 (PowerShell)')
  log.code('npm run dev:no-emoji     # Alternative sans emojis (texte lisible)')

  console.log(`
${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}
`)
}

// Exécution
main()
