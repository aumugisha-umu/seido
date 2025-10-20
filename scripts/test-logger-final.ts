/**
 * Test final du logger Pino configuré
 */

import { logger, authLogger, supabaseLogger, interventionLogger, logUserAction, logApiCall, logError, logSupabaseOperation } from '../lib/logger'

console.log('=== TEST FINAL DU LOGGER PINO ===\n')

// Test 1: Logger de base
console.log('📋 Test 1: Logger de base\n')
logger.info('✅ Message info standard')
logger.debug('🔍 Message debug pour développement')
logger.warn('⚠️ Message warning')
logger.error('❌ Message error')

console.log('\n---\n')

// Test 2: Loggers contextuels
console.log('📋 Test 2: Loggers contextuels\n')
authLogger.info('🔐 Authentification utilisateur réussie')
supabaseLogger.debug('🗄️ Requête Supabase exécutée')
interventionLogger.info('🛠️ Nouvelle intervention créée')

console.log('\n---\n')

// Test 3: Fonctions utilitaires
console.log('📋 Test 3: Fonctions utilitaires\n')
logUserAction('login', 'user-123', { ip: '192.168.1.1', browser: 'Chrome' })
logApiCall('POST', '/api/interventions', 201, 145)
logError(new Error('Test error'), 'test-context', { customField: 'value' })
logSupabaseOperation('insert', 'interventions', true, { rows: 1 })

console.log('\n---\n')

// Test 4: Logs avec objets complexes
console.log('📋 Test 4: Logs avec objets complexes\n')
logger.info({
  userId: 'user-456',
  action: 'create_intervention',
  intervention: {
    id: 'int-789',
    title: 'Réparation fuite',
    priority: 'high'
  },
  timestamp: new Date().toISOString()
}, '🎯 Intervention créée avec succès')

console.log('\n=== FIN DU TEST ===')
