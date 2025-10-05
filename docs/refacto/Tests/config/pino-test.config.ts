/**
 * Configuration Pino pour Tests E2E SEIDO
 * Extension de la configuration existante avec spécificités tests E2E
 */

import pino from 'pino'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { logger, logError } from '@/lib/logger'

// Ensure logs directory exists
const LOGS_DIR = process.env.PINO_TEST_DIR || path.resolve(__dirname, '../logs')
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true })
}

/**
 * Configuration Pino spécifique aux tests E2E
 */
export const E2E_PINO_CONFIG = {
  // Niveau de log adaptatif selon l'environnement
  level: process.env.PINO_LOG_LEVEL || (process.env.CI ? 'info' : 'debug'),

  // Timestamp ISO pour corrélation avec captures d'écran
  timestamp: pino.stdTimeFunctions.isoTime,

  // Note: formatters cannot be used with transport.targets
  // Custom formatting is handled in the transport options instead

  // Configuration des transports multiples
  transport: {
    targets: [
      // Console avec formatage pretty pour développement local
      ...(process.env.CI ? [] : [{
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{msg}'
        },
        level: 'debug'
      }]),

      // Fichier de log par exécution de test
      {
        target: 'pino/file',
        options: {
          destination: path.join(LOGS_DIR, 'test-runs', `e2e-${Date.now()}.log`),
          mkdir: true
        },
        level: 'debug'
      },

      // Logs structurés JSON pour analyse automatique
      {
        target: 'pino/file',
        options: {
          destination: path.join(LOGS_DIR, 'structured', `structured-${Date.now()}.json`),
          mkdir: true
        },
        level: 'info'
      },

      // Logs de performance séparés
      {
        target: 'pino/file',
        options: {
          destination: path.join(LOGS_DIR, 'performance', `performance-${Date.now()}.log`),
          mkdir: true
        },
        level: 'info'
      }
    ]
  },

  // Sérialisation personnalisée pour objets complexes
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,

    // Sérialisation des métriques de performance
    performance: (perf: any) => {
      if (!perf) return perf
      return {
        duration: perf.duration || 0,
        memory: perf.memory || {},
        network: perf.network || {},
        rendering: perf.rendering || {},
        timestamp: perf.timestamp || new Date().toISOString()
      }
    },

    // Sérialisation des captures d'écran
    screenshot: (screenshot: any) => {
      if (!screenshot) return screenshot
      return {
        path: screenshot.path || '',
        size: screenshot.size || 0,
        dimensions: screenshot.dimensions || { width: 0, height: 0 },
        timestamp: screenshot.timestamp || new Date().toISOString()
      }
    },

    // Sérialisation des erreurs E2E spécifiques
    testError: (error: any) => {
      if (!error) return error
      return {
        name: error.name || '',
        message: error.message || '',
        stack: error.stack || '',
        testStep: error.testStep || '',
        screenshotPath: error.screenshotPath || '',
        pageUrl: error.pageUrl || '',
        timestamp: error.timestamp || new Date().toISOString()
      }
    }
  }
}

/**
 * Factory pour créer un logger E2E avec contexte enrichi
 */
export function createE2ELogger(testName: string, userRole?: string): pino.Logger {
  const testId = `${testName}-${Date.now()}`

  const logger = pino({
    ...E2E_PINO_CONFIG,
    name: 'seido-e2e-tests'
  })

  // Créer un child logger avec contexte du test
  return logger.child({
    testId,
    testFile: testName,
    userRole: userRole || 'unknown',
    startTime: new Date().toISOString()
  })
}

/**
 * Utility pour logs de performance avec métriques enrichies
 */
export function logPerformanceMetrics(
  logger: pino.Logger,
  stepName: string,
  metrics: {
    duration: number
    memoryUsage?: NodeJS.MemoryUsage
    networkRequests?: number
    renderingTime?: number
  }
) {
  logger.info({
    step: stepName,
    performance: {
      duration: metrics.duration,
      memory: metrics.memoryUsage ? {
        rss: Math.round(metrics.memoryUsage.rss / 1024 / 1024), // MB
        heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(metrics.memoryUsage.external / 1024 / 1024) // MB
      } : undefined,
      network: {
        requests: metrics.networkRequests || 0
      },
      rendering: {
        time: metrics.renderingTime || 0
      },
      timestamp: new Date().toISOString()
    }
  }, `Performance metrics for step: ${stepName}`)
}

/**
 * Utility pour logs d'erreur avec contexte E2E enrichi
 */
export function logTestError(
  logger: pino.Logger,
  error: Error,
  context: {
    testStep: string
    pageUrl?: string
    screenshotPath?: string
  }
) {
  logger.error({
    testError: {
      ...error,
      testStep: context.testStep,
      pageUrl: context.pageUrl || '',
      screenshotPath: context.screenshotPath || '',
      timestamp: new Date().toISOString()
    }
  }, `Test error in step: ${context.testStep}`)
}

/**
 * Configuration pour intégration avec agent debugger
 */
export const DEBUGGER_INTEGRATION = {
  // Stream des logs vers l'agent debugger
  createDebuggerStream: () => {
    const debuggerDir = process.env.DEBUGGER_OUTPUT_DIR || path.join(LOGS_DIR, 'debugger-analysis')
    if (!existsSync(debuggerDir)) {
      mkdirSync(debuggerDir, { recursive: true })
    }

    return pino.destination({
      dest: path.join(debuggerDir, `debugger-input-${Date.now()}.json`),
      sync: false
    })
  },

  // Configuration pour alertes en temps réel
  alertThresholds: {
    errorCount: 3, // Alerter après 3 erreurs
    performanceThreshold: 5000, // Alerter si une étape > 5s
    memoryThreshold: 512 // Alerter si memory > 512MB
  }
}