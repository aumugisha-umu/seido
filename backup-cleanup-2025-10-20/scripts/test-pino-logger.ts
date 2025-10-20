/**
 * Script de diagnostic Pino Logger
 * Test des différentes configurations pour identifier les problèmes
 */

import pino from 'pino'

console.log('=== PINO LOGGER DIAGNOSTIC ===\n')

// Test 1: Configuration actuelle (JSON brut - sans transport)
console.log('📋 Test 1: Configuration actuelle (JSON brut)')
const logger1 = pino({
  level: 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
})

logger1.info({ context: 'test1' }, '✅ Info log - JSON brut')
logger1.debug({ context: 'test1' }, '🔍 Debug log - JSON brut')
logger1.error({ context: 'test1' }, '❌ Error log - JSON brut')

console.log('\n---\n')

// Test 2: Configuration avec transport pino-pretty (recommandé)
console.log('📋 Test 2: Configuration avec transport pino-pretty')
const logger2 = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    }
  }
})

logger2.info({ context: 'test2' }, '✅ Info log - Avec transport')
logger2.debug({ context: 'test2' }, '🔍 Debug log - Avec transport')
logger2.error({ context: 'test2' }, '❌ Error log - Avec transport')

console.log('\n---\n')

// Test 3: Configuration multi-stream (comme dans pino-test.config.ts)
console.log('📋 Test 3: Configuration multi-stream')
const logger3 = pino({
  level: 'debug',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{msg}'
        },
        level: 'debug'
      }
    ]
  }
})

logger3.info({ context: 'test3' }, '✅ Info log - Multi-stream')
logger3.debug({ context: 'test3' }, '🔍 Debug log - Multi-stream')
logger3.error({ context: 'test3' }, '❌ Error log - Multi-stream')

console.log('\n---\n')

// Test 4: Import du logger actuel de l'application
console.log('📋 Test 4: Logger actuel de l\'application')
import('./lib/logger').then((module) => {
  const { logger: appLogger } = module

  appLogger.info({ context: 'test4' }, '✅ Info log - App logger')
  appLogger.debug({ context: 'test4' }, '🔍 Debug log - App logger')
  appLogger.error({ context: 'test4' }, '❌ Error log - App logger')

  console.log('\n=== FIN DU DIAGNOSTIC ===')
  console.log('\n📊 Résumé:')
  console.log('- Test 1: JSON brut (actuel en dev)')
  console.log('- Test 2: Transport simple pino-pretty')
  console.log('- Test 3: Multi-stream (config tests E2E)')
  console.log('- Test 4: Logger application actuel')
  console.log('\n💡 Le transport recommandé est Test 2 ou Test 3 pour dev')
}).catch((error) => {
  console.error('❌ Erreur lors du chargement du logger:', error)
})
