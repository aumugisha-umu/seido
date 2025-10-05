// Test simple de la configuration Pino sans pino-pretty
const pino = require('pino')

console.log('🧪 Testing Pino configuration without pino-pretty...\n')

const logger = pino({
  level: 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
})

logger.info('✅ Logger initialized successfully')
logger.debug('🐛 Debug message')
logger.warn('⚠️ Warning message')
logger.error('❌ Error message')

logger.info({
  type: 'test',
  userId: '123',
  metadata: { foo: 'bar' }
}, '📊 Structured log with metadata')

console.log('\n✅ All tests passed - Pino works without pino-pretty!')
